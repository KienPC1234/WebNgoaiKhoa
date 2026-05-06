from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile, Request, Query, Body, Response
from fastapi.responses import FileResponse
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.publication import (
    Publication,
    Submission,
    SubmissionVote,
    Comment,
    CommentMention,
    Category,
    ContentType,
    Event,
    Story,
    SocialScale,
    StaffProfile,
    StaffReaction,
    PublicationViewEvent,
    PublicationFavorite,
    PublicationVote,
    CommentReaction,
)
from app.models.media import MediaAsset
from sqlalchemy import func
from jose import JWTError, jwt
from app.models.user import User
from app.api.auth import SECRET_KEY, ALGORITHM
from app.db.notifications import manager
from app.api.auth import get_current_user, get_current_contestant, verify_recaptcha_or_raise
from app.schemas.schemas import (
    EventOut,
    PublicationOut,
    SocialScaleOut,
    StaffProfileOut,
    StoryOut,
    SubmissionOut,
    SubmissionCreate,
    SubmissionCommentCreate,
    SubmissionCommentOut,
    PublicationCommentCreate,
    PublicationCommentOut,
    CommentReactionIn,
    PublicProfileOut,
)
from typing import Dict, List, Optional
from pydantic import BaseModel
from pathlib import Path
import os
import uuid
import re
import json
import mimetypes
import logging
from app.schemas.schemas import PushSubscriptionIn
from app.models.notification import PushSubscription, Notification
import httpx
import unicodedata


router = APIRouter()
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(os.getenv("SUBMISSION_UPLOAD_DIR", "/data/WebNgoaiKhoa/backend/uploads/submissions"))
MAX_UPLOAD_SIZE = int(os.getenv("SUBMISSION_MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))
IMAGE_UPLOAD_DIR = Path(os.getenv("IMAGE_UPLOAD_DIR", "/data/WebNgoaiKhoa/backend/uploads/images"))
IMAGE_MAX_UPLOAD_SIZE = int(os.getenv("IMAGE_MAX_UPLOAD_BYTES", str(12 * 1024 * 1024)))
IMAGE_VARIANTS_DIR = Path(os.getenv("IMAGE_VARIANTS_DIR", str(IMAGE_UPLOAD_DIR / ".variants")))
STAFF_IMAGE_WIDTHS = (240, 320, 480, 640)
STAFF_IMAGE_SIZES = "(max-width: 640px) 80vw, (max-width: 1024px) 33vw, 320px"
VIDEO_UPLOAD_DIR = Path(os.getenv("VIDEO_UPLOAD_DIR", "/data/WebNgoaiKhoa/backend/uploads/videos"))
VIDEO_MAX_UPLOAD_SIZE = int(os.getenv("VIDEO_MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))
TITLE_MIN_LENGTH = 6
CONTENT_MIN_LENGTH = 30
COMMENT_MIN_LENGTH = 2
COMMENT_MAX_LENGTH = 5000
VALID_COMMENT_REACTION_TYPES = {"like", "dislike"}

# Allowed staff reaction types (keep in sync with frontend choices)
VALID_STAFF_REACTION_TYPES = {"love", "star"}

SHORT_DESC_NOISE_TERMS = (
    "publication",
    "story",
    "event",
    "submission",
    "draft",
    "published",
    "layout",
    "metadata",
    "json",
    "vi-vn",
    "en-us",
    "content_type",
    "subject",
    "category",
)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "30"))

def _normalize_text(value: str) -> str:
    if not value:
        return ""
    # Normalize Unicode (decompose and recompose)
    normalized = unicodedata.normalize("NFC", value)
    # Collapse multiple spaces/tabs/newlines into single space
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()

def _strip_html_for_summary(value: str) -> str:
    if not value:
        return ""
    # Remove HTML tags
    text = re.sub(r"<[^>]*>", "", value)
    # Decode common HTML entities
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&#39;", "'")
    return _normalize_text(text)

def _remove_repeated_adjacent_words(value: str) -> str:
    if not value:
        return ""
    return re.sub(r"\b([^\W\d_]+)(\s+\1\b)+", r"\1", value, flags=re.IGNORECASE)

def _soften_uppercase_sentence(value: str) -> str:
    text = _normalize_text(value)
    if not text:
        return ""

    letters = [ch for ch in text if ch.isalpha()]
    if len(letters) < 8:
        return text

    uppercase_ratio = sum(1 for ch in letters if ch.isupper()) / max(1, len(letters))
    if uppercase_ratio < 0.72:
        return text

    lowered = text.lower()
    lowered = re.sub(r"(?<=[.!?])\s+([\wÀ-ỹ])", lambda m: m.group(1).upper(), lowered)
    return lowered[:1].upper() + lowered[1:]

def _remove_short_description_noise(value: str) -> str:
    text = _strip_html_for_summary(value)
    if not text:
        return ""

    # Remove leading route/tag-like prefixes such as "cuoc-thi - van:".
    text = re.sub(r"^\s*[a-z0-9_-]+\s*-\s*[a-z0-9_-]+\s*:\s*", "", text, flags=re.IGNORECASE)

    # Drop frequent technical tokens that may leak from CMS metadata.
    for term in SHORT_DESC_NOISE_TERMS:
        text = re.sub(rf"\b{re.escape(term)}\\b", " ", text, flags=re.IGNORECASE)

    text = _normalize_text(text)
    text = re.sub(r"\s*[-–—:]{1,2}\s*", " ", text)
    text = _remove_repeated_adjacent_words(text)
    text = _normalize_text(text)
    return text

def _looks_like_noise_only(value: str) -> bool:
    cleaned = _normalize_for_match(_remove_short_description_noise(value))
    if not cleaned:
        return True

    tokens = [token for token in re.split(r"[^a-z0-9]+", cleaned) if token]
    if not tokens:
        return True

    # Require at least 3 meaningful tokens or 20+ characters
    return len(tokens) < 3 and len(cleaned) < 20

def _normalize_for_match(value: str) -> str:
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]", "", value.lower())

def _pick_first_readable_sentence(value: str) -> str:
    if not value:
        return ""

    # Split into sentences (basic: . ! ? followed by space or end)
    sentences = re.split(r"(?<=[.!?])\s+", value.strip())
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        # Skip if too short or looks like noise
        if len(sentence) < 10 or _looks_like_noise_only(sentence):
            continue
        return sentence

    # Fallback: return first non-empty part
    return value.strip()[:200]

def _build_publication_short_description_fallback(payload: dict) -> str:
    title = _normalize_text(payload.get("title", ""))
    subject = _normalize_text(payload.get("subject", ""))
    content_type = _normalize_text(payload.get("content_type", ""))
    layout = payload.get("layout", {})

    # Try to extract from layout metadata
    if isinstance(layout, dict):
        # Look for summary or description in layout
        summary = layout.get("summary") or layout.get("description")
        if summary:
            cleaned = _remove_short_description_noise(summary)
            if cleaned and not _looks_like_noise_only(cleaned):
                return _pick_first_readable_sentence(cleaned)

        # Fallback to first paragraph or text block
        blocks = layout.get("blocks", [])
        for block in blocks:
            if isinstance(block, dict) and block.get("type") in ("paragraph", "text"):
                content = block.get("content", "")
                cleaned = _remove_short_description_noise(content)
                if cleaned and not _looks_like_noise_only(cleaned):
                    return _pick_first_readable_sentence(cleaned)

    # Last resort: combine title + subject + content_type
    parts = [title, subject, content_type]
    combined = " ".join(p for p in parts if p)
    if combined:
        return combined[:200]

    return "Bài viết từ Tổ Xã hội"


def _extract_layout_short_description(layout: Optional[dict]) -> str:
    if not isinstance(layout, dict):
        return ""

    metadata = layout.get("metadata") if isinstance(layout.get("metadata"), dict) else {}
    candidates = [
        layout.get("short_description"),
        layout.get("summary"),
        layout.get("description"),
        metadata.get("short_description"),
        metadata.get("summary"),
        metadata.get("description"),
    ]

    for candidate in candidates:
        cleaned = _remove_short_description_noise(str(candidate or ""))
        if cleaned and not _looks_like_noise_only(cleaned):
            return _pick_first_readable_sentence(cleaned)

    return ""

async def _generate_short_description_via_ai(payload: dict) -> str:
    serialized_layout = json.dumps(payload.get("layout", {}), ensure_ascii=False, separators=(",", ":"))

    system_prompt = (
        "Bạn là trợ lý biên tập nội dung tiếng Việt. "
        "Nhiệm vụ: tạo 1 mô tả ngắn cho thẻ bài viết dựa trên metadata và JSON layout. "
        "Yêu cầu: tối đa 220 ký tự, 1 câu, không markdown, không hashtag, không viết hoa toàn bộ, không lặp lại cụm từ đầu, không bịa thêm dữ kiện. "
        "Kết quả chỉ là một câu mô tả ngắn gọn, tự nhiên, không chứa các nhãn nhập liệu như Tieu de, Phan mon, Loai noi dung, Layout JSON."
    )

    user_prompt = (
        f"Tieu de: {_normalize_text(payload.get('title', ''))}\n"
        f"Phan mon: {_normalize_text(payload.get('subject', ''))}\n"
        f"Loai noi dung: {_normalize_text(payload.get('content_type', ''))}\n"
        f"Layout JSON: {serialized_layout}\n"
        "Trich xuat thong tin chinh xac va tra ve duy nhat 1 cau mo ta ngan."
    )

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": False,
                },
            )
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="AI service unavailable")

            data = response.json()
            raw_description = data.get("message", {}).get("content", "").strip()
            if not raw_description:
                return _build_publication_short_description_fallback(payload)

            # Clean up the response
            cleaned = _remove_short_description_noise(raw_description)
            softened = _soften_uppercase_sentence(cleaned)
            final = _pick_first_readable_sentence(softened)

            # Ensure length limit
            if len(final) > 220:
                final = final[:217] + "..."

            return final or _build_publication_short_description_fallback(payload)
    except Exception as e:
        logging.getLogger(__name__).warning(f"AI short description generation failed: {e}")
        return _build_publication_short_description_fallback(payload)



