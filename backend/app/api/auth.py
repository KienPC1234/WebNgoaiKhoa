from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from fastapi import APIRouter, Depends, Form, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from typing import Optional
import hashlib
import hmac
import os
import random
import requests
import smtplib
import uuid

from app.db.session import get_db
from app.models.user import User
from app.services import newsletter as newsletter_service
from app.services.email_templates import get_otp_html
from app.schemas.schemas import PushConfigOut, PushTokenIn, PushTokenOut

router = APIRouter()

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-development")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY", "")
RECAPTCHA_VERIFY_URL = os.getenv("RECAPTCHA_VERIFY_URL", "https://www.google.com/recaptcha/api/siteverify")
RECAPTCHA_REQUIRED = os.getenv("RECAPTCHA_REQUIRED", "false").lower() == "true"

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@webngoaikhoa.local")
UNSUBSCRIBE_URL_BASE = os.getenv("UNSUBSCRIBE_URL_BASE", "http://localhost:3002/api/auth/unsubscribe")
UNSUBSCRIBE_SECRET = os.getenv("EMAIL_UNSUBSCRIBE_SECRET", SECRET_KEY)
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class RegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=6, max_length=128)
    full_name: Optional[str] = None
    recaptcha_token: Optional[str] = None


class UpdateMeIn(BaseModel):
    full_name: Optional[str] = None


class PasswordSetIn(BaseModel):
    new_password: str = Field(min_length=6, max_length=128)


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


class VerifyResendIn(BaseModel):
    email: str
    recaptcha_token: Optional[str] = None


class VerifyOtpIn(BaseModel):
    email: str
    otp: str = Field(min_length=4, max_length=12)
    recaptcha_token: Optional[str] = None


class UnsubscribeIn(BaseModel):
    email: str
    token: str


class GoogleAuthIn(BaseModel):
    id_token: str
    full_name: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    full_name: Optional[str] = None
    email_verified: bool
    is_subscribed: bool


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def is_valid_email(email: str) -> bool:
    return bool(email and "@" in email and "." in email.split("@")[-1])


def normalize_email(email: Optional[str]) -> str:
    return (email or "").strip().lower()


def is_recaptcha_enabled() -> bool:
    return bool(RECAPTCHA_SECRET_KEY)


def verify_recaptcha_or_raise(token: Optional[str], action: str = "generic") -> None:
    if not is_recaptcha_enabled():
        if RECAPTCHA_REQUIRED:
            raise HTTPException(status_code=500, detail="Recaptcha is required but not configured")
        return

    if not token:
        if RECAPTCHA_REQUIRED:
            raise HTTPException(status_code=400, detail=f"Recaptcha token is required for {action}")
        return

    try:
        response = requests.post(
            RECAPTCHA_VERIFY_URL,
            data={"secret": RECAPTCHA_SECRET_KEY, "response": token},
            timeout=10,
        )
        payload = response.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to verify recaptcha")

    if not payload.get("success"):
        raise HTTPException(status_code=400, detail="Recaptcha validation failed")


def build_unsubscribe_token(email: str) -> str:
    return hmac.new(UNSUBSCRIBE_SECRET.encode(), email.encode(), hashlib.sha256).hexdigest()


def is_valid_unsubscribe_token(email: str, token: str) -> bool:
    expected = build_unsubscribe_token(email)
    return hmac.compare_digest(expected, token or "")


def make_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


def send_otp_email(to_email: str, otp: str) -> None:
    unsubscribe_token = build_unsubscribe_token(to_email)
    unsubscribe_link = f"{UNSUBSCRIBE_URL_BASE}?email={to_email}&token={unsubscribe_token}"

    msg = EmailMessage()
    msg["Subject"] = "Ma xac thuc OTP - To xa hoi"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg["List-Unsubscribe"] = f"<{unsubscribe_link}>"
    msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    msg["Precedence"] = "bulk"
    msg["X-Entity-Ref-ID"] = f"otp-{uuid.uuid4()}"

    body = (
        "Xin chao,\n\n"
        f"Ma OTP cua ban la: {otp}\n"
        f"Ma co hieu luc trong {OTP_EXPIRE_MINUTES} phut.\n\n"
        "Neu ban khong thuc hien thao tac nay, vui long bo qua email.\n"
        "\n"
        "Ban nhan duoc thong tin nay tu TO XA HOI.\n"
        "Dia chi: FPT Education, Khu Cong nghe cao Hoa Lac, Ha Noi.\n"
        f"Huy dang ky tai day: {unsubscribe_link}"
    )
    msg.set_content(body)

    html_content = get_otp_html(otp, OTP_EXPIRE_MINUTES, unsubscribe_link)
    msg.add_alternative(html_content, subtype="html")

    if not SMTP_HOST:
        print(f"[OTP_EMAIL_SIMULATION] {to_email} -> OTP: {otp}")
        print(f"[UNSUBSCRIBE_LINK] {unsubscribe_link}")
        return

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        if SMTP_USER and SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges",
        )
    return current_user


