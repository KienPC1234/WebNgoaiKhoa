import json
import os
import smtplib
import threading
from email.message import EmailMessage
from typing import Dict, List, Optional

from pywebpush import webpush, WebPushException

from app.services.email_templates import get_newsletter_html
from app.db.session import SessionLocal
from app.models.notification import PushSubscription, Notification
from app.models.user import User
from app.db.notifications import manager


SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@webngoaikhoa.local")
UNSUBSCRIBE_URL_BASE = os.getenv("UNSUBSCRIBE_URL_BASE", "http://localhost:3002/api/auth/unsubscribe")

NEWSLETTER_ENABLED = os.getenv("NEWSLETTER_ENABLED", "true").lower() == "true"
NEWSLETTER_EMAIL_ENABLED = os.getenv("NEWSLETTER_EMAIL_ENABLED", "true").lower() == "true"
NEWSLETTER_WEBPUSH_ENABLED = os.getenv("NEWSLETTER_WEBPUSH_ENABLED", "false").lower() == "true"

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIM_EMAIL = os.getenv("VAPID_CLAIM_EMAIL", "noreply@example.com")
WEBPUSH_DEFAULT_URL = os.getenv("WEBPUSH_DEFAULT_URL", "https://toxahoihola.com")


def is_newsletter_enabled() -> bool:
    return NEWSLETTER_ENABLED


def is_email_channel_enabled() -> bool:
    return NEWSLETTER_ENABLED and NEWSLETTER_EMAIL_ENABLED


def is_webpush_channel_enabled() -> bool:
    return NEWSLETTER_ENABLED and NEWSLETTER_WEBPUSH_ENABLED and bool(VAPID_PRIVATE_KEY)


def _unsubscribe_link(email: str, token: str) -> str:
    return f"{UNSUBSCRIBE_URL_BASE}?email={email}&token={token}"


def send_newsletter_email(to_email: str, unsubscribe_token: str, subject: str, body: str, action_url: Optional[str] = None) -> bool:
    if not is_email_channel_enabled():
        return False

    unsubscribe_link = _unsubscribe_link(to_email, unsubscribe_token)

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg["List-Unsubscribe"] = f"<{unsubscribe_link}>"
    msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    msg["Precedence"] = "bulk"

    lines = [
        "Xin chào,",
        "",
        body,
        "",
    ]
    if action_url:
        lines.extend([f"Xem chi tiết: {action_url}", ""])
    lines.extend(
        [
            "Bạn nhận được thông tin này từ TỔ XÃ HỘI.",
            "Nếu không muốn nhận thêm email, vui lòng hủy đăng ký:",
            unsubscribe_link,
        ]
    )

    msg.set_content("\n".join(lines), charset="utf-8")

    html_content = get_newsletter_html(subject, body, action_url, unsubscribe_link)
    msg.add_alternative(html_content, subtype="html")

    if not SMTP_HOST:
        print(f"[NEWSLETTER_EMAIL_SIMULATION] {to_email} -> {subject}")
        return True

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.starttls()
            if SMTP_USER and SMTP_PASSWORD:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as exc:
        print(f"[NEWSLETTER_EMAIL_ERROR] {to_email}: {exc}")
        return False


def send_webpush(subscription: PushSubscription, title: str, body: str, url: Optional[str] = None) -> bool:
    if not is_webpush_channel_enabled():
        return False

    try:
        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.p256dh,
                "auth": subscription.auth,
            },
        }
        payload = json.dumps({
            "title": title,
            "body": body,
            "url": url or WEBPUSH_DEFAULT_URL,
        }, ensure_ascii=False)
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{VAPID_CLAIM_EMAIL}"},
            timeout=15,
        )
        return True
    except WebPushException as exc:
        exc_str = str(exc).lower()
        status_code = getattr(exc, "response", None)
        status_code = getattr(status_code, "status_code", None) if status_code else None
        # 410 Gone or 404 = subscription expired/invalid, remove it
        if status_code in (410, 404) or "410" in exc_str or "not found" in exc_str or "unsubscribed" in exc_str:
            try:
                _remove_stale_subscription(subscription)
            except Exception:
                pass
        print(f"[WEBPUSH] send failed (endpoint={subscription.endpoint[:60]}...): {exc}")
        return False
    except Exception as exc:
        print(f"[WEBPUSH] send failed: {exc}")
        return False


def _remove_stale_subscription(subscription: PushSubscription) -> None:
    """Remove an invalid/expired push subscription from DB."""
    try:
        db = SessionLocal()
        rows = db.query(PushSubscription).filter(PushSubscription.endpoint == subscription.endpoint).all()
        for r in rows:
            db.delete(r)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        try:
            db.close()
        except Exception:
            pass