class SubmissionIn(BaseModel):
    title: str
    content: str
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    recaptcha_token: Optional[str] = None


class VoteIn(BaseModel):
    recaptcha_token: Optional[str] = None


def _is_missing_submission_votes_error(exc: Exception) -> bool:
    error_message = str(exc).lower()
    return "submission_votes" in error_message or "no such table" in error_message or "doesn't exist" in error_message


def _ensure_submission_votes_table(db: Session) -> None:
    bind = db.get_bind()
    SubmissionVote.__table__.create(bind=bind, checkfirst=True)


def _is_missing_staff_reactions_error(exc: Exception) -> bool:
    error_message = str(exc).lower()
    return "staff_reactions" in error_message or "no such table" in error_message or "doesn't exist" in error_message


def _ensure_staff_reactions_table(db: Session) -> None:
    bind = db.get_bind()
    StaffReaction.__table__.create(bind=bind, checkfirst=True)


def _is_resizable_image(filename: str) -> bool:
    lower = (filename or "").lower()
    return lower.endswith((".jpg", ".jpeg", ".png", ".webp"))


def _build_staff_image_srcset(image_url: Optional[str]) -> Optional[str]:
    if not image_url or "/api/public/uploads/images/" not in image_url:
        return None
    safe_url = image_url.split("#", 1)[0]
    if not _is_resizable_image(safe_url):
        return None
    entries = [f"{safe_url}?w={w}&fmt=webp {w}w" for w in STAFF_IMAGE_WIDTHS]
    return ", ".join(entries)


def _build_staff_image_optimized_url(image_url: Optional[str]) -> Optional[str]:
    if not image_url or "/api/public/uploads/images/" not in image_url:
        return image_url
    safe_url = image_url.split("#", 1)[0]
    if not _is_resizable_image(safe_url):
        return safe_url
    return f"{safe_url}?w=640&fmt=webp"


def _build_variant_filename(source_name: str, width: int, fmt: str) -> str:
    stem = Path(source_name).stem
    safe_fmt = (fmt or "webp").lower()
    return f"{stem}__w{width}.{safe_fmt}"


def _ensure_image_variant(target: Path, width: int, fmt: str) -> Path:
    try:
        from PIL import Image, ImageOps
    except Exception as exc:
        raise HTTPException(status_code=501, detail="Image variant generation not available") from exc

    IMAGE_VARIANTS_DIR.mkdir(parents=True, exist_ok=True)
    safe_width = max(64, min(int(width), 2048))
    safe_fmt = (fmt or "webp").lower()
    if safe_fmt not in {"webp", "jpeg", "jpg"}:
        safe_fmt = "webp"

    variant_name = _build_variant_filename(target.name, safe_width, "jpg" if safe_fmt in {"jpg", "jpeg"} else safe_fmt)
    variant_path = IMAGE_VARIANTS_DIR / variant_name

    source_mtime = target.stat().st_mtime
    if variant_path.exists() and variant_path.is_file() and variant_path.stat().st_mtime >= source_mtime:
        return variant_path

    with Image.open(str(target)) as img:
        img = ImageOps.exif_transpose(img)
        target_width = min(safe_width, img.width)
        if target_width < img.width:
            ratio = target_width / float(img.width)
            target_height = max(1, int(img.height * ratio))
            img = img.resize((target_width, target_height), Image.LANCZOS)

        if safe_fmt in {"jpg", "jpeg"}:
            out = img.convert("RGB")
            out.save(str(variant_path), format="JPEG", quality=82, optimize=True, progressive=True)
        else:
            out = img.convert("RGB")
            out.save(str(variant_path), format="WEBP", quality=80, method=6)

    return variant_path


def _normalize_submission_payload(title: str, content: str, student_name: Optional[str]):
    normalized_title = (title or "").strip()
    normalized_content = (content or "").strip()
    normalized_student_name = (student_name or "").strip() or None

    if not normalized_title:
        raise HTTPException(status_code=400, detail="Vui lòng nhập tên tác phẩm")
    if len(normalized_title) < TITLE_MIN_LENGTH:
        raise HTTPException(status_code=400, detail=f"Tên tác phẩm cần tối thiểu {TITLE_MIN_LENGTH} ký tự")
    if len(normalized_title) > 255:
        raise HTTPException(status_code=400, detail="Tên tác phẩm vượt quá 255 ký tự")

    if not normalized_content:
        raise HTTPException(status_code=400, detail="Vui lòng nhập nội dung tác phẩm")
    if len(normalized_content) < CONTENT_MIN_LENGTH:
        raise HTTPException(status_code=400, detail=f"Nội dung cần tối thiểu {CONTENT_MIN_LENGTH} ký tự")

    return normalized_title, normalized_content, normalized_student_name


def _strip_html_tags(content: str) -> str:
    return re.sub(r"<[^>]*>", "", content or "")