async def get_current_admin_panel_user(current_user: User = Depends(get_current_user)):
    if current_user.role not in {"admin", "website_manager", "submission_judge"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have admin panel access",
        )
    return current_user


async def get_current_website_manager(current_user: User = Depends(get_current_user)):
    if current_user.role not in {"admin", "website_manager"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have website management privileges",
        )
    return current_user


async def get_current_submission_judge(current_user: User = Depends(get_current_user)):
    if current_user.role not in {"admin", "submission_judge"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have submission moderation privileges",
        )
    return current_user


async def get_current_contestant(current_user: User = Depends(get_current_user)):
    if current_user.role not in ("student", "contestant", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user is not a contestant",
        )
    return current_user


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    recaptcha_token: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    verify_recaptcha_or_raise(recaptcha_token, action="login")

    normalized_username = normalize_email(form_data.username)

    user = db.query(User).filter(User.email == normalized_username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ten dang nhap hoac mat khau khong dung",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tai khoan da bi vo hieu hoa",
        )
    if user.role != "admin" and not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tai khoan chua xac minh OTP email",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name,
            "email_verified": user.email_verified,
            "is_subscribed": user.is_subscribed,
        },
    }


@router.post("/google")
async def login_or_register_google(payload: GoogleAuthIn, db: Session = Depends(get_db)):
    if not GOOGLE_OAUTH_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth chưa được cấu hình")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="Thiếu thư viện Google OAuth trên server") from exc

    try:
        token_info = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            GOOGLE_OAUTH_CLIENT_ID,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Google token không hợp lệ")

    issuer = token_info.get("iss")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=400, detail="Google token issuer không hợp lệ")

    email = (token_info.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Google account không có email")

    if not token_info.get("email_verified"):
        raise HTTPException(status_code=400, detail="Google email chưa được xác minh")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password=get_password_hash(uuid.uuid4().hex),
            full_name=(payload.full_name or token_info.get("name") or "").strip() or None,
            role="student",
            is_active=True,
            is_subscribed=True,
            email_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa")

        if not user.email_verified:
            user.email_verified = True
        if not user.full_name and (payload.full_name or token_info.get("name")):
            user.full_name = (payload.full_name or token_info.get("name")).strip() or None
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name,
            "email_verified": user.email_verified,
            "is_subscribed": user.is_subscribed,
        },
    }


