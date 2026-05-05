from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query, Body
from fastapi.responses import FileResponse
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os
import uuid
import json
import base64
from app.db.session import get_db
from app.models.user import User
from app.models.role import Role
from app.models.publication import ContentType, Event, Publication, SocialScale, StaffProfile, Story, Submission, EventAttachment, StaffReaction, Comment
from app.models.media import MediaAsset
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
    EventAttachmentCreate,
    EventAttachmentOut,
    EventOccurrenceOut,
    SocialScaleCreate,
    SocialScaleOut,
    StaffProfileCreate,
    StaffProfileOut,
    StoryCreate,
    StoryOut,
    UserOut, UserUpdate, 
    PublicationOut, PublicationCreate, PublicationDraft, StoryDraft, EventDraft,
    SubmissionOut, DashboardStats, SubmissionStatusUpdate,
    AdminOverview,
    AdminActivityItem,
    AIKnowledgeAssetOut,
    AIKnowledgeUploadOut,
    AdminCommentOut,
    RoleCreate,
    RoleOut,
    NewsletterDispatchIn,
    NewsletterDispatchOut,
)
from typing import List, Optional
import logging
import re
from io import BytesIO
try:
    from PIL import Image, ImageFile, ImageOps
    ImageFile.LOAD_TRUNCATED_IMAGES = True
    _PIL_AVAILABLE = True
except Exception:
    Image = None
    ImageFile = None
    ImageOps = None
    _PIL_AVAILABLE = False

logger = logging.getLogger(__name__)

# Try to use dateutil for full RRULE support; fall back to a minimal parser if not available
try:
    from dateutil.rrule import rrulestr  # type: ignore
    DATEUTIL_AVAILABLE = True
except Exception:
    DATEUTIL_AVAILABLE = False

try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None

router = APIRouter()

