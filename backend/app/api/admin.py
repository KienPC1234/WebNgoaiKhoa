from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from pathlib import Path
import os
import uuid
from app.db.session import get_db
from app.models.user import User
from app.models.publication import ContentType, Event, Publication, SocialScale, StaffProfile, Story, Submission
from app.api.auth import (
    build_unsubscribe_token,
    get_current_admin,
    get_current_website_manager,
    get_current_submission_judge,
)
from app.api import ai as ai_module
from app.db.notifications import manager
from app.services import newsletter as newsletter_service
from app.schemas.schemas import (
    EventCreate,
    EventOut,
    SocialScaleCreate,
    SocialScaleOut,
    StaffProfileCreate,
    StaffProfileOut,
    StoryCreate,
    StoryOut,
    UserOut, UserUpdate, 
    PublicationOut, PublicationCreate, 
    SubmissionOut, DashboardStats, SubmissionStatusUpdate,
    AdminOverview,
    AdminActivityItem,
    AIKnowledgeAssetOut,
    AIKnowledgeUploadOut,
    NewsletterDispatchIn,
    NewsletterDispatchOut,
)
from typing import List, Optional

router = APIRouter()

PUBLICATION_UPLOAD_DIR = Path(os.getenv("PUBLICATION_UPLOAD_DIR", "/data/WebNgoaiKhoa/backend/uploads/publications"))
PUBLICATION_MAX_UPLOAD_SIZE = int(os.getenv("PUBLICATION_MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))
ALLOWED_SUBJECTS = {item.value for item in ai_module.Category} if hasattr(ai_module, "Category") else {"van", "ktpl", "lich-su", "dia-li", "vovinam", "ngoaikhoa"}


def _sync_ai_knowledge_if_possible(db: Session):
    try:
        ai_module._sync_knowledge_base(db)
    except Exception:
        # Avoid blocking admin CRUD if vector sync fails temporarily.
        pass


def _collect_recent_activity(db: Session, limit: int = 10) -> List[AdminActivityItem]:
    items: List[AdminActivityItem] = []

    publications = db.query(Publication).order_by(Publication.created_at.desc()).limit(limit).all()
    stories = db.query(Story).order_by(Story.created_at.desc()).limit(limit).all()
    submissions = db.query(Submission).order_by(Submission.created_at.desc()).limit(limit).all()
    events = db.query(Event).order_by(Event.created_at.desc()).limit(limit).all()

    for pub in publications:
        if pub.created_at is None:
            continue
        items.append(AdminActivityItem(type="publication", title=pub.title, created_at=pub.created_at))

    for story in stories:
        if story.created_at is None:
            continue
        items.append(AdminActivityItem(type="story", title=story.title, created_at=story.created_at))

    for event in events:
        if event.created_at is None:
            continue
        items.append(AdminActivityItem(type="event", title=event.title, status=event.status, created_at=event.created_at))

    for sub in submissions:
        if sub.created_at is None:
            continue
        items.append(AdminActivityItem(type="submission", title=sub.title, status=sub.status, created_at=sub.created_at))

    items.sort(key=lambda x: x.created_at, reverse=True)
    return items[:limit]


def normalize_publication_payload(pub: PublicationCreate) -> dict:
    payload = pub.model_dump()
    subject = payload.get("subject") or payload.get("category") or "van"
    content_type = payload.get("content_type") or ContentType.AN_PHAM.value

    payload["subject"] = subject
    payload["category"] = subject  # Keep legacy clients compatible
    payload["content_type"] = content_type
    return payload


def _build_newsletter_recipients(db: Session, actor_id: int) -> List[dict]:
    users = (
        db.query(User)
        .filter(User.is_active == True)
        .filter(User.email_verified == True)
        .filter(User.is_subscribed == True)
        .filter(User.id != actor_id)
        .all()
    )

    recipients: List[dict] = []
    for user in users:
        recipients.append(
            {
                "email": user.email,
                "unsubscribe_token": build_unsubscribe_token(user.email),
            }
        )
    return recipients


def _queue_newsletter(
    background_tasks: BackgroundTasks,
    recipients: List[dict],
    title: str,
    body: str,
    action_url: Optional[str] = None,
    send_email: bool = True,
    send_webpush: bool = True,
) -> None:
    if not recipients or (not send_email and not send_webpush):
        return

    background_tasks.add_task(
        newsletter_service.dispatch_newsletter_bulk,
        recipients,
        title,
        body,
        action_url,
        send_email,
        send_webpush,
    )

# --- User Management ---

@router.get("/users", response_model=List[UserOut])
async def get_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(User).all()

@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changes = user_update.model_dump(exclude_unset=True)
    requested_role = changes.get("role")
    if requested_role is not None:
        # Prevent one admin from changing privileges of another admin account.
        if user.role == "admin" and user.id != admin.id:
            raise HTTPException(status_code=403, detail="Không thể thay đổi quyền của tài khoản admin khác")

        # Only allow super admin to assign privileged admin-panel roles.
        if requested_role in {"admin", "website_manager", "submission_judge", "teacher", "student"}:
            pass
        else:
            raise HTTPException(status_code=400, detail="Invalid role")
    
    for key, value in changes.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete current admin account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": "User deleted", "id": user_id}

# --- Publication Management ---

@router.get("/publications", response_model=List[PublicationOut])
async def get_publications(
        subject: Optional[str] = Query(None),
        content_type: Optional[str] = Query(None),
        q: Optional[str] = Query(None),
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_website_manager),
):
        query = db.query(Publication)

        if subject:
            if subject not in ALLOWED_SUBJECTS:
                    raise HTTPException(status_code=400, detail="Invalid subject")
            query = query.filter(Publication.subject == subject)

        if content_type:
            valid_content_types = {item.value for item in ContentType}
            if content_type not in valid_content_types:
                    raise HTTPException(status_code=400, detail="Invalid content type")
            query = query.filter(Publication.content_type == content_type)

        if q:
            keyword = f"%{q.strip()}%"
            query = query.filter((Publication.title.ilike(keyword)) | (Publication.content.ilike(keyword)))

        return query.order_by(Publication.created_at.desc()).all()


@router.get("/publications/{pub_id}", response_model=PublicationOut)
async def get_publication_by_id(pub_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    return pub

@router.post("/publications", response_model=PublicationOut)
async def create_publication(
    pub: PublicationCreate,
    background_tasks: BackgroundTasks,
    send_email: bool = Query(True),
    send_webpush: bool = Query(True),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_website_manager),
):
    payload = normalize_publication_payload(pub)
    new_pub = Publication(**payload, author_id=admin.id)
    db.add(new_pub)
    db.commit()
    db.refresh(new_pub)

    recipients = _build_newsletter_recipients(db, admin.id)
    _queue_newsletter(
        background_tasks,
        recipients,
        title=f"[To xa hoi] Moi: {new_pub.title}",
        body="Da co an pham/tai lieu moi tren he thong. Hay truy cap de xem chi tiet.",
        action_url=f"/public-posts/{new_pub.id}",
        send_email=send_email,
        send_webpush=send_webpush,
    )

    _sync_ai_knowledge_if_possible(db)

    return new_pub

@router.put("/publications/{pub_id}", response_model=PublicationOut)
async def update_publication(pub_id: int, pub_update: PublicationCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    payload = normalize_publication_payload(pub_update)
    for key, value in payload.items():
        setattr(pub, key, value)
    
    db.commit()
    db.refresh(pub)
    _sync_ai_knowledge_if_possible(db)
    return pub

@router.delete("/publications/{pub_id}")
async def delete_publication(pub_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    db.delete(pub)
    db.commit()
    _sync_ai_knowledge_if_possible(db)
    return {"message": "Publication deleted"}


@router.post("/publications/upload-pdf")
async def upload_publication_pdf(file: UploadFile = File(...), admin: User = Depends(get_current_website_manager)):
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file PDF")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="File PDF rỗng")
    if len(payload) > PUBLICATION_MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File PDF vượt quá dung lượng cho phép")

    PUBLICATION_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}.pdf"
    target = PUBLICATION_UPLOAD_DIR / stored_name
    target.write_bytes(payload)

    return {
        "url": f"/api/admin/publications/files/{stored_name}",
        "file_name": filename,
        "size_bytes": len(payload),
    }


@router.get("/publications/files/{filename}")
async def get_publication_pdf_file(filename: str):
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    safe_name = Path(filename).name
    target = PUBLICATION_UPLOAD_DIR / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path=str(target), media_type="application/pdf", filename=safe_name)


# --- Event Management ---

@router.get("/events", response_model=List[EventOut])
async def get_events(db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    return db.query(Event).order_by(Event.event_date.asc()).all()


@router.get("/events/upcoming", response_model=List[EventOut])
async def get_upcoming_events_for_admin(db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    now = datetime.now(timezone.utc)
    return (
        db.query(Event)
        .filter(Event.is_active == True)
        .filter((Event.event_date >= now) | (Event.status.in_(["upcoming", "registration"])))
        .order_by(Event.event_date.asc())
        .all()
    )


@router.get("/events/{event_id}", response_model=EventOut)
async def get_event(event_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.post("/events", response_model=EventOut)
async def create_event(
    payload: EventCreate,
    background_tasks: BackgroundTasks,
    send_email: bool = Query(True),
    send_webpush: bool = Query(True),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_website_manager),
):
    if payload.linked_post_id is not None:
        linked_post = db.query(Publication).filter(Publication.id == payload.linked_post_id).first()
        if not linked_post:
            raise HTTPException(status_code=400, detail="Linked publication not found")

    event = Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)

    recipients = _build_newsletter_recipients(db, admin.id)
    _queue_newsletter(
        background_tasks,
        recipients,
        title=f"[To xa hoi] Su kien moi: {event.title}",
        body="He thong vua cap nhat mot su kien moi. Ban co the xem lich va tham gia dang ky.",
        action_url="/events/upcoming",
        send_email=send_email,
        send_webpush=send_webpush,
    )

    _sync_ai_knowledge_if_possible(db)

    return event


@router.put("/events/{event_id}", response_model=EventOut)
async def update_event(event_id: int, payload: EventCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if payload.linked_post_id is not None:
        linked_post = db.query(Publication).filter(Publication.id == payload.linked_post_id).first()
        if not linked_post:
            raise HTTPException(status_code=400, detail="Linked publication not found")

    for key, value in payload.model_dump().items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)
    _sync_ai_knowledge_if_possible(db)
    return event


@router.delete("/events/{event_id}")
async def delete_event(event_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    _sync_ai_knowledge_if_possible(db)
    return {"message": "Event deleted"}


# --- Story Management ---

@router.get("/stories", response_model=List[StoryOut])
async def get_stories(db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    return db.query(Story).order_by(Story.created_at.desc()).all()


@router.get("/stories/{story_id}", response_model=StoryOut)
async def get_story_by_id(story_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.post("/stories", response_model=StoryOut)
async def create_story(
    payload: StoryCreate,
    background_tasks: BackgroundTasks,
    send_email: bool = Query(True),
    send_webpush: bool = Query(True),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_website_manager),
):
    story = Story(**payload.model_dump())
    db.add(story)
    db.commit()
    db.refresh(story)

    recipients = _build_newsletter_recipients(db, admin.id)
    _queue_newsletter(
        background_tasks,
        recipients,
        title=f"[To xa hoi] Cau chuyen moi: {story.title}",
        body="Muc truyen cam hung vua co noi dung moi. Mo he thong de doc ngay.",
        action_url=f"/stories/inspiring/{story.id}",
        send_email=send_email,
        send_webpush=send_webpush,
    )

    _sync_ai_knowledge_if_possible(db)

    return story


@router.put("/stories/{story_id}", response_model=StoryOut)
async def update_story(story_id: int, payload: StoryCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    for key, value in payload.model_dump().items():
        setattr(story, key, value)

    db.commit()
    db.refresh(story)
    _sync_ai_knowledge_if_possible(db)
    return story


@router.delete("/stories/{story_id}")
async def delete_story(story_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    db.delete(story)
    db.commit()
    _sync_ai_knowledge_if_possible(db)
    return {"message": "Story deleted"}


# --- Social Scale CMS ---

@router.get("/social-scale", response_model=SocialScaleOut)
async def get_social_scale(db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    item = db.query(SocialScale).order_by(SocialScale.updated_at.desc(), SocialScale.id.desc()).first()
    if not item:
        item = SocialScale(
            hero_title="Tổ xã hội - Quy mô & phát triển",
            hero_subtitle="Cập nhật dữ liệu quy mô theo từng năm học.",
            vision="Deep learning with love",
            subjects_overview="Ngữ văn, KTPL, Lịch sử, Địa lí, Vovinam",
            roadmap="Cấu trúc tổ chức; chỉ tiêu học thuật; học liệu; báo cáo theo học kỳ",
            is_active=True,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
    return item


@router.put("/social-scale", response_model=SocialScaleOut)
async def update_social_scale(payload: SocialScaleCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    item = db.query(SocialScale).order_by(SocialScale.updated_at.desc(), SocialScale.id.desc()).first()
    if not item:
        item = SocialScale(**payload.model_dump())
        db.add(item)
    else:
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


# --- Staff Profile CMS ---

@router.get("/staff", response_model=List[StaffProfileOut])
async def get_staff(db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    return db.query(StaffProfile).order_by(StaffProfile.display_order.asc(), StaffProfile.created_at.desc()).all()


@router.post("/staff", response_model=StaffProfileOut)
async def create_staff(payload: StaffProfileCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    item = StaffProfile(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/staff/{staff_id}", response_model=StaffProfileOut)
async def update_staff(staff_id: int, payload: StaffProfileCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    item = db.query(StaffProfile).filter(StaffProfile.id == staff_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    item = db.query(StaffProfile).filter(StaffProfile.id == staff_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    db.delete(item)
    db.commit()
    return {"message": "Staff profile deleted"}

# --- Submission Management ---

@router.get("/submissions", response_model=List[SubmissionOut])
async def get_submissions(db: Session = Depends(get_db), admin: User = Depends(get_current_submission_judge)):
    return db.query(Submission).order_by(Submission.created_at.desc()).all()

@router.put("/submissions/{sub_id}/status")
async def update_submission_status(
    sub_id: int,
    payload: Optional[SubmissionStatusUpdate] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_submission_judge),
):
    submission = db.query(Submission).filter(Submission.id == sub_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    next_status = payload.status if payload else status
    if next_status not in {"pending", "approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    submission.status = next_status
    db.commit()
    _sync_ai_knowledge_if_possible(db)

    # Notify via WebSocket
    await manager.broadcast({
        "type": "submission_update",
        "title": "Cập nhật hệ thống",
        "message": f"Bài thi '{submission.title}' đã được cập nhật trạng thái: {next_status.upper()}.",
        "id": submission.id
    })

    return {
        "message": f"Submission status updated to {next_status}",
        "id": submission.id,
        "status": submission.status,
    }


@router.get("/auth/overview")
async def get_auth_overview(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    users = db.query(User).all()
    role_counts = {
        "admin": 0,
        "website_manager": 0,
        "submission_judge": 0,
        "teacher": 0,
        "student": 0,
        "other": 0,
    }

    for user in users:
        role = user.role or "other"
        if role in role_counts:
            role_counts[role] += 1
        else:
            role_counts["other"] += 1

    return {
        "roles": role_counts,
        "permissions": {
            "admin": ["all", "user_manage", "auth_audit", "ai_knowledge", "content_manage", "submission_review"],
            "website_manager": ["admin_panel", "content_manage"],
            "submission_judge": ["admin_panel", "submission_review"],
            "teacher": ["public_user"],
            "student": ["public_user"],
        },
        "policy": {
            "cannot_change_other_admin_role": True,
            "only_admin_can_manage_users": True,
        },
    }

# --- Stats for Dashboard ---

@router.get("/stats", response_model=DashboardStats)
async def get_stats(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return {
        "users": db.query(User).count(),
        "publications": db.query(Publication).count(),
        "submissions": db.query(Submission).count(),
        "pending_submissions": db.query(Submission).filter(Submission.status == "pending").count(),
        "events": db.query(Event).count(),
        "stories": db.query(Story).count(),
    }


@router.get("/overview", response_model=AdminOverview)
async def get_admin_overview(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    stats = {
        "users": db.query(User).count(),
        "publications": db.query(Publication).count(),
        "submissions": db.query(Submission).count(),
        "pending_submissions": db.query(Submission).filter(Submission.status == "pending").count(),
        "events": db.query(Event).count(),
        "stories": db.query(Story).count(),
    }

    try:
        ai_health = ai_module.get_ai_health_snapshot(db)
        ai_status = ai_health.get("status", "degraded")
        ai_documents = int(ai_health.get("chroma", {}).get("documents", 0))
        knowledge_assets = int(ai_health.get("chroma", {}).get("knowledge_assets", 0))
    except Exception:
        ai_status = "degraded"
        ai_documents = 0
        knowledge_assets = 0

    return {
        "stats": stats,
        "ai_status": ai_status,
        "ai_documents": ai_documents,
        "knowledge_assets": knowledge_assets,
        "recent_activity": _collect_recent_activity(db),
    }


@router.get("/ai-knowledge/assets", response_model=List[AIKnowledgeAssetOut])
async def get_ai_knowledge_assets(admin: User = Depends(get_current_admin)):
    return ai_module.list_knowledge_files()


@router.get("/ai-knowledge/overview")
async def get_ai_knowledge_overview(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return ai_module.get_ai_knowledge_overview(db)


@router.post("/ai-knowledge/upload", response_model=AIKnowledgeUploadOut)
async def upload_ai_knowledge_files(
    files: List[UploadFile] = File(...),
    admin: User = Depends(get_current_admin),
):
    uploaded: List[dict] = []
    failed: List[dict] = []
    uploader = admin.full_name or admin.email or "admin"

    for upload in files:
        try:
            content = await upload.read()
            if not content:
                raise ValueError("File rỗng.")
            item = ai_module.ingest_knowledge_file(upload.filename or "unknown", content, uploader)
            uploaded.append(item)
        except Exception as exc:
            failed.append(
                {
                    "file_name": upload.filename or "unknown",
                    "error": str(exc),
                }
            )

    return {"uploaded": uploaded, "failed": failed}


@router.delete("/ai-knowledge/assets/{asset_id}")
async def delete_ai_knowledge_asset(asset_id: str, admin: User = Depends(get_current_admin)):
    deleted = ai_module.delete_knowledge_file(asset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Knowledge asset not found")
    return {"message": "Knowledge asset deleted", "id": asset_id}


@router.post("/ai-knowledge/resync")
async def resync_ai_knowledge(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    ai_module._sync_knowledge_base(db)
    snapshot = ai_module.get_ai_health_snapshot(db)
    return {
        "message": "Knowledge base synchronized",
        "documents": snapshot.get("chroma", {}).get("documents", 0),
        "knowledge_assets": snapshot.get("chroma", {}).get("knowledge_assets", 0),
    }


@router.post("/newsletter/send", response_model=NewsletterDispatchOut)
async def send_newsletter(
    payload: NewsletterDispatchIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    recipients = _build_newsletter_recipients(db, admin.id)

    if recipients:
        background_tasks.add_task(
            newsletter_service.dispatch_newsletter_bulk,
            recipients,
            payload.title,
            payload.body,
            payload.action_url,
            payload.send_email,
            payload.send_webpush,
        )

    return {
        "queued": len(recipients) > 0,
        "recipients": len(recipients),
        "send_email": payload.send_email,
        "send_webpush": payload.send_webpush,
        "newsletter_enabled": newsletter_service.is_newsletter_enabled(),
        "webpush_configured": newsletter_service.is_webpush_channel_enabled(),
    }