def _validate_comment_content(content: str) -> str:
    normalized_content = (content or "").strip()
    if not normalized_content:
        raise HTTPException(status_code=400, detail="Nội dung bình luận không được để trống")

    if "<script" in normalized_content.lower():
        raise HTTPException(status_code=400, detail="Nội dung bình luận không hợp lệ")

    plain_text = _strip_html_tags(normalized_content)
    plain_text = re.sub(r"\s+", " ", plain_text).strip()

    if len(plain_text) < COMMENT_MIN_LENGTH:
        raise HTTPException(status_code=400, detail=f"Bình luận cần tối thiểu {COMMENT_MIN_LENGTH} ký tự")
    if len(normalized_content) > COMMENT_MAX_LENGTH:
        raise HTTPException(status_code=400, detail=f"Bình luận vượt quá {COMMENT_MAX_LENGTH} ký tự")

    return normalized_content


def _build_comment_out(item: Comment, db: Session) -> SubmissionCommentOut:
    author_name = None
    if item.user_id:
        user = db.query(User).filter(User.id == item.user_id).first()
        if user:
            author_name = user.full_name or user.email

    return SubmissionCommentOut(
        id=item.id,
        content=item.content,
        submission_id=item.submission_id,
        user_id=item.user_id,
        created_at=item.created_at,
        author_name=author_name,
    )


def _extract_mentions_from_html(content: str):
    """Extract user IDs from CKEditor mention markup.

    Supports:
    - JSON payloads: data-mention='{"id":123,...}'
    - Numeric strings: data-mention='9'
    - Tokenized IDs: data-mention='@u:9:username'
    """
    import json
    pattern = re.compile(r'data-mention=(?P<q>["\'])(?P<json>.*?)(?P=q)')
    ids = set()
    for m in pattern.finditer(content or ""):
        raw_value = (m.group("json") or "").strip()
        if not raw_value:
            continue
        try:
            data = json.loads(raw_value)
            if isinstance(data, dict):
                uid = data.get("id") or data.get("user") or data.get("user_id")
                if isinstance(uid, int):
                    ids.add(uid)
                    continue
                if isinstance(uid, str) and uid.isdigit():
                    ids.add(int(uid))
                    continue
            elif isinstance(data, int):
                ids.add(data)
                continue
            elif isinstance(data, str):
                raw_value = data.strip()
        except Exception:
            pass

        if raw_value.isdigit():
            ids.add(int(raw_value))
            continue

        token_match = re.match(r"^@u:(\d+)(?::.*)?$", raw_value)
        if token_match:
            try:
                ids.add(int(token_match.group(1)))
            except Exception:
                pass
    return list(ids)


def _derive_username(user: User) -> str:
    email = str(getattr(user, "email", "") or "").strip()
    if "@" in email:
        local = email.split("@", 1)[0].strip()
        if local:
            return local
    full_name = str(getattr(user, "full_name", "") or "").strip()
    if full_name:
        return re.sub(r"\s+", "", full_name).lower()
    return f"user{user.id}"


def _resolve_request_user(request: Request, db: Session) -> Optional[User]:
    user = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            payload = jwt.decode(auth_header[7:], SECRET_KEY, algorithms=[ALGORITHM])
            sub = payload.get("sub")
            if sub:
                try:
                    user = db.query(User).filter(User.id == int(sub)).first()
                except (ValueError, TypeError):
                    user = db.query(User).filter(User.email == sub).first()
        except Exception:
            user = None
    return user


def _build_publication_comment_out(
    item: Comment,
    db: Session,
    current_user_id: Optional[int] = None,
    reaction_stats: Optional[Dict[int, Dict[str, int]]] = None,
    user_reactions: Optional[Dict[int, str]] = None,
) -> PublicationCommentOut:
    author_name = None
    author_image_url = None
    if item.user_id:
        user = db.query(User).filter(User.id == item.user_id).first()
        if user:
            author_name = user.full_name or user.email
            author_image_url = getattr(user, "image_url", None)

    mentions = [m.user_id for m in db.query(CommentMention).filter(CommentMention.comment_id == item.id).all()]
    stats = (reaction_stats or {}).get(item.id, {})
    like_count = int(stats.get("like", 0))
    dislike_count = int(stats.get("dislike", 0))
    user_reaction = (user_reactions or {}).get(item.id)

    return PublicationCommentOut(
        id=item.id,
        content=item.content,
        publication_id=item.publication_id,
        parent_id=item.parent_id,
        user_id=item.user_id,
        created_at=item.created_at,
        author_name=author_name,
        author_image_url=author_image_url,
        like_count=like_count,
        dislike_count=dislike_count,
        user_reaction=user_reaction,
        mentions=mentions,
    )


def _normalize_publication_tags(raw_tags) -> List[str]:
    if raw_tags is None:
        return []
    if isinstance(raw_tags, str):
        candidates = raw_tags.split(',')
    elif isinstance(raw_tags, (list, tuple, set)):
        candidates = list(raw_tags)
    else:
        return []

    seen = set()
    cleaned: List[str] = []
    for item in candidates:
        token = str(item or '').strip()
        if not token:
            continue
        key = token.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(token)
    return cleaned


def _publication_tags(pub: Publication) -> List[str]:
    metadata = pub.layout_metadata if isinstance(pub.layout_metadata, dict) else {}
    return _normalize_publication_tags(getattr(pub, 'tags', None) or metadata.get('tags'))


def _publication_has_tag(pub: Publication, tag: Optional[str]) -> bool:
    normalized_tag = (tag or '').strip().lower()
    if not normalized_tag:
        return True
    return any(t.lower() == normalized_tag for t in _publication_tags(pub))

# --- Public Endpoints ---

@router.get("/publications", response_model=List[PublicationOut])
async def get_public_publications(
    category: Optional[str] = None,
    subject: Optional[str] = None,
    content_type: Optional[str] = None,
    featured_year: Optional[str] = None,
    tag: Optional[str] = None,
    sort: Optional[str] = None,
    limit: Optional[int] = Query(None, gt=0),
    db: Session = Depends(get_db),
):
    """Return publications.

    Supports an optional `sort=trending` which orders results by comment count
    (descending) as a lightweight proxy for popularity. Clients may also pass
    `limit` to restrict the number of returned items.
    """

    # Base query for publications; apply filters first so ordering/joining
    # respects the requested subject/content_type/featured_year.
    base_query = db.query(Publication)

    # Accept `category` query param as legacy; filter by canonical `subject` column only.
    resolved_subject = subject or category
    if resolved_subject:
        base_query = base_query.filter(Publication.subject == resolved_subject)

    if content_type:
        base_query = base_query.filter(Publication.content_type == content_type)

    if featured_year:
        base_query = base_query.filter(Publication.featured_year == featured_year)

    # Trending sort: order by comment count (desc), then by created_at as tiebreaker.
    if sort == 'trending':
        subq = (
            db.query(Comment.publication_id, func.count(Comment.id).label('comment_count'))
            .group_by(Comment.publication_id)
            .subquery()
        )

        query = (
            base_query
            .outerjoin(subq, Publication.id == subq.c.publication_id)
            .order_by(func.coalesce(subq.c.comment_count, 0).desc(), Publication.created_at.desc())
        )
    else:
        query = base_query.order_by(Publication.created_at.desc())

    rows = query.all()
    if tag:
        rows = [pub for pub in rows if _publication_has_tag(pub, tag)]

    # Ensure stable short_description for response without blocking on AI generation.
    for pub in rows:
        current_short_desc = _remove_short_description_noise(pub.short_description or "")
        if current_short_desc and not _looks_like_noise_only(current_short_desc):
            continue

        # Prefer author/editor provided description in layout metadata first.
        metadata_short_desc = _extract_layout_short_description(pub.layout_metadata or {})
        if metadata_short_desc:
            pub.short_description = metadata_short_desc
            continue

        payload = {
            "title": pub.title,
            "subject": pub.subject,
            "content_type": pub.content_type,
            "layout": pub.layout_metadata or {},
        }
        pub.short_description = _build_publication_short_description_fallback(payload)

    if limit:
        return rows[:limit]

    return rows


