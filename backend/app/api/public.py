from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile, Request, Query, Body, Response
from fastapi.responses import FileResponse
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.publication import (
    Publication,
    Submission,
    SubmissionVote,
    Comment,
    CommentMention,
    Category,
    ContentType,
    Event,
    Story,
    SocialScale,
    StaffProfile,
    StaffReaction,
)
from app.models.media import MediaAsset
from sqlalchemy import func
from jose import JWTError, jwt
from app.models.user import User
from app.api.auth import SECRET_KEY, ALGORITHM
from app.db.notifications import manager
from app.api.auth import get_current_user, get_current_contestant, verify_recaptcha_or_raise
from app.schemas.schemas import (
    EventOut,
    PublicationOut,
    SocialScaleOut,
    StaffProfileOut,
    StoryOut,
    SubmissionOut,
    SubmissionCreate,
    SubmissionCommentCreate,
    SubmissionCommentOut,
    PublicationCommentCreate,
    PublicationCommentOut,
    PublicProfileOut,
)
from typing import List, Optional
from pydantic import BaseModel
from pathlib import Path
import os
import uuid
import re
from app.schemas.schemas import PushTokenIn
from app.models.notification import PushSubscription, Notification

router = APIRouter()

UPLOAD_DIR = Path(os.getenv("SUBMISSION_UPLOAD_DIR", "/data/WebNgoaiKhoa/backend/uploads/submissions"))
MAX_UPLOAD_SIZE = int(os.getenv("SUBMISSION_MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))
IMAGE_UPLOAD_DIR = Path(os.getenv("IMAGE_UPLOAD_DIR", "/data/WebNgoaiKhoa/backend/uploads/images"))
IMAGE_MAX_UPLOAD_SIZE = int(os.getenv("IMAGE_MAX_UPLOAD_BYTES", str(12 * 1024 * 1024)))
TITLE_MIN_LENGTH = 6
CONTENT_MIN_LENGTH = 30
COMMENT_MIN_LENGTH = 2
COMMENT_MAX_LENGTH = 5000


class SubmissionIn(BaseModel):
    title: str
    content: str
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    recaptcha_token: Optional[str] = None


class VoteIn(BaseModel):
    recaptcha_token: Optional[str] = None


def _is_missing_submission_votes_error(exc: Exception) -> bool:
    error_message = str(exc).lower()
    return "submission_votes" in error_message or "no such table" in error_message or "doesn't exist" in error_message


def _ensure_submission_votes_table(db: Session) -> None:
    bind = db.get_bind()
    SubmissionVote.__table__.create(bind=bind, checkfirst=True)


def _is_missing_staff_reactions_error(exc: Exception) -> bool:
    error_message = str(exc).lower()
    return "staff_reactions" in error_message or "no such table" in error_message or "doesn't exist" in error_message


def _ensure_staff_reactions_table(db: Session) -> None:
    bind = db.get_bind()
    StaffReaction.__table__.create(bind=bind, checkfirst=True)


def _normalize_submission_payload(title: str, content: str, student_name: Optional[str]):
    normalized_title = (title or "").strip()
    normalized_content = (content or "").strip()
    normalized_student_name = (student_name or "").strip() or None

    if not normalized_title:
        raise HTTPException(status_code=400, detail="Vui lòng nhập tên tác phẩm")
    if len(normalized_title) < TITLE_MIN_LENGTH:
        raise HTTPException(status_code=400, detail=f"Tên tác phẩm cần tối thiểu {TITLE_MIN_LENGTH} ký tự")
    if len(normalized_title) > 255:
        raise HTTPException(status_code=400, detail="Tên tác phẩm vượt quá 255 ký tự")

    if not normalized_content:
        raise HTTPException(status_code=400, detail="Vui lòng nhập nội dung tác phẩm")
    if len(normalized_content) < CONTENT_MIN_LENGTH:
        raise HTTPException(status_code=400, detail=f"Nội dung cần tối thiểu {CONTENT_MIN_LENGTH} ký tự")

    return normalized_title, normalized_content, normalized_student_name


def _strip_html_tags(content: str) -> str:
    return re.sub(r"<[^>]*>", "", content or "")


def _validate_comment_content(content: str) -> str:
    normalized_content = (content or "").strip()
    if not normalized_content:
        raise HTTPException(status_code=400, detail="Nội dung bình luận không được để trống")

    if "<script" in normalized_content.lower():
        raise HTTPException(status_code=400, detail="Nội dung bình luận không hợp lệ")

    plain_text = _strip_html_tags(normalized_content)
    plain_text = re.sub(r"\s+", " ", plain_text).strip()

    if len(plain_text) < COMMENT_MIN_LENGTH:
        raise HTTPException(status_code=400, detail=f"Bình luận cần tối thiểu {COMMENT_MIN_LENGTH} ký tự")
    if len(normalized_content) > COMMENT_MAX_LENGTH:
        raise HTTPException(status_code=400, detail=f"Bình luận vượt quá {COMMENT_MAX_LENGTH} ký tự")

    return normalized_content


def _build_comment_out(item: Comment, db: Session) -> SubmissionCommentOut:
    author_name = None
    if item.user_id:
        user = db.query(User).filter(User.id == item.user_id).first()
        if user:
            author_name = user.full_name or user.email

    return SubmissionCommentOut(
        id=item.id,
        content=item.content,
        submission_id=item.submission_id,
        user_id=item.user_id,
        created_at=item.created_at,
        author_name=author_name,
    )


def _extract_mentions_from_html(content: str):
    """Extract user ids from CKEditor mention markup `data-mention='{"id":123,...}'`"""
    import json
    pattern = re.compile(r'data-mention=(?P<q>["\'])(?P<json>.*?)(?P=q)')
    ids = set()
    for m in pattern.finditer(content or ""):
        try:
            data = json.loads(m.group("json"))
            uid = data.get("id") or data.get("user") or data.get("user_id")
            if isinstance(uid, int):
                ids.add(uid)
        except Exception:
            continue
    return list(ids)


def _build_publication_comment_out(item: Comment, db: Session) -> PublicationCommentOut:
    author_name = None
    if item.user_id:
        user = db.query(User).filter(User.id == item.user_id).first()
        if user:
            author_name = user.full_name or user.email

    mentions = [m.user_id for m in db.query(CommentMention).filter(CommentMention.comment_id == item.id).all()]

    return PublicationCommentOut(
        id=item.id,
        content=item.content,
        publication_id=item.publication_id,
        user_id=item.user_id,
        created_at=item.created_at,
        author_name=author_name,
        mentions=mentions,
    )

# --- Public Endpoints ---

@router.get("/publications", response_model=List[PublicationOut])
async def get_public_publications(
    category: Optional[str] = None,
    subject: Optional[str] = None,
    content_type: Optional[str] = None,
    featured_year: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Publication)

    # Accept `category` query param as legacy; filter by canonical `subject` column only.
    resolved_subject = subject or category
    if resolved_subject:
        query = query.filter(Publication.subject == resolved_subject)

    if content_type:
        query = query.filter(Publication.content_type == content_type)

    if featured_year:
        query = query.filter(Publication.featured_year == featured_year)

    return query.order_by(Publication.created_at.desc()).all()


@router.get("/publications/{pub_id}", response_model=PublicationOut)
async def get_public_publication_by_id(pub_id: int, db: Session = Depends(get_db)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    return pub


@router.get("/categories", response_model=List[str])
async def get_public_categories():
    return [c.value for c in Category]


@router.get("/subjects", response_model=List[str])
async def get_public_subjects():
    return [c.value for c in Category if c != Category.NGOAI_KHOA]


@router.get("/content-types", response_model=List[str])
async def get_public_content_types():
    return [c.value for c in ContentType]


@router.get("/events/upcoming", response_model=List[EventOut])
async def get_upcoming_events(db: Session = Depends(get_db)):
    return (
        db.query(Event)
        .filter(Event.is_active == True)
        .order_by(Event.event_date.asc())
        .all()
    )


@router.get("/stories/inspiring", response_model=List[StoryOut])
async def get_inspiring_stories(db: Session = Depends(get_db)):
    return (
        db.query(Story)
        .filter(Story.is_published == True)
        .order_by(Story.created_at.desc())
        .all()
    )


@router.get("/stories/inspiring/{story_id}", response_model=StoryOut)
async def get_inspiring_story_by_id(story_id: int, db: Session = Depends(get_db)):
    story = (
        db.query(Story)
        .filter(Story.id == story_id, Story.is_published == True)
        .first()
    )
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.get("/doingu/scale", response_model=SocialScaleOut)
async def get_social_scale(db: Session = Depends(get_db)):
    item = (
        db.query(SocialScale)
        .filter(SocialScale.is_active == True)
        .order_by(SocialScale.updated_at.desc(), SocialScale.id.desc())
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Social scale data not found")
    return item


@router.get("/doingu/staff", response_model=List[StaffProfileOut])
async def get_staff_profiles(db: Session = Depends(get_db), response: Response = None):
    """Return active staff profiles augmented with image metadata when available.

    Adds lightweight caching headers to reduce repeated load on clients.
    """
    rows = (
        db.query(StaffProfile)
        .filter(StaffProfile.is_active == True)
        .order_by(StaffProfile.display_order.asc(), StaffProfile.created_at.desc())
        .all()
    )

    # Add Cache-Control header (short TTL, adjust as needed)
    try:
        if response is not None:
            response.headers["Cache-Control"] = "public, max-age=60"
    except Exception:
        pass

    out = []
    for s in rows:
        image_asset_id = None
        image_width = None
        image_height = None
        image_blur = None
        try:
            if s.image_url:
                safe_name = Path(s.image_url).name
                if safe_name:
                    asset = db.query(MediaAsset).filter(MediaAsset.stored_name == safe_name).first()
                    if asset:
                        image_asset_id = asset.id
                        image_width = asset.width
                        image_height = asset.height
                        if asset.metadata_json and isinstance(asset.metadata_json, dict):
                            image_blur = asset.metadata_json.get("blur_placeholder")
        except Exception:
            # Non-fatal: continue without metadata on errors
            pass

        out.append({
            "id": s.id,
            "full_name": s.full_name,
            "title": s.title,
            "bio": s.bio,
            "email": s.email,
            "image_url": s.image_url,
            "expertise": s.expertise,
            "tier": s.tier,
            "display_order": s.display_order,
            "is_active": s.is_active,
            "created_at": s.created_at,
            "image_asset_id": image_asset_id,
            "image_width": image_width,
            "image_height": image_height,
            "image_blur_placeholder": image_blur,
        })

    return out


@router.get("/doingu/staff/reactions")
async def get_staff_reactions_bulk(ids: str = Query(..., description="Comma-separated staff ids"), db: Session = Depends(get_db), request: Request = None):
    """Return whether the current user has reacted for each staff id.

    Public response DOES NOT include aggregate counts. Instead returns a mapping:
    { <staff_id>: { "reacted": bool, "reaction_type": Optional[str] }, ... }
    If an Authorization Bearer token is provided and valid, the endpoint will
    indicate whether that user has reacted for each staff id. Otherwise all
    items will indicate `reacted: false`.
    """
    _ensure_staff_reactions_table(db)

    # Optional user detection from Authorization header (do not raise if missing/invalid)
    user = None
    auth_header = None
    if request is not None:
        auth_header = request.headers.get('authorization') or request.headers.get('Authorization')
    if auth_header and isinstance(auth_header, str) and auth_header.lower().startswith('bearer '):
        token = auth_header.split(' ', 1)[1].strip()
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get('sub')
            if email:
                user = db.query(User).filter(User.email == email).first()
        except JWTError:
            user = None

    try:
        id_list = [int(x) for x in ids.split(",") if x.strip()]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ids parameter")

    # Default: no reaction by current user
    result = {sid: {"reacted": False, "reaction_type": None} for sid in id_list}

    if not user:
        return result

    try:
        rows = (
            db.query(StaffReaction.staff_id, StaffReaction.reaction_type)
            .filter(StaffReaction.staff_id.in_(id_list), StaffReaction.user_id == user.id)
            .all()
        )
    except (OperationalError, ProgrammingError) as exc:
        if not _is_missing_staff_reactions_error(exc):
            raise
        _ensure_staff_reactions_table(db)
        rows = (
            db.query(StaffReaction.staff_id, StaffReaction.reaction_type)
            .filter(StaffReaction.staff_id.in_(id_list), StaffReaction.user_id == user.id)
            .all()
        )

    for staff_id, reaction_type in rows:
        result[staff_id] = {"reacted": True, "reaction_type": reaction_type}

    return result


@router.post("/doingu/staff/{staff_id}/react")
async def post_staff_reaction(
    staff_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    _ensure_staff_reactions_table(db)
    reaction_type = (payload.get("reaction_type") or "").strip()
    if not reaction_type:
        raise HTTPException(status_code=400, detail="reaction_type required")

    staff = db.query(StaffProfile).filter(StaffProfile.id == staff_id, StaffProfile.is_active == True).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    # Prefer a simple toggle/update behavior for reactions:
    # - If the user has not reacted, create a new reaction (reacted: True)
    # - If the user reacted with the same type, remove the reaction (reacted: False)
    # - If the user reacted with a different type, update to the new type (reacted: True)

    try:
        existing = (
            db.query(StaffReaction)
            .filter(StaffReaction.staff_id == staff_id, StaffReaction.user_id == user.id)
            .first()
        )
    except (OperationalError, ProgrammingError) as exc:
        if not _is_missing_staff_reactions_error(exc):
            raise
        _ensure_staff_reactions_table(db)
        existing = None

    # If no existing reaction, insert one
    if not existing:
        try:
            sr = StaffReaction(staff_id=staff_id, user_id=user.id, reaction_type=reaction_type)
            db.add(sr)
            db.commit()
            return {"reacted": True, "reaction_type": reaction_type}
        except IntegrityError:
            db.rollback()
            # race: fetch existing and fall through to update/toggle handling
            existing = (
                db.query(StaffReaction)
                .filter(StaffReaction.staff_id == staff_id, StaffReaction.user_id == user.id)
                .first()
            )
        except (OperationalError, ProgrammingError) as exc:
            if not _is_missing_staff_reactions_error(exc):
                raise
            _ensure_staff_reactions_table(db)
            try:
                sr = StaffReaction(staff_id=staff_id, user_id=user.id, reaction_type=reaction_type)
                db.add(sr)
                db.commit()
                return {"reacted": True, "reaction_type": reaction_type}
            except IntegrityError:
                db.rollback()
                existing = (
                    db.query(StaffReaction)
                    .filter(StaffReaction.staff_id == staff_id, StaffReaction.user_id == user.id)
                    .first()
                )

    # At this point `existing` should be present
    if existing:
        # If same type -> remove (toggle off)
        if existing.reaction_type == reaction_type:
            try:
                db.delete(existing)
                db.commit()
                return {"reacted": False, "reaction_type": None}
            except Exception:
                db.rollback()
                raise HTTPException(status_code=500, detail="Failed to remove reaction")

        # Different type -> update
        try:
            existing.reaction_type = reaction_type
            db.commit()
            return {"reacted": True, "reaction_type": reaction_type}
        except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to update reaction")


@router.get("/users/{user_id}", response_model=PublicProfileOut)
async def get_public_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only include approved submissions authored by this user's email
    submissions = (
        db.query(Submission)
        .filter(Submission.student_email == user.email, Submission.status == "approved")
        .order_by(Submission.created_at.desc())
        .all()
    )

    return {"user": user, "submissions": submissions}


@router.post('/users/{user_id}/follow')
async def follow_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_contestant)):
    # Lightweight follow endpoint (frontend-friendly stub).
    # For now this does not persist followers; it validates target exists and returns success.
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "ok", "following": True}

@router.get("/submissions", response_model=List[SubmissionOut])
async def get_public_submissions(db: Session = Depends(get_db)):
    # Only show approved submissions to the public
    return db.query(Submission).filter(Submission.status == "approved").order_by(Submission.created_at.desc()).all()


@router.get("/submissions/votes/me", response_model=List[int])
async def get_my_voted_submission_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    try:
        rows = db.query(SubmissionVote.submission_id).filter(SubmissionVote.user_id == current_user.id).all()
        return [row[0] for row in rows]
    except (OperationalError, ProgrammingError) as exc:
        if _is_missing_submission_votes_error(exc):
            _ensure_submission_votes_table(db)
            rows = db.query(SubmissionVote.submission_id).filter(SubmissionVote.user_id == current_user.id).all()
            return [row[0] for row in rows]
        raise

@router.post("/submissions", response_model=SubmissionOut)
async def create_public_submission(
    sub: SubmissionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    verify_recaptcha_or_raise(sub.recaptcha_token, action="submission_create")
    normalized_title, normalized_content, normalized_student_name = _normalize_submission_payload(
        sub.title,
        sub.content,
        sub.student_name,
    )

    new_sub = Submission(
        title=normalized_title,
        content=normalized_content,
        student_name=current_user.full_name or normalized_student_name,
        student_email=current_user.email,
        status="pending",
        votes=0,
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    
    # Notify admins about new submission via WebSocket
    await manager.broadcast({
        "type": "new_submission",
        "title": f"Bài mới: {new_sub.title}",
        "message": f"Sinh viên {new_sub.student_name} vừa gửi một bài dự thi mới.",
        "id": new_sub.id
    })
    # Persist notifications for admin users
    try:
        admin_users = db.query(User).filter(User.role.in_(["admin", "website_manager", "submission_judge"]) ).all()
        for u in admin_users:
            n = Notification(user_id=u.id, title=f"Bài mới: {new_sub.title}", body=f"Sinh viên {new_sub.student_name} vừa gửi một bài dự thi mới.", url=f"/submissions/{new_sub.id}")
            db.add(n)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
    
    return new_sub


@router.post("/submissions/upload", response_model=SubmissionOut)
async def create_submission_with_pdf(
    title: str = Form(...),
    content: str = Form(...),
    student_name: Optional[str] = Form(None),
    recaptcha_token: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    verify_recaptcha_or_raise(recaptcha_token, action="submission_create")
    normalized_title, normalized_content, normalized_student_name = _normalize_submission_payload(
        title,
        content,
        student_name,
    )

    attachment_url = None
    if file and file.filename:
        filename_lower = file.filename.lower()
        if not filename_lower.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file PDF")

        payload = await file.read()
        if not payload:
            raise HTTPException(status_code=400, detail="Tệp PDF rỗng")
        if len(payload) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail="File PDF vượt quá dung lượng cho phép")

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid.uuid4().hex}.pdf"
        target = UPLOAD_DIR / stored_name
        target.write_bytes(payload)
        attachment_url = f"/api/public/submissions/files/{stored_name}"

    new_sub = Submission(
        title=normalized_title,
        content=normalized_content,
        attachment_url=attachment_url,
        student_name=current_user.full_name or normalized_student_name,
        student_email=current_user.email,
        status="pending",
        votes=0,
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    await manager.broadcast({
        "type": "new_submission",
        "title": f"Bài mới: {new_sub.title}",
        "message": f"Sinh viên {new_sub.student_name} vừa gửi một bài dự thi mới.",
        "id": new_sub.id
    })
    try:
        admin_users = db.query(User).filter(User.role.in_(["admin", "website_manager", "submission_judge"]) ).all()
        for u in admin_users:
            n = Notification(user_id=u.id, title=f"Bài mới: {new_sub.title}", body=f"Sinh viên {new_sub.student_name} vừa gửi một bài dự thi mới.", url=f"/submissions/{new_sub.id}")
            db.add(n)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    return new_sub


@router.get("/submissions/files/{filename}")
async def get_submission_file(filename: str):
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    safe_name = Path(filename).name
    target = UPLOAD_DIR / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path=str(target), media_type="application/pdf", filename=safe_name)


@router.get("/uploads/images/{filename}")
async def get_uploaded_image(filename: str, request: Request):
    # Only allow common image types
    allowed_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"}
    safe_name = Path(filename).name
    if not any(safe_name.lower().endswith(ext) for ext in allowed_exts):
        raise HTTPException(status_code=400, detail="Invalid file type")

    target = IMAGE_UPLOAD_DIR / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Basic hotlink protection: if Referer/Origin header present and not in allowed origins, deny.
    referer = request.headers.get("referer") or request.headers.get("origin")
    if referer:
        from urllib.parse import urlparse
        try:
            ref_host = urlparse(referer).netloc.split(":")[0]
        except Exception:
            ref_host = None

        allowed_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
        allowed_hosts = [urlparse(o).netloc.split(":")[0] if "//" in o else o for o in allowed_origins_env.split(",") if o.strip()]
        trusted_hosts_env = os.getenv("TRUSTED_HOSTS", "")
        for t in [item.strip() for item in trusted_hosts_env.split(",") if item.strip()]:
            allowed_hosts.append(t)

        if ref_host and ref_host not in allowed_hosts:
            raise HTTPException(status_code=403, detail="Access denied")

    import mimetypes
    mime_type, _ = mimetypes.guess_type(str(target))
    headers = {"Cache-Control": "public, max-age=86400"}
    return FileResponse(path=str(target), media_type=mime_type or "application/octet-stream", headers=headers)


@router.post("/submissions/contestant", response_model=SubmissionOut)
async def create_contestant_submission(
    sub: SubmissionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    verify_recaptcha_or_raise(sub.recaptcha_token, action="submission_create")
    normalized_title, normalized_content, normalized_student_name = _normalize_submission_payload(
        sub.title,
        sub.content,
        sub.student_name,
    )

    new_sub = Submission(
        title=normalized_title,
        content=normalized_content,
        student_name=current_user.full_name or normalized_student_name,
        student_email=current_user.email,
        status="pending",
        votes=0,
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    await manager.broadcast({
        "type": "new_submission",
        "title": f"Bài mới: {new_sub.title}",
        "message": f"Thí sinh {new_sub.student_name or current_user.email} vừa gửi bài dự thi.",
        "id": new_sub.id
    })

    try:
        admin_users = db.query(User).filter(User.role.in_(["admin", "website_manager", "submission_judge"]) ).all()
        for u in admin_users:
            n = Notification(user_id=u.id, title=f"Bài mới: {new_sub.title}", body=f"Thí sinh {new_sub.student_name or current_user.email} vừa gửi bài dự thi.", url=f"/submissions/{new_sub.id}")
            db.add(n)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
    return new_sub


@router.post("/push/subscribe")
async def public_push_subscribe(payload: PushTokenIn, db: Session = Depends(get_db)):
    token = (payload.token or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")

    # idempotent insert
    existing = db.query(PushSubscription).filter(PushSubscription.token == token).first()
    if existing:
        return {"message": "already_registered", "registered": True}

    sub = PushSubscription(user_id=None, token=token)
    db.add(sub)
    db.commit()
    return {"message": "registered", "registered": True}


@router.get('/push/vapid')
async def get_vapid():
    # Return VAPID public key for client; optional env variable FCM_VAPID_PUBLIC_KEY
    import os
    key = os.getenv('FCM_VAPID_PUBLIC_KEY') or os.getenv('VITE_FIREBASE_VAPID_KEY')
    return {"vapid_key": key}


@router.get("/submissions/me", response_model=List[SubmissionOut])
async def get_my_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    return (
        db.query(Submission)
        .filter(Submission.student_email == current_user.email)
        .order_by(Submission.created_at.desc())
        .all()
    )

@router.post("/submissions/{sub_id}/vote")
async def vote_submission(
    sub_id: int,
    payload: VoteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    verify_recaptcha_or_raise(payload.recaptcha_token, action="submission_vote")

    submission = db.query(Submission).filter(Submission.id == sub_id, Submission.status == "approved").first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found or not approved")

    _ensure_submission_votes_table(db)

    try:
        existing_vote = (
            db.query(SubmissionVote)
            .filter(SubmissionVote.submission_id == sub_id, SubmissionVote.user_id == current_user.id)
            .first()
        )
    except (OperationalError, ProgrammingError) as exc:
        if not _is_missing_submission_votes_error(exc):
            raise
        _ensure_submission_votes_table(db)
        existing_vote = (
            db.query(SubmissionVote)
            .filter(SubmissionVote.submission_id == sub_id, SubmissionVote.user_id == current_user.id)
            .first()
        )
    if existing_vote:
        raise HTTPException(status_code=409, detail="Bạn đã bình chọn cho bài thi này rồi")

    vote = SubmissionVote(submission_id=sub_id, user_id=current_user.id)
    submission.votes = (submission.votes or 0) + 1
    db.add(vote)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        latest_submission = db.query(Submission).filter(Submission.id == sub_id).first()
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Bạn đã bình chọn cho bài thi này rồi",
                "votes": latest_submission.votes if latest_submission else None,
            },
        )

    db.refresh(submission)
    return {"message": "Vote recorded", "votes": submission.votes, "submission_id": submission.id}


@router.get("/submissions/{sub_id}/comments", response_model=List[SubmissionCommentOut])
async def get_submission_comments(sub_id: int, db: Session = Depends(get_db)):
    submission = db.query(Submission).filter(Submission.id == sub_id, Submission.status == "approved").first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found or not approved")

    comments = (
        db.query(Comment)
        .filter(Comment.submission_id == sub_id)
        .order_by(Comment.created_at.desc())
        .all()
    )
    return [_build_comment_out(item, db) for item in comments]


@router.post("/submissions/{sub_id}/comments", response_model=SubmissionCommentOut)
async def create_submission_comment(
    sub_id: int,
    payload: SubmissionCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    verify_recaptcha_or_raise(payload.recaptcha_token, action="submission_comment")

    submission = db.query(Submission).filter(Submission.id == sub_id, Submission.status == "approved").first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found or not approved")

    normalized_content = _validate_comment_content(payload.content)
    comment = Comment(
        content=normalized_content,
        user_id=current_user.id,
        submission_id=sub_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _build_comment_out(comment, db)


@router.get("/publications/{pub_id}/comments", response_model=List[PublicationCommentOut])
async def get_publication_comments(pub_id: int, db: Session = Depends(get_db)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    comments = (
        db.query(Comment)
        .filter(Comment.publication_id == pub_id, Comment.is_visible == True)
        .order_by(Comment.created_at.desc())
        .all()
    )
    return [_build_publication_comment_out(item, db) for item in comments]


@router.post("/publications/{pub_id}/comments", response_model=PublicationCommentOut)
async def create_publication_comment(
    pub_id: int,
    payload: PublicationCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    verify_recaptcha_or_raise(payload.recaptcha_token, action="publication_comment")

    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    if not getattr(pub, 'comments_enabled', True):
        raise HTTPException(status_code=403, detail="Comments are disabled for this publication")

    normalized_content = _validate_comment_content(payload.content)
    comment = Comment(
        content=normalized_content,
        user_id=current_user.id,
        publication_id=pub_id,
        parent_id=getattr(payload, 'parent_id', None),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Handle mentions: create CommentMention rows and notifications
    mention_ids = _extract_mentions_from_html(normalized_content)
    for uid in mention_ids:
        try:
            if uid == current_user.id:
                continue
            target = db.query(User).filter(User.id == uid, User.is_active == True).first()
            if not target:
                continue
            # add mention row
            cm = CommentMention(comment_id=comment.id, user_id=uid)
            db.add(cm)
            # create notification
            n = Notification(
                user_id=uid,
                title=f"{current_user.full_name or current_user.email} đã nhắc tới bạn trong bình luận",
                body=f"Bình luận mới trên bài: {pub.title}",
                url=f"/posts/{pub.id}#comment-{comment.id}",
            )
            db.add(n)
        except Exception:
            db.rollback()
            continue
    try:
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    # Broadcast a lightweight event for frontends (best-effort)
    try:
        await manager.broadcast({
            "type": "new_publication_comment",
            "publication_id": pub.id,
            "comment_id": comment.id,
            "message": f"New comment on {pub.title}",
        })
    except Exception:
        pass

    return _build_publication_comment_out(comment, db)


@router.get("/users/mentions", response_model=List[PublicProfileOut])
async def mention_user_search(q: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Return a lightweight list of users for mention autocomplete. Require auth.
    query = db.query(User).filter(User.is_active == True)
    if q:
        like = f"%{q}%"
        try:
            query = query.filter((User.full_name != None) & ((User.full_name.ilike(like)) | (User.email.ilike(like))))
        except Exception:
            # Fallback: simple contains on name/email
            query = query.filter((User.full_name != None) & ((User.full_name.like(like)) | (User.email.like(like))))

    results = query.order_by(User.full_name.asc()).limit(12).all()
    # Map to minimal shape: reuse PublicProfileOut.user or build simple objects
    out = []
    for u in results:
        out.append({
            "user": {
                "id": u.id,
                "email": u.email,
                "role": u.role,
                "full_name": u.full_name,
                "image_url": getattr(u, 'image_url', None),
                "email_verified": u.email_verified,
                "is_subscribed": u.is_subscribed,
            },
            "submissions": [],
        })
    return out
