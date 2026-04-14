from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.publication import Publication, Submission, Category, ContentType, Event, Story
from app.models.user import User
from app.db.notifications import manager
from app.api.auth import get_current_contestant
from app.schemas.schemas import (
    EventOut,
    PublicationOut,
    StoryOut,
    SubmissionOut,
    SubmissionCreate,
)
from typing import List, Optional

router = APIRouter()

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

@router.get("/submissions", response_model=List[SubmissionOut])
async def get_public_submissions(db: Session = Depends(get_db)):
    # Only show approved submissions to the public
    return db.query(Submission).filter(Submission.status == "approved").order_by(Submission.created_at.desc()).all()

@router.post("/submissions", response_model=SubmissionOut)
async def create_public_submission(sub: SubmissionCreate, db: Session = Depends(get_db)):
    new_sub = Submission(**sub.model_dump(), status="pending", votes=0)
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


@router.post("/submissions/contestant", response_model=SubmissionOut)
async def create_contestant_submission(
    sub: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    new_sub = Submission(
        title=sub.title,
        content=sub.content,
        student_name=current_user.full_name or sub.student_name,
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
async def vote_submission(sub_id: int, db: Session = Depends(get_db)):
    submission = db.query(Submission).filter(Submission.id == sub_id, Submission.status == "approved").first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found or not approved")
    
    submission.votes += 1
    db.commit()
    return {"message": "Vote recorded", "votes": submission.votes}