@router.get("/news", response_model=List[PublicationOut])
async def get_public_news(
    tag: Optional[str] = None,
    limit: Optional[int] = Query(50, gt=0),
    db: Session = Depends(get_db),
):
    rows_by_id: Dict[int, Publication] = {}

    contest_rows = (
        db.query(Publication)
        .filter(Publication.content_type == ContentType.CUOC_THI.value)
        .order_by(Publication.created_at.desc())
        .all()
    )
    for row in contest_rows:
        rows_by_id[row.id] = row

    linked_ids = [
        item[0]
        for item in (
            db.query(Event.linked_post_id)
            .filter(Event.linked_post_id.isnot(None), Event.is_active == True)
            .all()
        )
    ]
    if linked_ids:
        linked_rows = (
            db.query(Publication)
            .filter(Publication.id.in_(linked_ids))
            .order_by(Publication.created_at.desc())
            .all()
        )
        for row in linked_rows:
            rows_by_id[row.id] = row

    recent_rows = (
        db.query(Publication)
        .order_by(Publication.created_at.desc())
        .limit(400)
        .all()
    )
    for row in recent_rows:
        if _publication_has_tag(row, 'news'):
            rows_by_id[row.id] = row

    rows = list(rows_by_id.values())
    rows.sort(key=lambda x: (x.created_at.timestamp() if x.created_at else 0), reverse=True)

    if tag:
        rows = [row for row in rows if _publication_has_tag(row, tag)]

    if limit:
        rows = rows[:limit]

    return rows


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