PUBLICATION_UPLOAD_DIR = Path(os.getenv("PUBLICATION_UPLOAD_DIR", "/data/WebNgoaiKhoa/backend/uploads/publications"))
PUBLICATION_MAX_UPLOAD_SIZE = int(os.getenv("PUBLICATION_MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))
IMAGE_UPLOAD_DIR = Path(os.getenv("IMAGE_UPLOAD_DIR", "/data/WebNgoaiKhoa/backend/uploads/images"))
IMAGE_MAX_UPLOAD_SIZE = int(os.getenv("IMAGE_MAX_UPLOAD_BYTES", str(12 * 1024 * 1024)))
IMAGE_TARGET_MAX_UPLOAD_BYTES = int(os.getenv("IMAGE_TARGET_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
IMAGE_VARIANTS_DIR = Path(os.getenv("IMAGE_VARIANTS_DIR", str(IMAGE_UPLOAD_DIR / ".variants")))
STAFF_PREWARM_WIDTHS = (240, 320, 480, 640)
SITE_TEXTS_FILE = Path(os.getenv("SITE_TEXTS_FILE", "/data/WebNgoaiKhoa/backend/app/site_texts.json"))
VIDEO_UPLOAD_DIR = Path(os.getenv("VIDEO_UPLOAD_DIR", "/data/WebNgoaiKhoa/backend/uploads/videos"))
VIDEO_MAX_UPLOAD_SIZE = int(os.getenv("VIDEO_MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))
ALLOWED_SUBJECTS = {item.value for item in ai_module.Category} if hasattr(ai_module, "Category") else {"van", "ktpl", "lich-su", "dia-li", "vovinam", "ngoaikhoa"}


def _sync_ai_knowledge_if_possible(db: Session):
    try:
        ai_module._sync_knowledge_base(db)
    except Exception:
        # Avoid blocking admin CRUD if vector sync fails temporarily.
        pass


def _is_missing_staff_reactions_error(exc: Exception) -> bool:
    error_message = str(exc).lower()
    return "staff_reactions" in error_message or "no such table" in error_message or "doesn't exist" in error_message


def _ensure_staff_reactions_table(db: Session) -> None:
    bind = db.get_bind()
    StaffReaction.__table__.create(bind=bind, checkfirst=True)


def _extract_filenames_from_text(text: Optional[str]) -> set:
    filenames = set()
    if not text:
        return filenames
    try:
        # match /api/public/uploads/images/<name>, /api/uploads/images/<name> or /uploads/images/<name> and absolute URLs
        for m in re.finditer(r"(?:https?://[^\s'\"]+)?/api/(?:public/)?uploads/images/([A-Za-z0-9._-]+)", text):
            filenames.add(m.group(1))
        for m in re.finditer(r"(?:https?://[^\s'\"]+)?/(?:public/)?uploads/images/([A-Za-z0-9._-]+)", text):
            filenames.add(m.group(1))
    except Exception:
        pass
    return filenames


def _collect_images_from_metadata(value) -> set:
    files = set()
    if value is None:
        return files
    if isinstance(value, str):
        files |= _extract_filenames_from_text(value)
    elif isinstance(value, dict):
        for v in value.values():
            files |= _collect_images_from_metadata(v)
    elif isinstance(value, list):
        for v in value:
            files |= _collect_images_from_metadata(v)
    else:
        try:
            files |= _extract_filenames_from_text(str(value))
        except Exception:
            pass
    return files


def _delete_image_files(filenames: set):
    # NOTE: kept for backward-compatibility; prefer using _delete_image_files_if_unreferenced
    if not filenames:
        return
    IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    for fname in filenames:
        try:
            safe_name = Path(fname).name
            target = IMAGE_UPLOAD_DIR / safe_name
            if target.exists() and target.is_file():
                target.unlink()
                logger.info(f"Deleted uploaded image file: {target}")
        except Exception as exc:
            logger.warning(f"Failed to delete image {fname}: {exc}")


def _is_image_referenced(safe_name: str, db: Session) -> bool:
    """Return True if any DB row references the given filename (safe_name).

    Match by substring in common text fields and by inspecting JSON layout metadata.
    """
    if not safe_name:
        return False
    like_pattern = f"%{safe_name}%"

    try:
        # Publications
        if db.query(Publication).filter(Publication.image_url != None, Publication.image_url.like(like_pattern)).count() > 0:
            return True
        if db.query(Publication).filter(Publication.content.like(like_pattern)).count() > 0:
            return True
        pubs = db.query(Publication).filter(Publication.layout_metadata != None).all()
        for p in pubs:
            if p.layout_metadata and safe_name in str(p.layout_metadata):
                return True

        # Stories
        if db.query(Story).filter(Story.image_url != None, Story.image_url.like(like_pattern)).count() > 0:
            return True
        if db.query(Story).filter(Story.content.like(like_pattern)).count() > 0:
            return True
        stories = db.query(Story).filter(Story.layout_metadata != None).all()
        for s in stories:
            if s.layout_metadata and safe_name in str(s.layout_metadata):
                return True

        # Events
        if db.query(Event).filter(Event.image_url != None, Event.image_url.like(like_pattern)).count() > 0:
            return True
        if db.query(Event).filter(Event.description.like(like_pattern)).count() > 0:
            return True

        # Staff profiles
        if db.query(StaffProfile).filter(StaffProfile.image_url != None, StaffProfile.image_url.like(like_pattern)).count() > 0:
            return True

    except Exception:
        # On unexpected DB errors, be conservative and treat as referenced to avoid accidental deletion.
        logger.exception("DB error while checking image references; skipping delete")
        return True

    return False


def _delete_image_files_if_unreferenced(filenames: set, db: Session):
    if not filenames:
        return
    IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    for fname in filenames:
        try:
            safe_name = Path(fname).name
            # If any other DB row references this filename, skip deletion
            if _is_image_referenced(safe_name, db):
                logger.info(f"Skipping deletion of {safe_name}: still referenced by other content")
                continue

            target = IMAGE_UPLOAD_DIR / safe_name
            if target.exists() and target.is_file():
                target.unlink()
                logger.info(f"Deleted uploaded image file: {target}")

            # Keep media library in sync: remove stale asset row too.
            try:
                asset = db.query(MediaAsset).filter(MediaAsset.stored_name == safe_name).first()
                if asset:
                    db.delete(asset)
                    db.commit()
                    logger.info(f"Deleted MediaAsset row for image: {safe_name}")
            except Exception:
                db.rollback()
                logger.exception("Failed to delete MediaAsset row for image: %s", safe_name)
        except Exception as exc:
            logger.warning(f"Failed to delete image {fname}: {exc}")


def _collect_homepage_image_files(payload: Optional[dict]) -> set:
    if not isinstance(payload, dict):
        return set()
    return _collect_images_from_metadata(payload)


def _extract_publication_filenames_from_text(text: Optional[str]) -> set:
    filenames = set()
    if not text:
        return filenames
    try:
        # match /api/admin/publications/files/<name> and similar public paths
        for m in re.finditer(r"(?:https?://[^\s'\"]+)?/api/(?:admin/)?publications/files/([A-Za-z0-9._-]+)", text):
            filenames.add(m.group(1))
        for m in re.finditer(r"(?:https?://[^\s'\"]+)?/(?:public/)?uploads/publications/([A-Za-z0-9._-]+)", text):
            filenames.add(m.group(1))
    except Exception:
        pass
    return filenames


def _collect_publication_files_from_metadata(value) -> set:
    files = set()
    if value is None:
        return files
    if isinstance(value, str):
        files |= _extract_publication_filenames_from_text(value)
    elif isinstance(value, dict):
        for v in value.values():
            files |= _collect_publication_files_from_metadata(v)
    elif isinstance(value, list):
        for v in value:
            files |= _collect_publication_files_from_metadata(v)
    else:
        try:
            files |= _extract_publication_filenames_from_text(str(value))
        except Exception:
            pass
    return files


def _is_publication_file_referenced(safe_name: str, db: Session) -> bool:
    """Return True if any DB row references the given publication-upload filename (safe_name).

    Conservative: on DB errors return True to avoid accidental deletion.
    """
    if not safe_name:
        return False
    like_pattern = f"%{safe_name}%"

    try:
        # Publications
        if db.query(Publication).filter(Publication.content.like(like_pattern)).count() > 0:
            return True
        pubs = db.query(Publication).filter(Publication.layout_metadata != None).all()
        for p in pubs:
            if p.layout_metadata and safe_name in str(p.layout_metadata):
                return True

        # Stories
        if db.query(Story).filter(Story.content.like(like_pattern)).count() > 0:
            return True
        stories = db.query(Story).filter(Story.layout_metadata != None).all()
        for s in stories:
            if s.layout_metadata and safe_name in str(s.layout_metadata):
                return True

        # Events
        if db.query(Event).filter(Event.description.like(like_pattern)).count() > 0:
            return True

        # Event attachments
        if db.query(EventAttachment).filter(EventAttachment.file_url != None, EventAttachment.file_url.like(like_pattern)).count() > 0:
            return True

        # Submissions (attachments)
        if db.query(Submission).filter(Submission.attachment_url != None, Submission.attachment_url.like(like_pattern)).count() > 0:
            return True

    except Exception:
        logger.exception("DB error while checking publication file references; skipping delete")
        return True

    return False


def _delete_publication_files_if_unreferenced(filenames: set, db: Session):
    if not filenames:
        return
    PUBLICATION_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    for fname in filenames:
        try:
            safe_name = Path(fname).name
            # If any other DB row references this filename, skip deletion
            if _is_publication_file_referenced(safe_name, db):
                logger.info(f"Skipping deletion of {safe_name}: still referenced by other content")
                continue

            target = PUBLICATION_UPLOAD_DIR / safe_name
            if target.exists() and target.is_file():
                target.unlink()
                logger.info(f"Deleted uploaded publication file: {target}")
        except Exception as exc:
            logger.warning(f"Failed to delete publication file {fname}: {exc}")


def _try_save_image_to_bytes(img, fmt: str, **save_kwargs) -> bytes:
    buf = BytesIO()
    img.save(buf, format=fmt, **save_kwargs)
    return buf.getvalue()


def _is_resizable_image_ext(ext: str) -> bool:
    return (ext or "").lower().lstrip(".") in {"jpg", "jpeg", "png", "webp"}


def _build_variant_filename(source_name: str, width: int, fmt: str) -> str:
    stem = Path(source_name).stem
    safe_fmt = (fmt or "webp").lower()
    return f"{stem}__w{int(width)}.{safe_fmt}"


def _extract_image_metadata(payload: bytes, ext: str) -> tuple[Optional[int], Optional[int], Optional[dict]]:
    if not payload or not _PIL_AVAILABLE:
        return None, None, None
    if (ext or "").lower() == ".svg":
        return None, None, None

    try:
        with Image.open(BytesIO(payload)) as img:
            img = ImageOps.exif_transpose(img)
            width, height = img.size

            metadata_json = None
            if _is_resizable_image_ext(ext):
                tiny = img.convert("RGB")
                tiny.thumbnail((24, 24), Image.LANCZOS)
                b = BytesIO()
                tiny.save(b, format="JPEG", quality=35, optimize=True)
                blur = base64.b64encode(b.getvalue()).decode("ascii")
                metadata_json = {"blur_placeholder": f"data:image/jpeg;base64,{blur}"}

            return width, height, metadata_json
    except Exception:
        return None, None, None


def _prewarm_staff_image_variants(target: Path, ext: str, widths: tuple[int, ...] = STAFF_PREWARM_WIDTHS) -> None:
    if not _PIL_AVAILABLE or not _is_resizable_image_ext(ext):
        return
    if not target.exists() or not target.is_file():
        return

    try:
        IMAGE_VARIANTS_DIR.mkdir(parents=True, exist_ok=True)
        with Image.open(str(target)) as img:
            img = ImageOps.exif_transpose(img).convert("RGB")
            for width in widths:
                safe_width = max(64, min(int(width), 2048))
                variant_path = IMAGE_VARIANTS_DIR / _build_variant_filename(target.name, safe_width, "webp")
                if variant_path.exists() and variant_path.is_file() and variant_path.stat().st_mtime >= target.stat().st_mtime:
                    continue

                out = img
                if img.width > safe_width:
                    ratio = safe_width / float(img.width)
                    out_h = max(1, int(img.height * ratio))
                    out = img.resize((safe_width, out_h), Image.LANCZOS)
                out.save(str(variant_path), format="WEBP", quality=80, method=6)
    except Exception:
        logger.exception("Failed to prewarm staff image variants for %s", target.name)


def _compress_image_bytes(payload: bytes, ext: str, max_bytes: int) -> Optional[bytes]:
    """Try to compress image bytes to be <= max_bytes. Returns compressed bytes or None."""
    if not payload:
        return None
    if len(payload) <= max_bytes:
        return payload
    if not _PIL_AVAILABLE:
        return None
    try:
        im = Image.open(BytesIO(payload))
    except Exception:
        return None

    # Apply EXIF orientation fix before any compression operations so the
    # resulting image pixels are in the correct orientation (prevents
    # uploads appearing rotated in the browser).
    try:
        if _PIL_AVAILABLE and ImageOps is not None:
            try:
                im = ImageOps.exif_transpose(im)
            except Exception:
                # Non-fatal: proceed without transpose if it fails
                pass
    except Exception:
        pass
    orig_size = len(payload)
    ext = ext.lower().lstrip('.')

    # JPEG-like compression
    if ext in ('jpg', 'jpeg'):
        rgb = im.convert('RGB')
        widths = [1.0, 0.9, 0.8, 0.7, 0.6]
        qualities = [85, 75, 65, 55, 45, 35, 25]
        best = None
        best_size = orig_size
        for scale in widths:
            candidate = rgb if scale == 1.0 else rgb.resize((max(1, int(rgb.width * scale)), max(1, int(rgb.height * scale))), Image.LANCZOS)
            for q in qualities:
                try:
                    data = _try_save_image_to_bytes(candidate, 'JPEG', quality=q, optimize=True, progressive=True)
                except Exception:
                    continue
                if len(data) <= max_bytes:
                    return data
                if len(data) < best_size:
                    best = data
                    best_size = len(data)
        if best and best_size < orig_size:
            return best
        return None

    # PNG compression (try quantize, then fallback to JPEG if no alpha)
    if ext == 'png':
        has_alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
        widths = [1.0, 0.9, 0.8, 0.7, 0.6]
        palettes = [256, 128, 64, 32, 16, 8]
        best = None
        best_size = orig_size
        for scale in widths:
            candidate = im if scale == 1.0 else im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
            for colors in palettes:
                try:
                    if has_alpha:
                        converted = candidate.convert('RGBA')
                        quant = converted.quantize(colors=colors, method=Image.MEDIANCUT)
                        data = _try_save_image_to_bytes(quant, 'PNG', optimize=True)
                    else:
                        converted = candidate.convert('RGB')
                        quant = converted.quantize(colors=colors, method=Image.MEDIANCUT)
                        data = _try_save_image_to_bytes(quant, 'PNG', optimize=True)
                except Exception:
                    continue
                if len(data) <= max_bytes:
                    return data
                if len(data) < best_size:
                    best = data
                    best_size = len(data)
        # If no alpha, try converting to JPEG as a last resort
        if not has_alpha:
            rgb = im.convert('RGB')
            widths = [1.0, 0.9, 0.8, 0.7]
            qualities = [85, 75, 65, 55, 45, 35, 25]
            for scale in widths:
                candidate = rgb if scale == 1.0 else rgb.resize((max(1, int(rgb.width * scale)), max(1, int(rgb.height * scale))), Image.LANCZOS)
                for q in qualities:
                    try:
                        data = _try_save_image_to_bytes(candidate, 'JPEG', quality=q, optimize=True, progressive=True)
                    except Exception:
                        continue
                    if len(data) <= max_bytes:
                        return data
                    if len(data) < best_size:
                        best = data
                        best_size = len(data)
        if best and best_size < orig_size:
            return best
        return None

    # WEBP attempt
    if ext in ('webp',):
        rgb = im.convert('RGB')
        widths = [1.0, 0.9, 0.8, 0.7]
        qualities = [85, 75, 65, 55, 45, 35, 25]
        best = None
        best_size = orig_size
        for scale in widths:
            candidate = rgb if scale == 1.0 else rgb.resize((max(1, int(rgb.width * scale)), max(1, int(rgb.height * scale))), Image.LANCZOS)
            for q in qualities:
                try:
                    data = _try_save_image_to_bytes(candidate, 'WEBP', quality=q, method=6)
                except Exception:
                    continue
                if len(data) <= max_bytes:
                    return data
                if len(data) < best_size:
                    best = data
                    best_size = len(data)
        if best and best_size < orig_size:
            return best
        return None

    # Unsupported for compression (svg, avif, gif etc.) — return None
    return None


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

    # Use single canonical `subject` for DB writes. Accept legacy `category` in payload.
    payload["subject"] = subject
    # Remove legacy key to avoid passing unknown columns to constructors; model provides alias.
    payload.pop("category", None)
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


@router.post("/uploads/images")
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_website_manager),
    context: Optional[str] = Query(None),
):
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()
    allowed_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"}
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng ảnh: jpg, png, gif, webp, avif, svg")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Tệp ảnh rỗng")

    # First, fix EXIF orientation if Pillow is available
    if _PIL_AVAILABLE:
        try:
            from PIL import ImageOps
            im = Image.open(BytesIO(payload))
            im = ImageOps.exif_transpose(im)
            fmt = None
            save_kwargs = {}
            if ext in (".jpg", ".jpeg"):
                fmt = "JPEG"
                save_kwargs = {"quality": 95, "optimize": True, "progressive": True}
            elif ext == ".png":
                fmt = "PNG"
                save_kwargs = {"optimize": True}
            elif ext in (".webp",):
                fmt = "WEBP"
                save_kwargs = {"quality": 95, "method": 6}
            else:
                fmt = im.format or "JPEG"
            try:
                buf = BytesIO()
                im.save(buf, format=fmt, **save_kwargs)
                payload = buf.getvalue()
            except Exception:
                # If saving fails, continue with original payload
                pass
        except Exception:
            # Ignore EXIF fix failures and continue
            pass

    # Determine compression threshold per upload context:
    # - 'doingu' and 'cover': compress to 5MB if larger (staff/cover flows)
    # - 'cms-editor': compress to 15MB if larger (CMS editor image uploads)
    # - others (including no context): compress to 10MB if larger
    compress_threshold = None
    if context in ('doingu', 'cover'):
        compress_threshold = 2.5 * 1024 * 1024  # 5 MB
    elif context == 'cms-editor':
        compress_threshold = 15 * 1024 * 1024  # 15 MB
    else:
        compress_threshold = 10 * 1024 * 1024  # 10 MB

    if compress_threshold and len(payload) > compress_threshold:
        compressed = _compress_image_bytes(payload, ext, compress_threshold)
        if compressed is None:
            raise HTTPException(status_code=400, detail="Tệp ảnh vượt quá dung lượng cho phép")
        payload = compressed

    # Final safety check against configured max — ensure we allow at least the
    # compression threshold for the given context so compression can occur.
    allowed_max = max(IMAGE_MAX_UPLOAD_SIZE, compress_threshold or 0)
    if len(payload) > allowed_max:
        raise HTTPException(status_code=400, detail="Tệp ảnh vượt quá dung lượng cho phép")

    IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    target = IMAGE_UPLOAD_DIR / stored_name
    target.write_bytes(payload)

    width, height, metadata_json = _extract_image_metadata(payload, ext)

    # For staff flow, pre-generate responsive WEBP variants so first public load is instant.
    if context == 'doingu':
        _prewarm_staff_image_variants(target, ext)

    # Create DB-backed media asset entry
    try:
        asset = MediaAsset(
            id=uuid.uuid4().hex,
            stored_name=stored_name,
            original_name=filename,
            file_type=ext.lstrip('.'),
            size_bytes=len(payload),
            uploaded_by=admin.id if admin else None,
            width=width,
            height=height,
            metadata_json=metadata_json,
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
    except Exception:
        # If DB insert fails, do not block upload — return minimal response
        logger.exception("Failed to create MediaAsset DB row")
        asset = None

    # Return the public-facing URL where images are served from the public router
    resp = {
        "url": f"/api/public/uploads/images/{stored_name}",
        "file_name": filename,
        "size_bytes": len(payload),
    }
    if asset:
        resp["asset_id"] = asset.id
    return resp


@router.get("/uploads/images")
async def list_uploaded_images_compat(
    context: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_website_manager),
):
    """Compatibility GET endpoint for clients that hit the upload path directly."""
    query = db.query(MediaAsset).filter(
        (MediaAsset.file_type.is_(None)) | (func.lower(MediaAsset.file_type) != "pdf")
    )
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            (MediaAsset.original_name.ilike(term))
            | (MediaAsset.stored_name.ilike(term))
        )

    items = query.order_by(MediaAsset.uploaded_at.desc()).limit(limit).all()
    return {
        "context": context,
        "method": "GET",
        "upload_method": "POST",
        "items": [
            {
                "id": item.id,
                "stored_name": item.stored_name,
                "original_name": item.original_name,
                "file_type": item.file_type,
                "size_bytes": item.size_bytes,
                "uploaded_at": item.uploaded_at,
                "url": f"/api/public/uploads/images/{item.stored_name}",
            }
            for item in items
        ],
    }


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


def _load_site_texts_payload() -> dict:
    if not SITE_TEXTS_FILE.exists():
        return {}
    try:
        return json.loads(SITE_TEXTS_FILE.read_text(encoding="utf-8"))
    except Exception:
        logger.exception("Failed to read site_texts.json")
        return {}


def _save_site_texts_payload(payload: dict) -> None:
    SITE_TEXTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SITE_TEXTS_FILE.write_text(
        json.dumps(payload or {}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _cleanup_homepage_removed_images(old_payload: dict, new_payload: dict, db: Session) -> None:
    try:
        old_files = _collect_homepage_image_files(old_payload)
        new_files = _collect_homepage_image_files(new_payload)
        removed_files = old_files - new_files
        if removed_files:
            _delete_image_files_if_unreferenced(removed_files, db)
    except Exception:
        logger.exception("Failed to cleanup removed homepage images")


# --- Homepage CMS Management ---

@router.get("/homepage")
async def admin_get_homepage(
    admin: User = Depends(get_current_website_manager),
):
    return _load_site_texts_payload()


@router.put("/homepage")
async def admin_put_homepage(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_website_manager),
):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload must be a JSON object")
    old_payload = _load_site_texts_payload()
    _save_site_texts_payload(payload)
    _cleanup_homepage_removed_images(old_payload, payload, db)
    return payload


@router.post("/homepage/videos/upload")
async def admin_upload_homepage_video(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_website_manager),
):
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()
    allowed_exts = {".mp4", ".webm", ".ogg", ".mov"}
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng video: mp4, webm, ogg, mov")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Tệp video rỗng")
    if len(payload) > VIDEO_MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="Tệp video vượt quá dung lượng cho phép")

    VIDEO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    target = VIDEO_UPLOAD_DIR / stored_name
    target.write_bytes(payload)

    return {
        "url": f"/api/public/uploads/videos/{stored_name}",
        "file_name": filename,
        "size_bytes": len(payload),
    }


