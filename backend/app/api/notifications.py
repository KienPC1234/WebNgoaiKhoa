from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db, engine
from app.api.auth import get_current_user
from app.models.notification import Notification, PushSubscription

router = APIRouter()

# Ensure tables exist at runtime (lightweight)
try:
    Notification.__table__.create(bind=engine, checkfirst=True)
    PushSubscription.__table__.create(bind=engine, checkfirst=True)
except Exception:
    # If table creation fails at runtime, proceed; API will raise on DB usage.
    pass


@router.get("/notifications")
async def list_notifications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    rows = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(200).all()
    result = []
    for r in rows:
        result.append({
            "id": r.id,
            "title": r.title,
            "message": r.body,
            "url": r.url,
            "is_read": bool(r.is_read),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result


@router.post("/notifications/{notif_id}/mark-read")
async def mark_notification_read(notif_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.add(notif)
    db.commit()
    return {"ok": True}


@router.post("/notifications/mark-all-read")
async def mark_all_read(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({Notification.is_read: True})
    db.commit()
    return {"ok": True}
