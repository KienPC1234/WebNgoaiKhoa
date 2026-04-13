from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.publication import Publication, Submission
from app.db.notifications import manager
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# --- Schemas ---
class PublicationOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    image_url: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class SubmissionCreate(BaseModel):
    title: str
    content: str
    student_name: str
    student_email: str

class SubmissionOut(BaseModel):
    id: int
    title: str
    content: str
    student_name: str
    status: str
    votes: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- Public Endpoints ---

@router.get("/publications", response_model=List[PublicationOut])
async def get_public_publications(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Publication)
    if category:
        query = query.filter(Publication.category == category)
    return query.order_by(Publication.created_at.desc()).all()

@router.get("/submissions", response_model=List[SubmissionOut])
async def get_public_submissions(db: Session = Depends(get_db)):
    # Only show approved submissions to the public
    return db.query(Submission).filter(Submission.status == "approved").order_by(Submission.created_at.desc()).all()

@router.post("/submissions", response_model=SubmissionOut)
async def create_public_submission(sub: SubmissionCreate, db: Session = Depends(get_db)):
    new_sub = Submission(**sub.dict(), status="pending", votes=0)
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    
    # Notify admins about new submission
    await manager.broadcast({
        "type": "new_submission",
        "title": f"Bài mới: {new_sub.title}",
        "message": f"Sinh viên {new_sub.student_name} vừa gửi một bài dự thi mới.",
        "id": new_sub.id
    })
    
    return new_sub

@router.post("/submissions/{sub_id}/vote")
async def vote_submission(sub_id: int, db: Session = Depends(get_db)):
    submission = db.query(Submission).filter(Submission.id == sub_id, Submission.status == "approved").first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found or not approved")
    
    submission.votes += 1
    db.commit()
    return {"message": "Vote recorded", "votes": submission.votes}