# Backward compatibility for older clients still calling /site-texts.
@router.get("/site-texts")
async def admin_get_site_texts(
    admin: User = Depends(get_current_website_manager),
):
    return _load_site_texts_payload()


@router.put("/site-texts")
async def admin_put_site_texts(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_website_manager),
):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload must be a JSON object")
    old_payload = _load_site_texts_payload()
    _save_site_texts_payload(payload)
    _cleanup_homepage_removed_images(old_payload, payload, db)
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
        subjects: Optional[List[str]] = Query(None),
        content_type: Optional[str] = Query(None),
        created_from: Optional[str] = Query(None),
        created_to: Optional[str] = Query(None),
        q: Optional[str] = Query(None),
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_website_manager),
):
        query = db.query(Publication)

        # Support both single `subject` (legacy) and multiple `subjects` (modern multi-select).
        if subjects:
            # subjects may be provided as repeated query params or as comma-separated values
            expanded = []
            for s in subjects:
                if not s:
                    continue
                # split comma-separated single values
                parts = [p for p in re.split(r"\s*,\s*", s) if p]
                expanded.extend(parts)
            # validate
            for s in expanded:
                if s not in ALLOWED_SUBJECTS:
                    raise HTTPException(status_code=400, detail=f"Invalid subject: {s}")
            if expanded:
                query = query.filter(Publication.subject.in_(expanded))
        elif subject:
            if subject not in ALLOWED_SUBJECTS:
                    raise HTTPException(status_code=400, detail="Invalid subject")
            query = query.filter(Publication.subject == subject)

        if content_type:
            valid_content_types = {item.value for item in ContentType}
            if content_type not in valid_content_types:
                    raise HTTPException(status_code=400, detail="Invalid content type")
            query = query.filter(Publication.content_type == content_type)

        # Parse created_from / created_to accepting ISO date, YYYY-MM-DD, or epoch seconds/ms
        def _parse_dt(v: Optional[str]):
            if not v:
                return None
            v = str(v)
            # integer timestamps
            if re.match(r"^\d+$", v):
                n = int(v)
                # heuristic: >1e12 treat as ms
                if n > 1e12:
                    return datetime.fromtimestamp(n / 1000.0, tz=timezone.utc)
                # seconds epoch
                return datetime.fromtimestamp(n, tz=timezone.utc)
            # try ISO / YYYY-MM-DD
            try:
                # datetime.fromisoformat handles YYYY-MM-DD and full ISO strings
                dt = datetime.fromisoformat(v)
                if dt.tzinfo is None:
                    return dt.replace(tzinfo=timezone.utc)
                return dt
            except Exception:
                try:
                    dt = datetime.strptime(v, "%Y-%m-%d")
                    return dt.replace(tzinfo=timezone.utc)
                except Exception:
                    raise HTTPException(status_code=422, detail=f"Invalid date format: {v}")

        dt_from = _parse_dt(created_from)
        dt_to = _parse_dt(created_to)
        if dt_from:
            query = query.filter(Publication.created_at >= dt_from)
        if dt_to:
            query = query.filter(Publication.created_at <= dt_to)

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
        title=f"[Tổ Xã Hội] Mới: {new_pub.title}",
        body="Đã có ấn phẩm/tài liệu mới trên hệ thống. Hãy truy cập để xem chi tiết.",
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
    # Capture referenced uploaded files before change so we can remove orphans later
    try:
        old_files = set()
        old_files |= _extract_publication_filenames_from_text(pub.content)
        old_files |= _collect_publication_files_from_metadata(pub.layout_metadata)
        old_files |= _extract_publication_filenames_from_text(getattr(pub, 'image_url', None) or '')
    except Exception:
        old_files = set()

    payload = normalize_publication_payload(pub_update)
    for key, value in payload.items():
        setattr(pub, key, value)

    db.commit()
    db.refresh(pub)

    # After update, delete any previously-referenced uploaded files that are no longer referenced
    try:
        new_files = set()
        new_files |= _extract_publication_filenames_from_text(pub.content)
        new_files |= _collect_publication_files_from_metadata(pub.layout_metadata)
        new_files |= _extract_publication_filenames_from_text(getattr(pub, 'image_url', None) or '')

        removed = old_files - new_files
        if removed:
            _delete_publication_files_if_unreferenced(removed, db)
    except Exception:
        logger.exception("Error while cleaning up orphaned publication files after update")

    _sync_ai_knowledge_if_possible(db)
    return pub


