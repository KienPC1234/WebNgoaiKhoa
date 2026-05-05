import json
import os
import smtplib
import threading
from email.message import EmailMessage
from pathlib import Path
from typing import Dict, List, Optional

from app.services.email_templates import get_newsletter_html
from app.db.session import SessionLocal
from app.models.notification import PushSubscription, Notification
from app.models.user import User
from app.db.notifications import manager

try:
    import firebase_admin
    from firebase_admin import credentials, messaging
except Exception:  # pragma: no cover - optional dependency at runtime
    firebase_admin = None
    credentials = None
    messaging = None


SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@webngoaikhoa.local")
UNSUBSCRIBE_URL_BASE = os.getenv("UNSUBSCRIBE_URL_BASE", "http://localhost:3002/api/auth/unsubscribe")

NEWSLETTER_ENABLED = os.getenv("NEWSLETTER_ENABLED", "true").lower() == "true"
NEWSLETTER_EMAIL_ENABLED = os.getenv("NEWSLETTER_EMAIL_ENABLED", "true").lower() == "true"
NEWSLETTER_WEBPUSH_ENABLED = os.getenv("NEWSLETTER_WEBPUSH_ENABLED", "false").lower() == "true"

FCM_HTTP_V1_ENABLED = os.getenv("FCM_HTTP_V1_ENABLED", "true").lower() == "true"
FCM_SERVICE_ACCOUNT_FILE = Path(
    os.getenv("FCM_SERVICE_ACCOUNT_FILE", "/data/WebNgoaiKhoa/backend/fcm.secrets_json")
)
FCM_PROJECT_ID = os.getenv("FCM_PROJECT_ID", "")
FCM_WEBPUSH_LINK = os.getenv("FCM_WEBPUSH_LINK", "https://ngoaikhoa.fptoj.com")

PUSH_REGISTRY_FILE = Path(os.getenv("PUSH_REGISTRY_FILE", "backend/app/db/push_registry.json"))

_registry_lock = threading.Lock()
_firebase_lock = threading.Lock()
_firebase_initialized = False


def is_newsletter_enabled() -> bool:
    return NEWSLETTER_ENABLED


def is_email_channel_enabled() -> bool:
    return NEWSLETTER_ENABLED and NEWSLETTER_EMAIL_ENABLED


def is_webpush_channel_enabled() -> bool:
    if not (NEWSLETTER_ENABLED and NEWSLETTER_WEBPUSH_ENABLED and FCM_HTTP_V1_ENABLED):
        return False
    return _ensure_firebase_initialized()


def _ensure_firebase_initialized() -> bool:
    global _firebase_initialized

    if _firebase_initialized:
        return True

    if firebase_admin is None or credentials is None:
        print("[FCM_HTTP_V1] firebase_admin is not installed")
        return False

    if not FCM_SERVICE_ACCOUNT_FILE.exists():
        print(f"[FCM_HTTP_V1] Missing service account file: {FCM_SERVICE_ACCOUNT_FILE}")
        return False

    with _firebase_lock:
        if _firebase_initialized:
            return True

        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate(str(FCM_SERVICE_ACCOUNT_FILE))
                options = {"projectId": FCM_PROJECT_ID} if FCM_PROJECT_ID else None
                firebase_admin.initialize_app(cred, options)
            _firebase_initialized = True
            return True
        except Exception as exc:
            print(f"[FCM_HTTP_V1] init failed: {exc}")
            return False


def _load_registry() -> Dict[str, List[str]]:
    if not PUSH_REGISTRY_FILE.exists():
        return {}

    try:
        data = json.loads(PUSH_REGISTRY_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}

    if not isinstance(data, dict):
        return {}

    normalized: Dict[str, List[str]] = {}
    for email, tokens in data.items():
        if isinstance(email, str) and isinstance(tokens, list):
            cleaned = [t for t in tokens if isinstance(t, str) and t.strip()]
            if cleaned:
                normalized[email] = list(dict.fromkeys(cleaned))
    return normalized


