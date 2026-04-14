from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.db.session import get_db
from app.models.user import User
from app.models.publication import ContentType, Event, Publication, SocialScale, StaffProfile, Story, Submission
from app.api.auth import get_current_admin
from app.db.notifications import manager
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
    SubmissionOut, DashboardStats, SubmissionStatusUpdate
)
from typing import List, Optional

router = APIRouter()


def normalize_publication_payload(pub: PublicationCreate) -> dict:
    payload = pub.model_dump()
    subject = payload.get("subject") or payload.get("category") or "van"
    content_type = payload.get("content_type") or ContentType.AN_PHAM.value

    payload["subject"] = subject
    payload["category"] = subject  # Keep legacy clients compatible
    payload["content_type"] = content_type
    return payload

# --- User Management ---

@router.get("/users", response_model=List[UserOut])
async def get_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(User).all()

@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for key, value in user_update.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user

# --- Publication Management ---

@router.get("/publications", response_model=List[PublicationOut])
async def get_publications(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(Publication).order_by(Publication.created_at.desc()).all()


@router.get("/publications/{pub_id}", response_model=PublicationOut)
async def get_publication_by_id(pub_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    return pub

@router.post("/publications", response_model=PublicationOut)
async def create_publication(pub: PublicationCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    payload = normalize_publication_payload(pub)
    new_pub = Publication(**payload, author_id=admin.id)
    db.add(new_pub)
    db.commit()
    db.refresh(new_pub)
    return new_pub

@router.put("/publications/{pub_id}", response_model=PublicationOut)
async def update_publication(pub_id: int, pub_update: PublicationCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    payload = normalize_publication_payload(pub_update)
    for key, value in payload.items():
        setattr(pub, key, value)
    
    db.commit()
    db.refresh(pub)
    return pub

@router.delete("/publications/{pub_id}")
async def delete_publication(pub_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    db.delete(pub)
    db.commit()
    return {"message": "Publication deleted"}


# --- Event Management ---

@router.get("/events", response_model=List[EventOut])
async def get_events(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(Event).order_by(Event.event_date.asc()).all()


@router.get("/events/upcoming", response_model=List[EventOut])
async def get_upcoming_events_for_admin(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    now = datetime.now(timezone.utc)
    return (
        db.query(Event)
        .filter(Event.is_active == True)
        .filter((Event.event_date >= now) | (Event.status.in_(["upcoming", "registration"])))
        .order_by(Event.event_date.asc())
        .all()
    )


@router.post("/events", response_model=EventOut)
async def create_event(payload: EventCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    event = Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/events/{event_id}", response_model=EventOut)
async def update_event(event_id: int, payload: EventCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for key, value in payload.model_dump().items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}")
async def delete_event(event_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}


# --- Story Management ---

@router.get("/stories", response_model=List[StoryOut])
async def get_stories(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(Story).order_by(Story.created_at.desc()).all()


@router.get("/stories/{story_id}", response_model=StoryOut)
async def get_story_by_id(story_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.post("/stories", response_model=StoryOut)
async def create_story(payload: StoryCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    story = Story(**payload.model_dump())
    db.add(story)
    db.commit()
    db.refresh(story)
    return story


@router.put("/stories/{story_id}", response_model=StoryOut)
async def update_story(story_id: int, payload: StoryCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    for key, value in payload.model_dump().items():
        setattr(story, key, value)

    db.commit()
    db.refresh(story)
    return story


@router.delete("/stories/{story_id}")
async def delete_story(story_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    db.delete(story)
    db.commit()
    return {"message": "Story deleted"}


# --- Social Scale CMS ---

@router.get("/social-scale", response_model=SocialScaleOut)
async def get_social_scale(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
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
async def update_social_scale(payload: SocialScaleCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
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
async def get_staff(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(StaffProfile).order_by(StaffProfile.display_order.asc(), StaffProfile.created_at.desc()).all()


@router.post("/staff", response_model=StaffProfileOut)
async def create_staff(payload: StaffProfileCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    item = StaffProfile(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/staff/{staff_id}", response_model=StaffProfileOut)
async def update_staff(staff_id: int, payload: StaffProfileCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    item = db.query(StaffProfile).filter(StaffProfile.id == staff_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    item = db.query(StaffProfile).filter(StaffProfile.id == staff_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    db.delete(item)
    db.commit()
    return {"message": "Staff profile deleted"}

# --- Submission Management ---

@router.get("/submissions", response_model=List[SubmissionOut])
async def get_submissions(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(Submission).order_by(Submission.created_at.desc()).all()

@router.put("/submissions/{sub_id}/status")
async def update_submission_status(
    sub_id: int,
    payload: Optional[SubmissionStatusUpdate] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    submission = db.query(Submission).filter(Submission.id == sub_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    next_status = payload.status if payload else status
    if next_status not in {"pending", "approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    submission.status = next_status
    db.commit()

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
