from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.publication import Publication, Submission
from app.api.auth import get_current_admin
from app.db.notifications import manager
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# --- Schemas ---
class UserBase(BaseModel):
    email: str
    full_name: str
    role: str
    is_active: bool

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(UserBase):
    id: int
    class Config:
        from_attributes = True

class PublicationBase(BaseModel):
    title: str
    content: str
    category: str
    image_url: Optional[str] = None

class PublicationCreate(PublicationBase):
    pass

class PublicationOut(PublicationBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class SubmissionOut(BaseModel):
    id: int
    title: str
    content: str
    student_name: str
    student_email: str
    status: str
    votes: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- User Management ---

@router.get("/users", response_model=List[UserOut])
async def get_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(User).all()

@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for key, value in user_update.dict(exclude_unset=True).items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user

# --- Publication Management ---

@router.get("/publications", response_model=List[PublicationOut])
async def get_publications(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(Publication).all()

@router.post("/publications", response_model=PublicationOut)
async def create_publication(pub: PublicationCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    new_pub = Publication(**pub.dict(), author_id=admin.id)
    db.add(new_pub)
    db.commit()
    db.refresh(new_pub)
    return new_pub

@router.delete("/publications/{pub_id}")
async def delete_publication(pub_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    db.delete(pub)
    db.commit()
    return {"message": "Publication deleted"}

# --- Submission Management ---

@router.get("/submissions", response_model=List[SubmissionOut])
async def get_submissions(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(Submission).all()

@router.put("/submissions/{sub_id}/status")
async def update_submission_status(sub_id: int, status: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    submission = db.query(Submission).filter(Submission.id == sub_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    submission.status = status
    db.commit()

    # Notify about status update
    await manager.broadcast({
        "type": "submission_update",
        "title": "Cập nhật trạng thái bài thi",
        "message": f"Bài thi '{submission.title}' đã được chuyển sang trạng thái: {status.upper()}.",
        "status": status,
        "id": submission.id
    })

    return {"message": f"Submission status updated to {status}"}

# --- Stats for Dashboard ---

@router.get("/stats")
async def get_stats(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user_count = db.query(User).count()
    pub_count = db.query(Publication).count()
    sub_count = db.query(Submission).count()
    pending_subs = db.query(Submission).filter(Submission.status == "pending").count()
    
    return {
        "users": user_count,
        "publications": pub_count,
        "submissions": sub_count,
        "pending_submissions": pending_subs
    }