@router.get("/stories/inspiring/{story_id}", response_model=StoryOut)
async def get_inspiring_story_by_id(story_id: int, db: Session = Depends(get_db)):
    story = (
        db.query(Story)
        .filter(Story.id == story_id, Story.is_published == True)
        .first()
    )
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.get("/doingu/scale", response_model=SocialScaleOut)
async def get_social_scale(db: Session = Depends(get_db)):
    item = (
        db.query(SocialScale)
        .filter(SocialScale.is_active == True)
        .order_by(SocialScale.updated_at.desc(), SocialScale.id.desc())
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Social scale data not found")
    return item


@router.get("/doingu/staff", response_model=List[StaffProfileOut])
async def get_staff_profiles(db: Session = Depends(get_db), response: Response = None):
    """Return active staff profiles augmented with image metadata when available.

    Adds lightweight caching headers to reduce repeated load on clients.
    """
    rows = (
        db.query(StaffProfile)
        .filter(StaffProfile.is_active == True)
        .order_by(StaffProfile.display_order.asc(), StaffProfile.created_at.desc())
        .all()
    )

    # Add Cache-Control header (short TTL, adjust as needed)
    try:
        if response is not None:
            response.headers["Cache-Control"] = "public, max-age=60"
    except Exception:
        pass

    out = []
    for s in rows:
        image_asset_id = None
        image_width = None
        image_height = None
        image_blur = None
        image_srcset = _build_staff_image_srcset(s.image_url)
        image_sizes = STAFF_IMAGE_SIZES if image_srcset else None
        image_optimized_url = _build_staff_image_optimized_url(s.image_url)
        try:
            if s.image_url:
                safe_name = Path(s.image_url).name
                if safe_name:
                    asset = db.query(MediaAsset).filter(MediaAsset.stored_name == safe_name).first()
                    if asset:
                        image_asset_id = asset.id
                        image_width = asset.width
                        image_height = asset.height
                        if asset.metadata_json and isinstance(asset.metadata_json, dict):
                            image_blur = asset.metadata_json.get("blur_placeholder")
        except Exception:
            # Non-fatal: continue without metadata on errors
            pass

        out.append({
            "id": s.id,
            "full_name": s.full_name,
            "title": s.title,
            "bio": s.bio,
            "email": s.email,
            "image_url": s.image_url,
            "expertise": s.expertise,
            "tier": s.tier,
            "display_order": s.display_order,
            "is_active": s.is_active,
            "created_at": s.created_at,
            "image_asset_id": image_asset_id,
            "image_width": image_width,
            "image_height": image_height,
            "image_blur_placeholder": image_blur,
            "image_srcset": image_srcset,
            "image_sizes": image_sizes,
            "image_optimized_url": image_optimized_url,
        })

    return out


@router.get("/doingu/staff/reactions")
async def get_staff_reactions_bulk(ids: str = Query(..., description="Comma-separated staff ids"), db: Session = Depends(get_db), request: Request = None):
    """Return whether the current user has reacted for each staff id.

    Public response DOES NOT include aggregate counts. Instead returns a mapping:
    { <staff_id>: { "reacted": bool, "reaction_type": Optional[str] }, ... }
    If an Authorization Bearer token is provided and valid, the endpoint will
    indicate whether that user has reacted for each staff id. Otherwise all
    items will indicate `reacted: false`.
    """
    _ensure_staff_reactions_table(db)

    # Optional user detection from Authorization header (do not raise if missing/invalid)
    user = None
    auth_header = None
    if request is not None:
        auth_header = request.headers.get('authorization') or request.headers.get('Authorization')
    if auth_header and isinstance(auth_header, str) and auth_header.lower().startswith('bearer '):
        token = auth_header.split(' ', 1)[1].strip()
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get('sub')
            if email:
                user = db.query(User).filter(User.email == email).first()
        except JWTError:
            user = None

    try:
        id_list = [int(x) for x in ids.split(",") if x.strip()]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ids parameter")

    # Default: no reaction by current user
    result = {sid: {"reacted": False, "reaction_type": None} for sid in id_list}

    if not user:
        return result

    try:
        rows = (
            db.query(StaffReaction.staff_id, StaffReaction.reaction_type)
            .filter(StaffReaction.staff_id.in_(id_list), StaffReaction.user_id == user.id)
            .all()
        )
    except (OperationalError, ProgrammingError) as exc:
        if not _is_missing_staff_reactions_error(exc):
            raise
        _ensure_staff_reactions_table(db)
        rows = (
            db.query(StaffReaction.staff_id, StaffReaction.reaction_type)
            .filter(StaffReaction.staff_id.in_(id_list), StaffReaction.user_id == user.id)
            .all()
        )

    for staff_id, reaction_type in rows:
        result[staff_id] = {"reacted": True, "reaction_type": reaction_type}

    return result


@router.post("/doingu/staff/{staff_id}/react")
async def post_staff_reaction(
    staff_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    _ensure_staff_reactions_table(db)
    reaction_type = (payload.get("reaction_type") or "").strip()
    if not reaction_type:
        raise HTTPException(status_code=400, detail="reaction_type required")

    # normalize and validate reaction type; explicitly disallow removed types like 'clap'
    reaction_type = reaction_type.lower()
    if reaction_type in ("clap", "👏"):
        raise HTTPException(status_code=400, detail="reaction_type 'clap' is no longer supported")
    if reaction_type not in VALID_STAFF_REACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid reaction_type: {reaction_type}")

    staff = db.query(StaffProfile).filter(StaffProfile.id == staff_id, StaffProfile.is_active == True).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    # Prefer a simple toggle/update behavior for reactions:
    # - If the user has not reacted, create a new reaction (reacted: True)
    # - If the user reacted with the same type, remove the reaction (reacted: False)
    # - If the user reacted with a different type, update to the new type (reacted: True)

    try:
        existing = (
            db.query(StaffReaction)
            .filter(StaffReaction.staff_id == staff_id, StaffReaction.user_id == user.id)
            .first()
        )
    except (OperationalError, ProgrammingError) as exc:
        if not _is_missing_staff_reactions_error(exc):
            raise
        _ensure_staff_reactions_table(db)
        existing = None

    # If no existing reaction, insert one
    if not existing:
        try:
            sr = StaffReaction(staff_id=staff_id, user_id=user.id, reaction_type=reaction_type)
            db.add(sr)
            db.commit()
            return {"reacted": True, "reaction_type": reaction_type}
        except IntegrityError:
            db.rollback()
            # race: fetch existing and fall through to update/toggle handling
            existing = (
                db.query(StaffReaction)
                .filter(StaffReaction.staff_id == staff_id, StaffReaction.user_id == user.id)
                .first()
            )
        except (OperationalError, ProgrammingError) as exc:
            if not _is_missing_staff_reactions_error(exc):
                raise
            _ensure_staff_reactions_table(db)
            try:
                sr = StaffReaction(staff_id=staff_id, user_id=user.id, reaction_type=reaction_type)
                db.add(sr)
                db.commit()
                return {"reacted": True, "reaction_type": reaction_type}
            except IntegrityError:
                db.rollback()
                existing = (
                    db.query(StaffReaction)
                    .filter(StaffReaction.staff_id == staff_id, StaffReaction.user_id == user.id)
                    .first()
                )

    # At this point `existing` should be present
    if existing:
        # If same type -> remove (toggle off)
        if existing.reaction_type == reaction_type:
            try:
                db.delete(existing)
                db.commit()
                return {"reacted": False, "reaction_type": None}
            except Exception:
                db.rollback()
                raise HTTPException(status_code=500, detail="Failed to remove reaction")

        # Different type -> update
        try:
            existing.reaction_type = reaction_type
            db.commit()
            return {"reacted": True, "reaction_type": reaction_type}
        except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to update reaction")


@router.get("/users/{user_id:int}", response_model=PublicProfileOut)
async def get_public_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only include approved submissions authored by this user's email
    submissions = (
        db.query(Submission)
        .filter(Submission.student_email == user.email, Submission.status == "approved")
        .order_by(Submission.created_at.desc())
        .all()
    )

    return {"user": user, "submissions": submissions}


@router.post('/users/{user_id}/follow')
async def follow_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Lightweight follow endpoint (frontend-friendly stub).
    # For now this does not persist followers; it validates target exists and returns success.
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "ok", "following": True}

@router.get("/submissions", response_model=List[SubmissionOut])
async def get_public_submissions(db: Session = Depends(get_db)):
    # Only show approved submissions to the public
    return db.query(Submission).filter(Submission.status == "approved").order_by(Submission.created_at.desc()).all()


@router.get("/submissions/votes/me", response_model=List[int])
async def get_my_voted_submission_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    try:
        rows = db.query(SubmissionVote.submission_id).filter(SubmissionVote.user_id == current_user.id).all()
        return [row[0] for row in rows]
    except (OperationalError, ProgrammingError) as exc:
        if _is_missing_submission_votes_error(exc):
            _ensure_submission_votes_table(db)
            rows = db.query(SubmissionVote.submission_id).filter(SubmissionVote.user_id == current_user.id).all()
            return [row[0] for row in rows]
        raise

@router.post("/submissions", response_model=SubmissionOut)
async def create_public_submission(
    sub: SubmissionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    verify_recaptcha_or_raise(sub.recaptcha_token, action="submission_create")
    normalized_title, normalized_content, normalized_student_name = _normalize_submission_payload(
        sub.title,
        sub.content,
        sub.student_name,
    )

    new_sub = Submission(
        title=normalized_title,
        content=normalized_content,
        student_name=current_user.full_name or normalized_student_name,
        student_email=current_user.email,
        status="pending",
        votes=0,
    )
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
    # Persist notifications for admin users
    try:
        admin_users = db.query(User).filter(User.role.in_(["admin", "website_manager", "submission_judge"]) ).all()
        for u in admin_users:
            n = Notification(user_id=u.id, title=f"Bài mới: {new_sub.title}", body=f"Sinh viên {new_sub.student_name} vừa gửi một bài dự thi mới.", url=f"/submissions/{new_sub.id}")
            db.add(n)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
    
    return new_sub


@router.post("/submissions/upload", response_model=SubmissionOut)
async def create_submission_with_pdf(
    title: str = Form(...),
    content: str = Form(...),
    student_name: Optional[str] = Form(None),
    recaptcha_token: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    verify_recaptcha_or_raise(recaptcha_token, action="submission_create")
    normalized_title, normalized_content, normalized_student_name = _normalize_submission_payload(
        title,
        content,
        student_name,
    )

    attachment_url = None
    if file and file.filename:
        filename_lower = file.filename.lower()
        if not filename_lower.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file PDF")

        payload = await file.read()
        if not payload:
            raise HTTPException(status_code=400, detail="Tệp PDF rỗng")
        if len(payload) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail="File PDF vượt quá dung lượng cho phép")

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid.uuid4().hex}.pdf"
        target = UPLOAD_DIR / stored_name
        target.write_bytes(payload)
        attachment_url = f"/api/public/submissions/files/{stored_name}"

    new_sub = Submission(
        title=normalized_title,
        content=normalized_content,
        attachment_url=attachment_url,
        student_name=current_user.full_name or normalized_student_name,
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
        "message": f"Sinh viên {new_sub.student_name} vừa gửi một bài dự thi mới.",
        "id": new_sub.id
    })
    try:
        admin_users = db.query(User).filter(User.role.in_(["admin", "website_manager", "submission_judge"]) ).all()
        for u in admin_users:
            n = Notification(user_id=u.id, title=f"Bài mới: {new_sub.title}", body=f"Sinh viên {new_sub.student_name} vừa gửi một bài dự thi mới.", url=f"/submissions/{new_sub.id}")
            db.add(n)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    return new_sub


@router.get("/submissions/files/{filename}")
async def get_submission_file(filename: str):
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    safe_name = Path(filename).name
    target = UPLOAD_DIR / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path=str(target), media_type="application/pdf", filename=safe_name)