@router.post("/register", response_model=UserOut)
async def register_user(payload: RegisterIn, db: Session = Depends(get_db)):
    verify_recaptcha_or_raise(payload.recaptcha_token, action="register")

    normalized_email = normalize_email(payload.email)

    if not is_valid_email(normalized_email):
        raise HTTPException(status_code=400, detail="Invalid email")

    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    otp = make_otp()
    new_user = User(
        email=normalized_email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role="student",
        is_active=True,
        is_subscribed=True,
        email_verified=False,
        verification_token=otp,
        verification_token_expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
        last_verification_sent_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    try:
        send_otp_email(new_user.email, otp)
    except Exception as e:
        print(f"Warning: failed to send OTP email: {e}")

    return new_user


@router.post("/verify-otp")
async def verify_otp(payload: VerifyOtpIn, db: Session = Depends(get_db)):
    verify_recaptcha_or_raise(payload.recaptcha_token, action="verify_otp")

    normalized_email = normalize_email(payload.email)

    user = db.query(User).filter(User.email == normalized_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email khong ton tai")

    if user.email_verified:
        return {"message": "Tai khoan da xac minh"}

    if not user.verification_token or payload.otp != str(user.verification_token):
        raise HTTPException(status_code=400, detail="Ma OTP khong hop le")

    if user.verification_token_expires_at and datetime.now(timezone.utc) > user.verification_token_expires_at:
        raise HTTPException(status_code=400, detail="Ma OTP da het han")

    user.email_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    db.add(user)
    db.commit()

    return {"message": "Xac minh OTP thanh cong"}


@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Token xac minh khong hop le")

    if user.verification_token_expires_at and datetime.now(timezone.utc) > user.verification_token_expires_at:
        raise HTTPException(status_code=400, detail="Token xac minh da het han")

    user.email_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    db.add(user)
    db.commit()

    return {"message": "Xac minh email thanh cong"}


@router.post("/verify-email/resend")
async def resend_verify_email(payload: VerifyResendIn, db: Session = Depends(get_db)):
    verify_recaptcha_or_raise(payload.recaptcha_token, action="resend_otp")

    normalized_email = normalize_email(payload.email)

    user = db.query(User).filter(User.email == normalized_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email khong ton tai")

    if user.email_verified:
        return {"message": "Tai khoan da xac minh truoc do"}

    otp = make_otp()
    user.verification_token = otp
    user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES)
    user.last_verification_sent_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()

    try:
        send_otp_email(user.email, otp)
    except Exception as e:
        print(f"Warning: failed to resend OTP email: {e}")

    return {"message": "Da gui lai ma OTP"}


@router.get("/me", response_model=UserOut)
async def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
async def update_current_user(
    data: UpdateMeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.full_name is not None:
        current_user.full_name = data.full_name

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/password/set")
async def set_password(
    payload: PasswordSetIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Mat khau da duoc thiet lap"}


@router.post("/password/change")
async def change_password(
    payload: PasswordChangeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mat khau hien tai khong dung")

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Mat khau da duoc cap nhat"}


@router.get("/unsubscribe")
async def unsubscribe_confirm_page(email: str, token: str, db: Session = Depends(get_db)):
    if not is_valid_unsubscribe_token(email, token):
        raise HTTPException(status_code=400, detail="Yeu cau huy dang ky khong hop le")

    user = db.query(User).filter(User.email == email).first()
    return {
        "message": "Vui long gui POST /api/auth/unsubscribe de xac nhan huy dang ky",
        "email": email,
        "is_subscribed": bool(user.is_subscribed) if user else False,
    }


@router.post("/unsubscribe")
async def unsubscribe(payload: UnsubscribeIn, db: Session = Depends(get_db)):
    if not is_valid_unsubscribe_token(payload.email, payload.token):
        raise HTTPException(status_code=400, detail="Yeu cau huy dang ky khong hop le")

    user = db.query(User).filter(User.email == payload.email).first()
    updated = False
    if user:
        updated = bool(user.is_subscribed)
        user.is_subscribed = False
        db.add(user)
        db.commit()

    newsletter_service.clear_push_tokens(payload.email)

    return {
        "message": "Da huy dang ky nhan email",
        "email": payload.email,
        "updated": updated,
        "webpush_tokens_cleared": True,
    }


@router.get("/push/config", response_model=PushConfigOut)
async def get_push_config():
    return {
        "newsletter_enabled": newsletter_service.is_newsletter_enabled(),
        "webpush_enabled": newsletter_service.is_webpush_channel_enabled(),
    }


@router.post("/push/register", response_model=PushTokenOut)
async def register_push_token(payload: PushTokenIn, current_user: User = Depends(get_current_user)):
    if not current_user.is_subscribed:
        raise HTTPException(status_code=400, detail="User already unsubscribed")

    tokens = newsletter_service.register_push_token(current_user.email, payload.token)
    return {
        "message": "Push token registered",
        "tokens": tokens,
    }


@router.post("/push/unregister", response_model=PushTokenOut)
async def unregister_push_token(payload: PushTokenIn, current_user: User = Depends(get_current_user)):
    tokens = newsletter_service.unregister_push_token(current_user.email, payload.token)
    return {
        "message": "Push token unregistered",
        "tokens": tokens,
    }
