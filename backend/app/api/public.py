from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.publication import Publication, Submission, SubmissionVote, Comment, Category, ContentType, Event, Story, SocialScale, StaffProfile
from app.models.user import User
from app.db.notifications import manager
from app.api.auth import get_current_contestant, verify_recaptcha_or_raise
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
)
from typing import List, Optional
from pydantic import BaseModel
from pathlib import Path
import os
import uuid
import re

router = APIRouter()

UPLOAD_DIR = Path(os.getenv("SUBMISSION_UPLOAD_DIR", "/data/WebNgoaiKhoa/backend/uploads/submissions"))
MAX_UPLOAD_SIZE = int(os.getenv("SUBMISSION_MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))
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

    resolved_subject = subject or category
    if resolved_subject:
        query = query.filter(
            (Publication.subject == resolved_subject) | (Publication.category == resolved_subject)
        )

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
async def get_staff_profiles(db: Session = Depends(get_db)):
    return (
        db.query(StaffProfile)
        .filter(StaffProfile.is_active == True)
        .order_by(StaffProfile.display_order.asc(), StaffProfile.created_at.desc())
        .all()
    )

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

    return new_sub


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