@router.get("/uploads/images/{filename}")
async def get_uploaded_image(
    filename: str,
    request: Request,
    w: Optional[int] = Query(None, ge=64, le=2048),
    fmt: Optional[str] = Query(None),
):
    # Only allow common image types
    allowed_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"}
    safe_name = Path(filename).name
    if not any(safe_name.lower().endswith(ext) for ext in allowed_exts):
        raise HTTPException(status_code=400, detail="Invalid file type")

    target = IMAGE_UPLOAD_DIR / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Basic hotlink protection: if Referer/Origin header present and not in allowed origins, deny.
    referer = request.headers.get("referer") or request.headers.get("origin")
    if referer:
        from urllib.parse import urlparse
        try:
            ref_host = urlparse(referer).netloc.split(":")[0]
        except Exception:
            ref_host = None

        allowed_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
        allowed_hosts = [urlparse(o).netloc.split(":")[0] if "//" in o else o for o in allowed_origins_env.split(",") if o.strip()]
        trusted_hosts_env = os.getenv("TRUSTED_HOSTS", "")
        for t in [item.strip() for item in trusted_hosts_env.split(",") if item.strip()]:
            allowed_hosts.append(t)

        if ref_host and ref_host not in allowed_hosts:
            raise HTTPException(status_code=403, detail="Access denied")

    # Fast path: original file with immutable caching (filename is UUID-based).
    if not w and not fmt:
        mime_type, _ = mimetypes.guess_type(str(target))
        headers = {"Cache-Control": "public, max-age=31536000, immutable"}
        return FileResponse(path=str(target), media_type=mime_type or "application/octet-stream", headers=headers)

    if not _is_resizable_image(safe_name):
        raise HTTPException(status_code=400, detail="Image transformation is only supported for jpg, jpeg, png, webp")

    desired_width = int(w or 640)
    desired_fmt = (fmt or "webp").lower()
    try:
        variant_path = _ensure_image_variant(target, desired_width, desired_fmt)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Could not generate image variant")

    media_type = "image/webp"
    if variant_path.suffix.lower() in {".jpg", ".jpeg"}:
        media_type = "image/jpeg"

    headers = {"Cache-Control": "public, max-age=31536000, immutable"}
    return FileResponse(path=str(variant_path), media_type=media_type, headers=headers)


@router.get("/uploads/videos/{filename}")
async def get_uploaded_video(filename: str, request: Request):
    allowed_exts = {".mp4", ".webm", ".ogg", ".mov", ".m4v"}
    safe_name = Path(filename).name
    if not any(safe_name.lower().endswith(ext) for ext in allowed_exts):
        raise HTTPException(status_code=400, detail="Invalid file type")

    target = VIDEO_UPLOAD_DIR / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    referer = request.headers.get("referer") or request.headers.get("origin")
    if referer:
        from urllib.parse import urlparse
        try:
            ref_host = urlparse(referer).netloc.split(":")[0]
        except Exception:
            ref_host = None

        allowed_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
        allowed_hosts = [urlparse(o).netloc.split(":")[0] if "//" in o else o for o in allowed_origins_env.split(",") if o.strip()]
        trusted_hosts_env = os.getenv("TRUSTED_HOSTS", "")
        for t in [item.strip() for item in trusted_hosts_env.split(",") if item.strip()]:
            allowed_hosts.append(t)

        if ref_host and ref_host not in allowed_hosts:
            raise HTTPException(status_code=403, detail="Access denied")

    import mimetypes
    mime_type, _ = mimetypes.guess_type(str(target))
    headers = {"Cache-Control": "public, max-age=86400"}
    return FileResponse(path=str(target), media_type=mime_type or "video/mp4", headers=headers)


@router.post("/submissions/contestant", response_model=SubmissionOut)
async def create_contestant_submission(
    sub: SubmissionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_recaptcha_or_raise(sub.recaptcha_token, action="submission_create")
    normalized_title, normalized_content, normalized_student_name = _normalize_submission_payload(
        sub.title,
        sub.content,
        sub.student_name,
    )

    new_sub = Submission(
        title=normalized_title,
        content=normalized_content,
        student_name=current_user.full_name or normalized_student_name,
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

    try:
        admin_users = db.query(User).filter(User.role.in_(["admin", "website_manager", "submission_judge"]) ).all()
        for u in admin_users:
            n = Notification(user_id=u.id, title=f"Bài mới: {new_sub.title}", body=f"Thí sinh {new_sub.student_name or current_user.email} vừa gửi bài dự thi.", url=f"/submissions/{new_sub.id}")
            db.add(n)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
    return new_sub


@router.post("/push/subscribe")
async def public_push_subscribe(payload: PushSubscriptionIn, db: Session = Depends(get_db)):
    endpoint = (payload.endpoint or "").strip()
    if not endpoint:
        raise HTTPException(status_code=400, detail="Missing endpoint")

    # idempotent insert
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).first()
    if existing:
        existing.p256dh = payload.p256dh
        existing.auth = payload.auth
        db.commit()
        return {"message": "already_registered", "registered": True}

    sub = PushSubscription(user_id=None, endpoint=endpoint, p256dh=payload.p256dh, auth=payload.auth)
    db.add(sub)
    db.commit()
    return {"message": "registered", "registered": True}


@router.get('/push/vapid')
async def get_vapid():
    import os
    key = os.getenv('VAPID_PUBLIC_KEY', '')
    return {"vapid_key": key}


@router.get('/site-texts')
async def get_public_site_texts():
    """Return site-level editable texts (frontend uses for main page)."""
    path = Path(__file__).parent.parent / 'site_texts.json'
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return {}


@router.get("/submissions/me", response_model=List[SubmissionOut])
async def get_my_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Submission)
        .filter(Submission.student_email == current_user.email)
        .order_by(Submission.created_at.desc())
        .all()
    )

@router.post("/submissions/{sub_id}/vote")
async def vote_submission(
    sub_id: int,
    payload: VoteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_recaptcha_or_raise(payload.recaptcha_token, action="submission_vote")

    submission = db.query(Submission).filter(Submission.id == sub_id, Submission.status == "approved").first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found or not approved")

    _ensure_submission_votes_table(db)

    try:
        existing_vote = (
            db.query(SubmissionVote)
            .filter(SubmissionVote.submission_id == sub_id, SubmissionVote.user_id == current_user.id)
            .first()
        )
    except (OperationalError, ProgrammingError) as exc:
        if not _is_missing_submission_votes_error(exc):
            raise
        _ensure_submission_votes_table(db)
        existing_vote = (
            db.query(SubmissionVote)
            .filter(SubmissionVote.submission_id == sub_id, SubmissionVote.user_id == current_user.id)
            .first()
        )
    if existing_vote:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Bạn đã bình chọn cho bài thi này rồi",
                "votes": submission.votes,
            },
        )

    vote = SubmissionVote(submission_id=sub_id, user_id=current_user.id)
    db.add(vote)
    # Atomic increment to avoid race conditions
    db.query(Submission).filter(Submission.id == sub_id).update({Submission.votes: (Submission.votes or 0) + 1})

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        latest_submission = db.query(Submission).filter(Submission.id == sub_id).first()
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Bạn đã bình chọn cho bài thi này rồi",
                "votes": latest_submission.votes if latest_submission else None,
            },
        )

    db.refresh(submission)
    return {"message": "Vote recorded", "votes": submission.votes, "submission_id": submission.id}