def register_push_subscription(user_email: Optional[str], endpoint: str, p256dh: str, auth: str) -> bool:
    """Register a new push subscription. Returns True if created, False if already exists."""
    if not endpoint or not p256dh or not auth:
        return False

    try:
        db = SessionLocal()
        existing = db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).first()
        if existing:
            # Update keys if changed
            existing.p256dh = p256dh
            existing.auth = auth
            if user_email and existing.user_id is None:
                user = db.query(User).filter(User.email == user_email).first()
                if user:
                    existing.user_id = user.id
            db.commit()
            return False

        user_id = None
        if user_email:
            user = db.query(User).filter(User.email == user_email).first()
            if user:
                user_id = user.id

        sub = PushSubscription(user_id=user_id, endpoint=endpoint, p256dh=p256dh, auth=auth)
        db.add(sub)
        db.commit()
        return True
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return False
    finally:
        try:
            db.close()
        except Exception:
            pass


def unregister_push_subscription(endpoint: str) -> bool:
    """Remove a push subscription by endpoint."""
    if not endpoint:
        return False

    try:
        db = SessionLocal()
        rows = db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).all()
        removed = len(rows) > 0
        for r in rows:
            db.delete(r)
        db.commit()
        return removed
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return False
    finally:
        try:
            db.close()
        except Exception:
            pass


def clear_user_push_subscriptions(user_email: str) -> None:
    """Remove all push subscriptions for a user by email."""
    try:
        db = SessionLocal()
        user = db.query(User).filter(User.email == user_email).first()
        if user:
            subs = db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all()
            for s in subs:
                db.delete(s)
            db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        try:
            db.close()
        except Exception:
            pass


def get_user_subscriptions(user_email: str) -> List[PushSubscription]:
    """Get all push subscriptions for a user by email."""
    try:
        db = SessionLocal()
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return []
        subs = db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all()
        # Detach from session
        result = []
        for s in subs:
            db.expunge(s)
        return subs
    except Exception:
        return []
    finally:
        try:
            db.close()
        except Exception:
            pass


def get_all_subscriptions() -> List[PushSubscription]:
    """Get all push subscriptions."""
    try:
        db = SessionLocal()
        subs = db.query(PushSubscription).all()
        for s in subs:
            db.expunge(s)
        return subs
    except Exception:
        return []
    finally:
        try:
            db.close()
        except Exception:
            pass


def dispatch_newsletter_bulk(
    recipients: List[Dict[str, str]],
    title: str,
    body: str,
    action_url: Optional[str] = None,
    send_email: bool = True,
    send_webpush_enabled: bool = True,
) -> Dict[str, int]:
    """Background task entrypoint for sending newsletter notifications."""
    if not is_newsletter_enabled():
        return {
            "total": len(recipients),
            "email_sent": 0,
            "push_sent": 0,
        }

    email_sent = 0
    push_sent = 0

    for item in recipients:
        email = item.get("email")
        unsubscribe_token = item.get("unsubscribe_token")
        if not email or not unsubscribe_token:
            continue

        if send_email:
            if send_newsletter_email(
                to_email=email,
                unsubscribe_token=unsubscribe_token,
                subject=title,
                body=body,
                action_url=action_url,
            ):
                email_sent += 1

        if send_webpush_enabled:
            # Get push subscriptions for this user from DB
            user_subs = get_user_subscriptions(email)
            for sub in user_subs:
                if send_webpush(subscription=sub, title=title, body=body, url=action_url):
                    push_sent += 1

            # Persist in-app notification for the user if present
            try:
                db = SessionLocal()
                user = db.query(User).filter(User.email == email).first()
                if user:
                    n = Notification(user_id=user.id, title=title, body=body, url=action_url)
                    db.add(n)
                    db.commit()
                    try:
                        db.refresh(n)
                    except Exception:
                        pass

                    # Broadcast to connected websocket clients so UI updates live
                    try:
                        payload = {
                            "type": "notification",
                            "id": n.id,
                            "title": n.title,
                            "message": n.body,
                            "url": n.url,
                            "is_read": False,
                            "created_at": n.created_at.isoformat() if n.created_at else None,
                        }
                        import asyncio
                        try:
                            loop = asyncio.get_event_loop()
                        except RuntimeError:
                            loop = None

                        if loop and loop.is_running():
                            asyncio.run_coroutine_threadsafe(
                                manager.broadcast(payload), loop
                            )
                        else:
                            try:
                                asyncio.run(manager.broadcast(payload))
                            except Exception:
                                pass
                    except Exception:
                        pass
            except Exception:
                try:
                    db.rollback()
                except Exception:
                    pass
            finally:
                try:
                    db.close()
                except Exception:
                    pass

    return {
        "total": len(recipients),
        "email_sent": email_sent,
        "push_sent": push_sent,
    }