@router.patch("/publications/{pub_id}/draft", response_model=PublicationOut)
async def save_publication_draft(pub_id: int, draft: PublicationDraft, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    # Only update provided fields; do not trigger notifications or AI sync here.
    try:
        for field in ("title", "content", "layout_metadata", "category", "subject", "content_type", "featured_year", "image_url", "is_published"):
            if hasattr(draft, field):
                val = getattr(draft, field)
                if val is not None:
                    setattr(pub, field, val)
        db.commit()
        db.refresh(pub)
    except Exception:
        logger.exception("Error saving publication draft")
        raise HTTPException(status_code=500, detail="Could not save draft")

    return pub


@router.patch("/stories/{story_id}/draft", response_model=StoryOut)
async def save_story_draft(story_id: int, draft: StoryDraft, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    try:
        for field in ("title", "content", "layout_metadata", "snippet", "author", "category", "image_url", "read_time_minutes", "is_published"):
            if hasattr(draft, field):
                val = getattr(draft, field)
                if val is not None:
                    setattr(story, field, val)
        db.commit()
        db.refresh(story)
    except Exception:
        logger.exception("Error saving story draft")
        raise HTTPException(status_code=500, detail="Could not save draft")

    return story


@router.patch("/events/{event_id}/draft", response_model=EventOut)
async def save_event_draft(event_id: int, draft: EventDraft, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    try:
        for field in ("title", "description", "layout_metadata", "event_date", "rrule", "timezone", "location", "image_url", "status", "linked_post_id"):
            if hasattr(draft, field):
                val = getattr(draft, field)
                if val is not None:
                    setattr(event, field, val)
        db.commit()
        db.refresh(event)
    except Exception:
        logger.exception("Error saving event draft")
        raise HTTPException(status_code=500, detail="Could not save draft")

    return event


@router.delete("/publications/{pub_id}")
async def delete_publication(pub_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    # Collect uploaded image filenames referenced by this publication
    to_delete = set()
    to_delete |= _extract_filenames_from_text(pub.image_url)
    to_delete |= _extract_filenames_from_text(pub.content)
    to_delete |= _collect_images_from_metadata(pub.layout_metadata)
    # Collect uploaded publication file (PDF) names referenced by this publication
    to_delete_files = set()
    to_delete_files |= _extract_publication_filenames_from_text(pub.content)
    to_delete_files |= _collect_publication_files_from_metadata(pub.layout_metadata)
    to_delete_files |= _extract_publication_filenames_from_text(getattr(pub, 'image_url', None) or '')

    db.delete(pub)
    db.commit()
    _sync_ai_knowledge_if_possible(db)

    # Best-effort: remove uploaded image files after DB delete
    try:
        _delete_image_files_if_unreferenced(to_delete, db)
    except Exception:
        logger.exception("Error while deleting publication images")
    # Best-effort: remove uploaded publication files (PDFs) after DB delete
    try:
        _delete_publication_files_if_unreferenced(to_delete_files, db)
    except Exception:
        logger.exception("Error while deleting publication files")
    return {"message": "Publication deleted"}


@router.post("/publications/upload-pdf")
async def upload_publication_pdf(file: UploadFile = File(...), db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
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
    # Create DB-backed media asset entry for the PDF
    try:
        asset = MediaAsset(
            id=uuid.uuid4().hex,
            stored_name=stored_name,
            original_name=filename,
            file_type='pdf',
            size_bytes=len(payload),
            uploaded_by=admin.id if admin else None,
        )
        # Use a DB session if available
        try:
            db.add(asset)
            db.commit()
            db.refresh(asset)
        except Exception:
            logger.exception("Failed to create MediaAsset DB row for PDF")
            asset = None
    except Exception:
        asset = None

    resp = {
        "url": f"/api/admin/publications/files/{stored_name}",
        "file_name": filename,
        "size_bytes": len(payload),
    }
    if asset:
        resp["asset_id"] = asset.id
    return resp


@router.get("/publications/files/{filename}")
async def get_publication_pdf_file(filename: str):
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    safe_name = Path(filename).name
    target = PUBLICATION_UPLOAD_DIR / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path=str(target), media_type="application/pdf", filename=safe_name)


@router.get("/media/assets")
async def list_media_assets(
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_website_manager),
):
    query = db.query(MediaAsset)
    if q:
        term = f"%{q.strip()}%"
        query = query.filter((MediaAsset.original_name.ilike(term)) | (MediaAsset.stored_name.ilike(term)))

    total = query.count()
    items = query.order_by(MediaAsset.uploaded_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    results = []
    for a in items:
        url = f"/api/public/uploads/images/{a.stored_name}"
        if a.file_type and a.file_type.lower() == 'pdf':
            url = f"/api/admin/publications/files/{a.stored_name}"
        results.append({
            "id": a.id,
            "stored_name": a.stored_name,
            "original_name": a.original_name,
            "file_type": a.file_type,
            "size_bytes": a.size_bytes,
            "uploaded_by": a.uploaded_by,
            "uploaded_at": a.uploaded_at,
            "alt_text": a.alt_text,
            "caption": a.caption,
            "url": url,
        })

    return {"total": total, "page": page, "per_page": per_page, "items": results}


@router.delete("/media/assets/{asset_id}")
async def delete_media_asset(asset_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    safe_name = Path(asset.stored_name).name
    # If referenced anywhere, block deletion
    if _is_image_referenced(safe_name, db) or _is_publication_file_referenced(safe_name, db):
        raise HTTPException(status_code=400, detail="Asset is still referenced by content")

    # Delete file on disk
    target = PUBLICATION_UPLOAD_DIR / safe_name if (asset.file_type and asset.file_type.lower() == 'pdf') else IMAGE_UPLOAD_DIR / safe_name
    try:
        if target.exists() and target.is_file():
            target.unlink()
            logger.info(f"Deleted media asset file: {target}")
    except Exception:
        logger.exception("Failed to delete media file on disk")

    # Delete DB row
    try:
        db.delete(asset)
        db.commit()
    except Exception:
        logger.exception("Failed to delete MediaAsset DB row")
        raise HTTPException(status_code=500, detail="Failed to delete asset")

    return {"message": "Deleted", "id": asset_id}


def _prune_unreferenced_media(grace_hours: int, db: Session) -> dict:
    """Prune media assets that are unreferenced and older than grace_hours.

    Returns a summary dict with keys: checked, deleted.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=grace_hours)
    assets = db.query(MediaAsset).filter(MediaAsset.uploaded_at <= cutoff).all()
    checked = len(assets)
    deleted = 0
    for a in assets:
        safe_name = Path(a.stored_name).name
        try:
            # Determine reference check based on file type
            if a.file_type and a.file_type.lower() == 'pdf':
                referenced = _is_publication_file_referenced(safe_name, db)
            else:
                referenced = _is_image_referenced(safe_name, db)

            if referenced:
                continue

            # Delete file from disk
            target = PUBLICATION_UPLOAD_DIR / safe_name if (a.file_type and a.file_type.lower() == 'pdf') else IMAGE_UPLOAD_DIR / safe_name
            try:
                if target.exists() and target.is_file():
                    target.unlink()
                    logger.info(f"Pruned media file: {target}")
            except Exception:
                logger.exception("Failed to delete media file on disk during prune: %s", target)

            # Delete DB row
            try:
                db.delete(a)
                db.commit()
                deleted += 1
            except Exception:
                logger.exception("Failed to delete MediaAsset DB row during prune: %s", a.id)
                db.rollback()
        except Exception:
            logger.exception("Error while pruning media asset %s", a.id)
            try:
                db.rollback()
            except Exception:
                pass

    return {"checked": checked, "deleted": deleted}


@router.post("/media/assets/prune")
async def prune_media_assets_endpoint(grace_hours: int = Query(24, ge=0), db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    summary = _prune_unreferenced_media(grace_hours, db)
    return summary


@router.post("/media/assets")
async def create_media_asset(file: UploadFile = File(...), db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty file")

    # Choose storage dir based on extension
    if ext == '.pdf':
        PUBLICATION_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid.uuid4().hex}.pdf"
        target = PUBLICATION_UPLOAD_DIR / stored_name
        url = f"/api/admin/publications/files/{stored_name}"
    else:
        IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid.uuid4().hex}{ext}"
        target = IMAGE_UPLOAD_DIR / stored_name
        url = f"/api/public/uploads/images/{stored_name}"

    try:
        target.write_bytes(payload)
    except Exception:
        logger.exception("Failed to write uploaded media file")
        raise HTTPException(status_code=500, detail="Failed to save file")

    width = None
    height = None
    metadata_json = None
    if ext != '.pdf':
        width, height, metadata_json = _extract_image_metadata(payload, ext)

    try:
        asset = MediaAsset(
            id=uuid.uuid4().hex,
            stored_name=stored_name,
            original_name=filename,
            file_type=ext.lstrip('.'),
            size_bytes=len(payload),
            uploaded_by=admin.id if admin else None,
            width=width,
            height=height,
            metadata_json=metadata_json,
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
    except Exception:
        logger.exception("Failed to create MediaAsset DB row")
        asset = None

    resp = {
        "url": url,
        "file_name": filename,
        "size_bytes": len(payload),
    }
    if asset:
        resp["asset_id"] = asset.id
    return resp


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

@router.get("/events/occurrences", response_model=List[EventOccurrenceOut])
async def get_event_occurrences(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_website_manager),
):
    now = datetime.now(timezone.utc)
    # default window: start of current month to end of next 2 months
    logger.debug("get_event_occurrences called with raw start=%s end=%s", start, end)
    if start:
        start_dt = _parse_iso(start)
    else:
        start_dt = now - timedelta(days=30)

    if end:
        end_dt = _parse_iso(end)
    else:
        end_dt = now + timedelta(days=365)

    logger.debug("get_event_occurrences parsed start_dt=%s end_dt=%s", start_dt, end_dt)
    if not start_dt or not end_dt:
        logger.info("Invalid start/end parameters: raw start=%s end=%s parsed start_dt=%s end_dt=%s", start, end, start_dt, end_dt)
        raise HTTPException(status_code=400, detail="Invalid start or end parameters")

    events = db.query(Event).filter(Event.is_active == True).all()

    occs = []
    for ev in events:
        try:
            occs.extend(_generate_occurrences_for_event(ev, start_dt, end_dt))
        except Exception:
            logger.exception("Failed to generate occurrences for event %s", ev.id)

    # sort by event_date
    occs.sort(key=lambda x: x["event_date"])
    return occs

@router.get("/events/{event_id}", response_model=EventOut)
async def get_event(event_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


def _parse_iso(dt_str: Optional[str]):
    if not dt_str:
        return None
    s = str(dt_str).strip()
    # numeric epoch (seconds or milliseconds)
    try:
        if re.fullmatch(r"[-+]?\d+", s):
            val = int(s)
            # heuristic: values > 1e12 are milliseconds
            if abs(val) > 1_000_000_000_000:
                return datetime.fromtimestamp(val / 1000.0, tz=timezone.utc)
            return datetime.fromtimestamp(val, tz=timezone.utc)
    except Exception:
        # fall through to string parsing
        pass

    # Use dateutil if available for robust ISO parsing
    if DATEUTIL_AVAILABLE:
        try:
            from dateutil.parser import isoparse

            dt = isoparse(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            pass

    # Normalize trailing Z to +00:00 for fromisoformat
    try:
        if s.endswith('Z'):
            iso = s[:-1] + '+00:00'
        else:
            iso = s
        dt = datetime.fromisoformat(iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        # try common strptime fallbacks
        fmts = ["%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"]
        for fmt in fmts:
            try:
                dt = datetime.strptime(s, fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except Exception:
                continue
    return None


def _generate_occurrences_for_event(event: Event, window_start: datetime, window_end: datetime):
    """Return list of occurrence dicts for event between window_start and window_end (inclusive).
    Uses dateutil if available, otherwise supports simple FREQ=DAILY/WEEKLY with BYDAY and COUNT/UNTIL.
    """
    occurrences = []
    dtstart = event.event_date
    # If event has timezone name, attach it (best-effort)
    if getattr(event, 'timezone', None) and ZoneInfo is not None:
        try:
            tz = ZoneInfo(event.timezone)
            if dtstart.tzinfo is None:
                dtstart = dtstart.replace(tzinfo=tz)
        except Exception:
            pass
    # Ensure dtstart is timezone-aware to allow comparisons with parsed UTC window
    if dtstart.tzinfo is None:
        dtstart = dtstart.replace(tzinfo=timezone.utc)

    if not event.rrule or not event.rrule.strip():
        # single occurrence
        if dtstart >= window_start and dtstart <= window_end:
            occurrences.append({
                "id": f"{event.id}-0",
                "event_id": event.id,
                "title": event.title,
                "description": event.description,
                "event_date": dtstart,
                "timezone": getattr(event, 'timezone', None),
                "location": getattr(event, 'location', None),
                "image_url": getattr(event, 'image_url', None),
                "status": getattr(event, 'status', None),
                "linked_post_id": getattr(event, 'linked_post_id', None),
                "is_active": getattr(event, 'is_active', True),
            })
        return occurrences

    # Use dateutil when available for robust RRULE handling
    if DATEUTIL_AVAILABLE:
        try:
            rule = rrulestr(event.rrule, dtstart=dtstart)
            for occ in rule.between(window_start, window_end, inc=True):
                occurrences.append({
                    "id": f"{event.id}-{int(occ.timestamp())}",
                    "event_id": event.id,
                    "title": event.title,
                    "description": event.description,
                    "event_date": occ,
                    "timezone": getattr(event, 'timezone', None),
                    "location": getattr(event, 'location', None),
                    "image_url": getattr(event, 'image_url', None),
                    "status": getattr(event, 'status', None),
                    "linked_post_id": getattr(event, 'linked_post_id', None),
                    "is_active": getattr(event, 'is_active', True),
                })
            return occurrences
        except Exception:
            # fallback to simple parser below
            pass

    # Minimal fallback parser: support FREQ=DAILY/WEEKLY/MONTHLY, INTERVAL, BYDAY, COUNT, UNTIL
    try:
        parts = {p.split('=')[0].upper(): p.split('=')[1] for p in event.rrule.split(';') if '=' in p}
    except Exception:
        parts = {}

    freq = parts.get('FREQ', 'WEEKLY').upper()
    interval = int(parts.get('INTERVAL', '1')) if parts.get('INTERVAL') else 1
    count = int(parts.get('COUNT')) if parts.get('COUNT') and parts.get('COUNT').isdigit() else None
    until = None
    if parts.get('UNTIL'):
        until = _parse_iso(parts.get('UNTIL'))

    byday = None
    if parts.get('BYDAY'):
        byday = [d.strip().upper() for d in parts.get('BYDAY').split(',') if d.strip()]

    # map BYDAY tokens to python weekday (MON=0)
    wkmap = {'MO':0,'TU':1,'WE':2,'TH':3,'FR':4,'SA':5,'SU':6}

    # iterate occurrences with a safety cap
    max_iters = 1000
    iter_count = 0

    current = dtstart
    produced = 0
    while True:
        if iter_count >= max_iters:
            break
        iter_count += 1

        if current >= window_start and current <= window_end:
            occurrences.append({
                "id": f"{event.id}-{produced}",
                "event_id": event.id,
                "title": event.title,
                "description": event.description,
                "event_date": current,
                "timezone": getattr(event, 'timezone', None),
                "location": getattr(event, 'location', None),
                "image_url": getattr(event, 'image_url', None),
                "status": getattr(event, 'status', None),
                "linked_post_id": getattr(event, 'linked_post_id', None),
                "is_active": getattr(event, 'is_active', True),
            })
            produced += 1

        # stop if COUNT reached
        if count is not None and produced >= count:
            break
        # stop if UNTIL reached
        if until is not None and current > until:
            break

        # advance current according to freq
        if freq == 'DAILY':
            current = current + timedelta(days=interval)
        elif freq == 'WEEKLY':
            # if BYDAY specified, step day-by-day and select matching weekdays
            if byday:
                # find next day matching any byday
                next_day = current + timedelta(days=1)
                # advance until we find matching weekday
                while True:
                    if next_day.weekday() in [wkmap.get(x, -1) for x in byday]:
                        current = next_day
                        break
                    next_day = next_day + timedelta(days=1)
            else:
                current = current + timedelta(weeks=interval)
        elif freq == 'MONTHLY':
            # crude monthly increment: add interval months
            try:
                month = current.month - 1 + interval
                year = current.year + month // 12
                month = month % 12 + 1
                day = min(current.day, 28)
                current = datetime(year, month, day, current.hour, current.minute, current.second, tzinfo=current.tzinfo)
            except Exception:
                break
        else:
            # unsupported freq, break
            break

        # guard: if current goes beyond reasonable window
        if current > window_end and (until is None or current > until):
            break

    return occurrences



@router.get("/_debug/parse_dates")
async def _debug_parse_dates(start: Optional[str] = Query(None), end: Optional[str] = Query(None)):
    """Temporary debug endpoint to show how start/end are parsed by `_parse_iso`."""
    parsed_start = _parse_iso(start)
    parsed_end = _parse_iso(end)
    return {
        "raw": {"start": start, "end": end},
        "parsed": {
            "start": parsed_start.isoformat() if parsed_start else None,
            "end": parsed_end.isoformat() if parsed_end else None,
        },
    }


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
        title=f"[Tổ Xã Hội] Sự kiện mới: {event.title}",
        body="Hệ thống vừa cập nhật một sự kiện mới. Bạn có thể xem lịch và tham gia đăng ký.",
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
    # collect images
    to_delete = set()
    to_delete |= _extract_filenames_from_text(event.image_url)
    to_delete |= _extract_filenames_from_text(event.description)

    db.delete(event)
    db.commit()
    _sync_ai_knowledge_if_possible(db)

    try:
        _delete_image_files_if_unreferenced(to_delete, db)
    except Exception:
        logger.exception("Error while deleting event images")
    return {"message": "Event deleted"}


# --- Event Attachments ---
@router.get("/events/{event_id}/attachments", response_model=List[EventAttachmentOut])
async def list_event_attachments(event_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    return db.query(EventAttachment).filter(EventAttachment.event_id == event_id).order_by(EventAttachment.created_at.asc()).all()


@router.post("/events/{event_id}/attachments", response_model=EventAttachmentOut)
async def create_event_attachment(event_id: int, payload: EventAttachmentCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    attachment = EventAttachment(event_id=event_id, **payload.model_dump())
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.delete("/events/attachments/{attachment_id}")
async def delete_event_attachment(attachment_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    attachment = db.query(EventAttachment).filter(EventAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    to_delete = set()
    to_delete |= _extract_filenames_from_text(attachment.file_url)

    db.delete(attachment)
    db.commit()

    try:
        _delete_image_files_if_unreferenced(to_delete, db)
    except Exception:
        logger.exception("Error while deleting event attachment files")

    return {"message": "Attachment deleted"}


# --- Import / Export ---
@router.post("/events/import/csv")
async def import_events_csv(file: UploadFile = File(...), db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    content = await file.read()
    try:
        text = content.decode('utf-8')
    except Exception:
        text = content.decode('latin-1')

    import csv
    reader = csv.DictReader(text.splitlines())
    created = []
    for row in reader:
        try:
            payload = {}
            payload['title'] = row.get('title') or 'Untitled'
            payload['description'] = row.get('description') or ''
            payload['event_date'] = row.get('event_date') or None
            payload['location'] = row.get('location') or ''
            payload['rrule'] = row.get('rrule') or None
            payload['timezone'] = row.get('timezone') or None
            payload['image_url'] = row.get('image_url') or None
            payload['status'] = row.get('status') or 'upcoming'
            payload['linked_post_id'] = int(row['linked_post_id']) if row.get('linked_post_id') else None
            payload['is_active'] = (row.get('is_active', 'true').lower() in ('1','true','yes'))

            event = Event(**payload)
            db.add(event)
            db.commit()
            db.refresh(event)
            created.append(event.id)
        except Exception:
            db.rollback()
            logger.exception('Failed to import event row')

    return {"created": len(created), "ids": created}


@router.get("/events/export/csv")
async def export_events_csv(start: Optional[str] = Query(None), end: Optional[str] = Query(None), db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    # export occurrences between window as CSV
    now = datetime.now(timezone.utc)
    if start:
        start_dt = _parse_iso(start)
    else:
        start_dt = now - timedelta(days=30)
    if end:
        end_dt = _parse_iso(end)
    else:
        end_dt = now + timedelta(days=365)

    if not start_dt or not end_dt:
        raise HTTPException(status_code=400, detail='Invalid start/end')

    events = db.query(Event).filter(Event.is_active == True).all()
    rows = []
    for ev in events:
        try:
            occs = _generate_occurrences_for_event(ev, start_dt, end_dt)
            for o in occs:
                rows.append({
                    'event_id': o.get('event_id'),
                    'occurrence_id': o.get('id'),
                    'title': o.get('title'),
                    'description': o.get('description'),
                    'event_date': o.get('event_date').isoformat(),
                    'location': o.get('location'),
                    'rrule': getattr(ev, 'rrule', None),
                    'timezone': getattr(ev, 'timezone', None),
                })
        except Exception:
            logger.exception('Failed to export occurrences for event %s', ev.id)

    import csv, io
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=['event_id','occurrence_id','title','description','event_date','location','rrule','timezone'])
    writer.writeheader()
    for r in rows:
        writer.writerow(r)
    output.seek(0)
    return StreamingResponse(output, media_type='text/csv', headers={'Content-Disposition': 'attachment; filename="events_export.csv"'})


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
        title=f"[Tổ Xã Hội] Câu chuyện mới: {story.title}",
        body="Mục truyền cảm hứng vừa có nội dung mới. Mở hệ thống để đọc ngay.",
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
    to_delete = set()
    to_delete |= _extract_filenames_from_text(story.image_url)
    to_delete |= _extract_filenames_from_text(story.content)
    to_delete |= _collect_images_from_metadata(story.layout_metadata)

    db.delete(story)
    db.commit()
    _sync_ai_knowledge_if_possible(db)

    try:
        _delete_image_files_if_unreferenced(to_delete, db)
    except Exception:
        logger.exception("Error while deleting story images")
    return {"message": "Story deleted"}


# --- Social Scale CMS ---

@router.get("/social-scale", response_model=SocialScaleOut)
async def get_social_scale(db: Session = Depends(get_db), admin: User = Depends(get_current_website_manager)):
    item = db.query(SocialScale).order_by(SocialScale.updated_at.desc(), SocialScale.id.desc()).first()
    if not item:
        item = SocialScale(
            hero_title="Quy mô & phát triển",
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


@router.put("/staff/reorder")
async def reorder_staff(
    payload: List[dict] = Body(..., description="Ordered staff items containing at least `id`"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_website_manager),
):
    id_order: List[int] = []
    for item in payload or []:
        if not isinstance(item, dict):
            continue
        raw_id = item.get("id")
        try:
            staff_id = int(raw_id)
        except (TypeError, ValueError):
            continue
        id_order.append(staff_id)

    if not id_order:
        return {"updated": 0}

    existing = db.query(StaffProfile).filter(StaffProfile.id.in_(id_order)).all()
    by_id = {item.id: item for item in existing}

    updated = 0
    for index, staff_id in enumerate(id_order, start=1):
        profile = by_id.get(staff_id)
        if not profile:
            continue
        profile.display_order = index
        updated += 1

    db.commit()
    return {"updated": updated}


@router.get("/staff/reactions/summary")
async def get_staff_reactions_summary(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_website_manager),
):
    # Keep endpoint resilient in environments where migrations were not applied yet.
    _ensure_staff_reactions_table(db)

    staff_rows = (
        db.query(StaffProfile.id, StaffProfile.full_name)
        .order_by(StaffProfile.display_order.asc(), StaffProfile.created_at.desc())
        .all()
    )
    summary_map = {
        row.id: {
            "staff_id": row.id,
            "full_name": row.full_name,
            "counts": {},
        }
        for row in staff_rows
    }

    try:
        rows = (
            db.query(
                StaffReaction.staff_id,
                StaffReaction.reaction_type,
                func.count(StaffReaction.id).label("count"),
            )
            .group_by(StaffReaction.staff_id, StaffReaction.reaction_type)
            .all()
        )
    except Exception as exc:
        if not _is_missing_staff_reactions_error(exc):
            raise
        _ensure_staff_reactions_table(db)
        rows = []

    for row in rows:
        if row.staff_id not in summary_map:
            # Keep orphan reaction rows visible for diagnostics.
            summary_map[row.staff_id] = {
                "staff_id": row.staff_id,
                "full_name": f"Hồ sơ #{row.staff_id}",
                "counts": {},
            }
        summary_map[row.staff_id]["counts"][row.reaction_type] = int(row.count or 0)

    result = list(summary_map.values())
    result.sort(
        key=lambda item: (
            -sum((item.get("counts") or {}).values()),
            str(item.get("full_name") or ""),
        )
    )
    return result


@router.get("/staff/{staff_id}/reactions")
async def get_staff_reactions_detail(
    staff_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_website_manager),
):
    staff = db.query(StaffProfile).filter(StaffProfile.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    _ensure_staff_reactions_table(db)
    rows = (
        db.query(StaffReaction.reaction_type, func.count(StaffReaction.id).label("count"))
        .filter(StaffReaction.staff_id == staff_id)
        .group_by(StaffReaction.reaction_type)
        .all()
    )
    counts = {row.reaction_type: int(row.count or 0) for row in rows}
    return {
        "staff_id": staff.id,
        "full_name": staff.full_name,
        "counts": counts,
        "total": int(sum(counts.values())),
    }


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
    to_delete = set()
    to_delete |= _extract_filenames_from_text(item.image_url)

    db.delete(item)
    db.commit()

    try:
        _delete_image_files_if_unreferenced(to_delete, db)
    except Exception:
        logger.exception("Error while deleting staff profile images")

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
    # Include role metadata (role_details) so frontend can render role list without separate call
    try:
        role_rows = db.query(Role).order_by(Role.id).all()
        role_details = []
        for r in role_rows:
            role_details.append({
                "id": r.id,
                "slug": r.slug,
                "name": r.name,
                "permissions": r.permissions or [],
                "built_in": bool(r.built_in),
            })
    except Exception:
        # If roles table is missing or query fails, return empty details but keep counts and fallback permissions
        role_details = []

    return {
        "roles": role_counts,
        "role_details": role_details,
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


# --- Roles management ---
@router.get("/roles", response_model=List[RoleOut])
async def list_roles(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    try:
        rows = db.query(Role).order_by(Role.id).all()
        return rows
    except Exception:
        return []


@router.post("/roles", response_model=RoleOut)
async def create_role(payload: RoleCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    # ensure slug uniqueness
    existing = db.query(Role).filter(Role.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role slug already exists")

    role = Role(slug=payload.slug, name=payload.name, permissions=payload.permissions or [], built_in=bool(payload.built_in))
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.put("/roles/{role_id}", response_model=RoleOut)
async def update_role(role_id: int, payload: RoleCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # prevent accidental overwrite of slug collisions
    if payload.slug != role.slug:
        exists = db.query(Role).filter(Role.slug == payload.slug).first()
        if exists:
            raise HTTPException(status_code=400, detail="Another role with this slug already exists")

    role.slug = payload.slug
    role.name = payload.name
    role.permissions = payload.permissions or []
    role.built_in = bool(payload.built_in)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.delete("/roles/{role_id}")
async def delete_role(role_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if role.built_in:
        raise HTTPException(status_code=400, detail="Cannot delete built-in role")

    assigned_count = db.query(User).filter(User.role == role.slug).count()
    if assigned_count > 0:
        raise HTTPException(status_code=400, detail="Role is currently assigned to users")

    db.delete(role)
    db.commit()
    return {"message": "deleted"}

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

    # Build simple weekly metrics for the last 7 days (used by admin chart)
    try:
        today = datetime.now(timezone.utc).date()
        name_map = {0: 'T2', 1: 'T3', 2: 'T4', 3: 'T5', 4: 'T6', 5: 'T7', 6: 'CN'}
        weekly_metrics = []
        for days_back in range(6, -1, -1):
            day = today - timedelta(days=days_back)
            start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
            end = start + timedelta(days=1)

            submissions_count = db.query(Submission).filter(Submission.created_at >= start, Submission.created_at < end).count()
            publications_count = db.query(Publication).filter(Publication.created_at >= start, Publication.created_at < end).count()

            weekly_metrics.append({
                "name": name_map.get(day.weekday(), day.strftime('%a')),
                "date": day.isoformat(),
                "views": publications_count,
                "submissions": submissions_count,
            })
    except Exception:
        weekly_metrics = []

    return {
        "stats": stats,
        "ai_status": ai_status,
        "ai_documents": ai_documents,
        "knowledge_assets": knowledge_assets,
        "recent_activity": _collect_recent_activity(db),
        "weekly_metrics": weekly_metrics,
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
            logger.exception("Failed to ingest AI knowledge file %s: %s", upload.filename or "unknown", str(exc))
            failed.append(
                {
                    "file_name": upload.filename or "unknown",
                    "error": "ingest_failed",
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


# ---------------------------------------------------------------------------
# Admin Comment Management
# ---------------------------------------------------------------------------

@router.get("/comments")
async def admin_list_comments(
    publication_id: int = Query(None),
    is_visible: bool = Query(None),
    comment_type: str = Query(None),
    q: str = Query(None),
    limit: int = Query(500, ge=1, le=2000),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List all comments with optional filters for admin management."""
    query = db.query(Comment)

    if publication_id is not None:
        query = query.filter(Comment.publication_id == publication_id)

    if is_visible is not None:
        query = query.filter(Comment.is_visible == is_visible)

    if comment_type == "publication":
        query = query.filter(Comment.publication_id != None)
    elif comment_type == "submission":
        query = query.filter(Comment.submission_id != None)

    if q:
        query = query.filter(Comment.content.ilike(f"%{q}%"))

    comments = query.order_by(Comment.created_at.desc()).limit(limit).all()

    # Enrich with author info
    result = []
    for c in comments:
        author_name = None
        author_image_url = None
        if c.user_id:
            user = db.query(User).filter(User.id == c.user_id).first()
            if user:
                author_name = user.full_name or user.email
                author_image_url = getattr(user, "image_url", None)

        result.append({
            "id": c.id,
            "content": c.content,
            "user_id": c.user_id,
            "publication_id": c.publication_id,
            "submission_id": c.submission_id,
            "parent_id": c.parent_id,
            "is_visible": c.is_visible,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "author_name": author_name,
            "author_image_url": author_image_url,
        })

    return result


@router.put("/comments/{comment_id}/visibility")
async def admin_toggle_comment_visibility(
    comment_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Toggle comment visibility (show/hide)."""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    comment.is_visible = not comment.is_visible
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "is_visible": comment.is_visible,
        "message": "Comment visibility toggled",
    }


@router.delete("/comments/{comment_id}")
async def admin_delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Delete a comment and all its children (replies)."""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Delete child comments first (one level of nesting)
    children = db.query(Comment).filter(Comment.parent_id == comment_id).all()
    for child in children:
        db.delete(child)

    db.delete(comment)
    db.commit()

    return {"deleted": True, "id": comment_id}