def _save_registry(data: Dict[str, List[str]]) -> None:
    PUSH_REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
    PUSH_REGISTRY_FILE.write_text(json.dumps(data, ensure_ascii=True, indent=2), encoding="utf-8")


def register_push_token(email: str, token: str) -> int:
    token = (token or "").strip()
    if not token:
        return 0

    # Save to registry file (backwards compatibility)
    with _registry_lock:
        data = _load_registry()
        bucket = data.get(email, [])
        if token not in bucket:
            bucket.append(token)
        data[email] = bucket
        _save_registry(data)

    # Also attempt to persist into DB push_subscriptions table if available
    try:
        db = SessionLocal()
        # find or create subscription record
        exists = db.query(PushSubscription).filter(PushSubscription.token == token).first()
        if not exists:
            user = db.query(User).filter(User.email == email).first()
            user_id = user.id if user else None
            sub = PushSubscription(user_id=user_id, token=token)
            db.add(sub)
            db.commit()
        else:
            # if exists but not linked to user, link it
            if exists.user_id is None:
                user = db.query(User).filter(User.email == email).first()
                if user:
                    exists.user_id = user.id
                    db.add(exists)
                    db.commit()
    except Exception:
        # DB persistence is optional; keep using registry file on failure
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        try:
            db.close()
        except Exception:
            pass

    return len(bucket)


def unregister_push_token(email: str, token: str) -> int:
    token = (token or "").strip()

    with _registry_lock:
        data = _load_registry()
        bucket = data.get(email, [])
        if token:
            bucket = [item for item in bucket if item != token]

        if bucket:
            data[email] = bucket
        elif email in data:
            del data[email]

        _save_registry(data)

    # Also remove from DB if present
    try:
        db = SessionLocal()
        rows = db.query(PushSubscription).filter(PushSubscription.token == token).all()
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

    return len(bucket)


def clear_push_tokens(email: str) -> None:
    with _registry_lock:
        data = _load_registry()
        if email in data:
            del data[email]
            _save_registry(data)


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


def send_webpush(token: str, title: str, body: str, link: Optional[str] = None) -> bool:
    if not is_webpush_channel_enabled():
        return False

    try:
        message = messaging.Message(
            token=token,
            notification=messaging.Notification(title=title, body=body),
            webpush=messaging.WebpushConfig(
                fcm_options=messaging.WebpushFCMOptions(link=link or FCM_WEBPUSH_LINK),
            ),
        )
        messaging.send(message)
        return True
    except Exception as exc:
        exc_str = str(exc).lower()
        # If the token is unregistered or invalid, clean it up to avoid repeated failures
        if any(keyword in exc_str for keyword in ("not-registered", "invalid-argument", "registration-token-not-registered")):
            try:
                _remove_stale_token(token)
            except Exception:
                pass
        print(f"[FCM_HTTP_V1] send failed: {exc}")
        return False


def _remove_stale_token(token: str) -> None:
    """Remove an invalid/expired FCM token from both registry file and DB."""
    # Remove from registry file
    with _registry_lock:
        data = _load_registry()
        changed = False
        for email, tokens in list(data.items()):
            if token in tokens:
                data[email] = [t for t in tokens if t != token]
                if not data[email]:
                    del data[email]
                changed = True
        if changed:
            _save_registry(data)

    # Remove from DB
    try:
        db = SessionLocal()
        rows = db.query(PushSubscription).filter(PushSubscription.token == token).all()
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

    with _registry_lock:
        registry = _load_registry()

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
            for token in registry.get(email, []):
                if send_webpush(token=token, title=title, body=body, link=action_url):
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
                        # refresh to get ID and created_at
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
                            # schedule on running loop from background thread safely
                            asyncio.run_coroutine_threadsafe(
                                manager.broadcast(payload), loop
                            )
                        else:
                            # run a temporary loop to perform the broadcast
                            try:
                                asyncio.run(manager.broadcast(payload))
                            except Exception:
                                # best-effort: ignore broadcast failures
                                pass
                    except Exception:
                        # Ignore broadcast errors; notification is persisted
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