@router.delete("/submissions/{sub_id}/vote")
async def unvote_submission(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = db.query(Submission).filter(Submission.id == sub_id, Submission.status == "approved").first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found or not approved")

    _ensure_submission_votes_table(db)

    existing_vote = (
        db.query(SubmissionVote)
        .filter(SubmissionVote.submission_id == sub_id, SubmissionVote.user_id == current_user.id)
        .first()
    )
    if existing_vote:
        db.delete(existing_vote)
        # Atomic decrement
        db.query(Submission).filter(Submission.id == sub_id).update({Submission.votes: func.max(0, (Submission.votes or 0) - 1)})
        db.commit()
        db.refresh(submission)

    return {"message": "Vote removed", "votes": submission.votes, "submission_id": submission.id}


@router.get("/submissions/{sub_id}/comments", response_model=List[SubmissionCommentOut])
async def get_submission_comments(sub_id: int, db: Session = Depends(get_db)):
    submission = db.query(Submission).filter(Submission.id == sub_id, Submission.status == "approved").first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found or not approved")

    comments = (
        db.query(Comment)
        .filter(Comment.submission_id == sub_id, Comment.is_visible == True)
        .order_by(Comment.created_at.desc())
        .all()
    )
    return [_build_comment_out(item, db) for item in comments]


@router.post("/submissions/{sub_id}/comments", response_model=SubmissionCommentOut)
async def create_submission_comment(
    sub_id: int,
    payload: SubmissionCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_contestant),
):
    verify_recaptcha_or_raise(payload.recaptcha_token, action="submission_comment")

    submission = db.query(Submission).filter(Submission.id == sub_id, Submission.status == "approved").first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found or not approved")

    normalized_content = _validate_comment_content(payload.content)
    comment = Comment(
        content=normalized_content,
        user_id=current_user.id,
        submission_id=sub_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _build_comment_out(comment, db)


@router.get("/publications/{pub_id}/comments", response_model=List[PublicationCommentOut])
async def get_publication_comments(pub_id: int, request: Request, db: Session = Depends(get_db)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    comments = (
        db.query(Comment)
        .filter(Comment.publication_id == pub_id, Comment.is_visible == True)
        .order_by(Comment.created_at.desc())
        .all()
    )

    comment_ids = [c.id for c in comments]
    reaction_stats: Dict[int, Dict[str, int]] = {}
    user_reactions: Dict[int, str] = {}

    if comment_ids:
        rows = (
            db.query(CommentReaction.comment_id, CommentReaction.reaction_type, func.count(CommentReaction.id))
            .filter(CommentReaction.comment_id.in_(comment_ids))
            .group_by(CommentReaction.comment_id, CommentReaction.reaction_type)
            .all()
        )
        for comment_id, reaction_type, count in rows:
            entry = reaction_stats.setdefault(int(comment_id), {"like": 0, "dislike": 0})
            if reaction_type in VALID_COMMENT_REACTION_TYPES:
                entry[reaction_type] = int(count)

        current_user = _resolve_request_user(request, db)
        if current_user:
            user_rows = (
                db.query(CommentReaction.comment_id, CommentReaction.reaction_type)
                .filter(CommentReaction.comment_id.in_(comment_ids), CommentReaction.user_id == current_user.id)
                .all()
            )
            user_reactions = {int(comment_id): reaction_type for comment_id, reaction_type in user_rows}

    return [
        _build_publication_comment_out(item, db, reaction_stats=reaction_stats, user_reactions=user_reactions)
        for item in comments
    ]


@router.post("/publications/{pub_id}/comments", response_model=PublicationCommentOut)
async def create_publication_comment(
    pub_id: int,
    payload: PublicationCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_recaptcha_or_raise(payload.recaptcha_token, action="publication_comment")

    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")
    if not getattr(pub, 'comments_enabled', True):
        raise HTTPException(status_code=403, detail="Comments are disabled for this publication")

    normalized_content = _validate_comment_content(payload.content)

    parent_id = getattr(payload, 'parent_id', None)
    if parent_id is not None:
        parent = db.query(Comment).filter(Comment.id == parent_id, Comment.publication_id == pub_id).first()
        if not parent:
            raise HTTPException(status_code=400, detail="Parent comment not found or belongs to a different publication")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="Cannot reply to a reply — only one level of nesting allowed")
    else:
        parent = None

    comment = Comment(
        content=normalized_content,
        user_id=current_user.id,
        publication_id=pub_id,
        parent_id=parent_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Handle mentions: create CommentMention rows and notifications (best-effort)
    mention_ids = _extract_mentions_from_html(normalized_content)
    mention_failed = False
    for uid in mention_ids:
        try:
            if uid == current_user.id:
                continue
            target = db.query(User).filter(User.id == uid, User.is_active == True).first()
            if not target:
                continue
            cm = CommentMention(comment_id=comment.id, user_id=uid)
            db.add(cm)
            n = Notification(
                user_id=uid,
                title=f"{current_user.full_name or current_user.email} đã nhắc tới bạn trong bình luận",
                body=f"Bình luận mới trên bài: {pub.title}",
                url=f"/posts/{pub.id}#comment-{comment.id}",
            )
            db.add(n)
        except Exception:
            mention_failed = True
            continue

    # Notify parent comment owner when someone replies to their comment.
    if parent and parent.user_id and parent.user_id != current_user.id:
        try:
            target = db.query(User).filter(User.id == parent.user_id, User.is_active == True).first()
            if target:
                n = Notification(
                    user_id=target.id,
                    title=f"{current_user.full_name or current_user.email} đã trả lời bình luận của bạn",
                    body=f"Bài viết: {pub.title}",
                    url=f"/posts/{pub.id}#comment-{comment.id}",
                )
                db.add(n)
        except Exception:
            mention_failed = True

    if mention_failed:
        try:
            db.rollback()
        except Exception:
            pass
    else:
        try:
            db.commit()
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass

    # Broadcast a lightweight event for frontends (best-effort)
    try:
        await manager.broadcast({
            "type": "new_publication_comment",
            "publication_id": pub.id,
            "comment_id": comment.id,
            "message": f"New comment on {pub.title}",
        })
    except Exception:
        pass

    return _build_publication_comment_out(comment, db)


@router.delete("/publications/{pub_id}/comments/{comment_id}")
async def delete_own_publication_comment(
    pub_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.publication_id == pub_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")

    # Delete child replies and their mentions
    children = db.query(Comment).filter(Comment.parent_id == comment_id).all()
    for child in children:
        db.query(CommentReaction).filter(CommentReaction.comment_id == child.id).delete()
        db.query(CommentMention).filter(CommentMention.comment_id == child.id).delete()
        db.delete(child)

    db.query(CommentReaction).filter(CommentReaction.comment_id == comment_id).delete()
    db.query(CommentMention).filter(CommentMention.comment_id == comment_id).delete()
    db.delete(comment)
    db.commit()
    return {"deleted": True, "id": comment_id}


@router.post("/publications/{pub_id}/comments/{comment_id}/react")
async def react_publication_comment(
    pub_id: int,
    comment_id: int,
    payload: CommentReactionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reaction_type = (payload.reaction_type or "").strip().lower()
    if reaction_type not in VALID_COMMENT_REACTION_TYPES:
        raise HTTPException(status_code=400, detail="Invalid reaction type")

    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.publication_id == pub_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    existing = (
        db.query(CommentReaction)
        .filter(CommentReaction.comment_id == comment_id, CommentReaction.user_id == current_user.id)
        .first()
    )
    if existing:
        existing.reaction_type = reaction_type
    else:
        db.add(CommentReaction(comment_id=comment_id, user_id=current_user.id, reaction_type=reaction_type))
    db.commit()

    like_count = (
        db.query(func.count(CommentReaction.id))
        .filter(CommentReaction.comment_id == comment_id, CommentReaction.reaction_type == "like")
        .scalar()
        or 0
    )
    dislike_count = (
        db.query(func.count(CommentReaction.id))
        .filter(CommentReaction.comment_id == comment_id, CommentReaction.reaction_type == "dislike")
        .scalar()
        or 0
    )

    return {
        "comment_id": comment_id,
        "user_reaction": reaction_type,
        "like_count": int(like_count),
        "dislike_count": int(dislike_count),
    }


@router.delete("/publications/{pub_id}/comments/{comment_id}/react")
async def unreact_publication_comment(
    pub_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.publication_id == pub_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    (
        db.query(CommentReaction)
        .filter(CommentReaction.comment_id == comment_id, CommentReaction.user_id == current_user.id)
        .delete()
    )
    db.commit()

    like_count = (
        db.query(func.count(CommentReaction.id))
        .filter(CommentReaction.comment_id == comment_id, CommentReaction.reaction_type == "like")
        .scalar()
        or 0
    )
    dislike_count = (
        db.query(func.count(CommentReaction.id))
        .filter(CommentReaction.comment_id == comment_id, CommentReaction.reaction_type == "dislike")
        .scalar()
        or 0
    )

    return {
        "comment_id": comment_id,
        "user_reaction": None,
        "like_count": int(like_count),
        "dislike_count": int(dislike_count),
    }


@router.get("/users/mentions", response_model=List[PublicProfileOut])
async def mention_user_search(q: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Return users for mention autocomplete. Require auth.
    query_text = (q or "").strip().lower()
    base_users = db.query(User).filter(User.is_active == True).limit(300).all()

    def user_score(u: User) -> int:
        score = 100
        username = _derive_username(u).lower()
        full_name = str(u.full_name or "").lower()
        email = str(u.email or "").lower()

        if not query_text:
            # Prefer current user first in empty query.
            return 0 if current_user and u.id == current_user.id else score

        if query_text.isdigit():
            qid = int(query_text)
            if u.id == qid:
                return -1000

        if current_user and u.id == current_user.id and query_text.isdigit() and str(u.id).startswith(query_text):
            score -= 200

        if username == query_text:
            score -= 300
        elif username.startswith(query_text):
            score -= 220
        elif query_text in username:
            score -= 160

        if full_name == query_text:
            score -= 140
        elif full_name.startswith(query_text):
            score -= 110
        elif query_text in full_name:
            score -= 70

        if email == query_text:
            score -= 120
        elif email.startswith(query_text):
            score -= 90
        elif query_text in email:
            score -= 60

        if query_text.isdigit() and query_text in str(u.id):
            score -= 40

        return score

    filtered = []
    for u in base_users:
        if not query_text:
            filtered.append(u)
            continue
        username = _derive_username(u).lower()
        full_name = str(u.full_name or "").lower()
        email = str(u.email or "").lower()
        if (
            query_text in username
            or query_text in full_name
            or query_text in email
            or (query_text.isdigit() and query_text in str(u.id))
        ):
            filtered.append(u)

    results = sorted(filtered, key=lambda u: (user_score(u), (u.full_name or "").lower(), u.id))[:12]

    out = []
    for u in results:
        out.append({
            "user": {
                "id": u.id,
                "email": u.email,
                "role": u.role,
                "full_name": u.full_name,
                "image_url": getattr(u, 'image_url', None),
                "is_active": bool(u.is_active),
                "email_verified": u.email_verified,
                "is_subscribed": u.is_subscribed,
            },
            "submissions": [],
        })
    return out


@router.post("/publications/{pub_id}/view")
async def record_publication_view(pub_id: int, session: str = Query(...), db: Session = Depends(get_db)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    existing = (
        db.query(PublicationViewEvent)
        .filter(PublicationViewEvent.publication_id == pub_id, PublicationViewEvent.session_id == session)
        .first()
    )
    if existing:
        return {"viewed": False, "view_count": int(pub.view_count or 0)}

    event = PublicationViewEvent(publication_id=pub_id, session_id=session)
    db.add(event)
    pub.view_count = (pub.view_count or 0) + 1
    db.commit()
    db.refresh(pub)
    return {"viewed": True, "view_count": int(pub.view_count or 0)}


@router.post("/publications/{pub_id}/favorite")
async def add_publication_favorite(pub_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    existing = (
        db.query(PublicationFavorite)
        .filter(PublicationFavorite.publication_id == pub_id, PublicationFavorite.user_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Bạn đã thích ấn phẩm này rồi",
                "favorites": pub.favorites_count,
            },
        )

    try:
        fav = PublicationFavorite(publication_id=pub_id, user_id=user.id)
        db.add(fav)
        pub.favorites_count = (pub.favorites_count or 0) + 1
        db.commit()
        db.refresh(pub)
    except IntegrityError:
        db.rollback()
        db.refresh(pub)
    return {"favorited": True, "favorites_count": int(pub.favorites_count or 0)}


@router.delete("/publications/{pub_id}/favorite")
async def remove_publication_favorite(pub_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    existing = (
        db.query(PublicationFavorite)
        .filter(PublicationFavorite.publication_id == pub_id, PublicationFavorite.user_id == user.id)
        .first()
    )
    if existing:
        db.delete(existing)
        pub.favorites_count = max(0, (pub.favorites_count or 0) - 1)
        db.commit()
        db.refresh(pub)

    return {"favorited": False, "favorites_count": int(pub.favorites_count or 0)}


@router.post("/publications/{pub_id}/vote")
async def add_publication_vote(pub_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    existing = (
        db.query(PublicationVote)
        .filter(PublicationVote.publication_id == pub_id, PublicationVote.user_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Bạn đã bình chọn cho ấn phẩm này rồi",
                "votes": pub.votes_count,
            },
        )

    try:
        vote = PublicationVote(publication_id=pub_id, user_id=user.id)
        db.add(vote)
        # Atomic increment
        db.query(Publication).filter(Publication.id == pub_id).update({Publication.votes_count: (Publication.votes_count or 0) + 1})
        db.commit()
        db.refresh(pub)
    except IntegrityError:
        db.rollback()
        db.refresh(pub)
    return {"voted": True, "votes_count": int(pub.votes_count or 0)}


@router.delete("/publications/{pub_id}/vote")
async def remove_publication_vote(pub_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    existing = (
        db.query(PublicationVote)
        .filter(PublicationVote.publication_id == pub_id, PublicationVote.user_id == user.id)
        .first()
    )
    if existing:
        db.delete(existing)
        # Atomic decrement
        db.query(Publication).filter(Publication.id == pub_id).update({Publication.votes_count: func.max(0, (Publication.votes_count or 0) - 1)})
        db.commit()
        db.refresh(pub)

    return {"voted": False, "votes_count": int(pub.votes_count or 0)}


@router.get("/publications/{pub_id}/engagement")
async def get_publication_engagement(pub_id: int, request: Request, db: Session = Depends(get_db)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publication not found")

    result = {
        "view_count": int(pub.view_count or 0),
        "favorites_count": int(pub.favorites_count or 0),
        "votes_count": int(pub.votes_count or 0),
        "favorited": False,
        "voted": False,
    }

    user = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            payload = jwt.decode(auth_header[7:], SECRET_KEY, algorithms=[ALGORITHM])
            sub = payload.get("sub")
            if sub:
                try:
                    user = db.query(User).filter(User.id == int(sub)).first()
                except (ValueError, TypeError):
                    user = db.query(User).filter(User.email == sub).first()
        except Exception:
            user = None

    if user:
        result["favorited"] = (
            db.query(PublicationFavorite)
            .filter(PublicationFavorite.publication_id == pub_id, PublicationFavorite.user_id == user.id)
            .first()
            is not None
        )
        result["voted"] = (
            db.query(PublicationVote)
            .filter(PublicationVote.publication_id == pub_id, PublicationVote.user_id == user.id)
            .first()
            is not None
        )

    return result
