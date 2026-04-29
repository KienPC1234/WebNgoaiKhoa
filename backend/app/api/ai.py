from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import httpx
import hashlib
import json
import os
import re
import time
import unicodedata
import logging
from collections import deque
from typing import Optional, Dict, List, Any, Tuple, Deque
from dotenv import load_dotenv
from datetime import datetime, timezone
from uuid import uuid4
from pathlib import Path
from io import BytesIO
try:
    import chromadb
    from chromadb.config import Settings
except Exception:
    chromadb = None
    Settings = None
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.publication import Event, Publication, Story, Submission

load_dotenv()

router = APIRouter()

# Module logger for recording internal errors without exposing details to clients
logger = logging.getLogger(__name__)

class ChatRequestHistoryItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    model: Optional[str] = None
    enable_tools: Optional[bool] = True
    history: Optional[List[ChatRequestHistoryItem]] = None


class ChatFeedbackRequest(BaseModel):
    session_id: str
    message_id: str
    rating: int
    comment: Optional[str] = None


class ChatHistoryItem(BaseModel):
    id: str
    role: str
    content: str
    created_at: str


chat_sessions: Dict[str, List[dict]] = {}
chat_feedbacks: List[dict] = []

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:120b-cloud")
CHROMA_COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "webngoaikhoa_knowledge")
NAV_CHROMA_COLLECTION_NAME = os.getenv("CHROMA_NAV_COLLECTION_NAME", "webngoaikhoa_navigation")
CHROMA_DB_PATH = os.getenv(
    "CHROMA_DB_PATH",
    str(Path(__file__).resolve().parent.parent.parent / "chroma_db"),
)
STATIC_SITE_KNOWLEDGE_PATH = Path(
    os.getenv(
        "AI_STATIC_SITE_KNOWLEDGE_PATH",
        str(Path(CHROMA_DB_PATH) / "static_site_knowledge.json"),
    )
)

_chroma_client = None
_chroma_collection = None
_http_client: Optional[httpx.AsyncClient] = None
KNOWLEDGE_INDEX_PATH = Path(CHROMA_DB_PATH) / "knowledge_assets.json"
_last_sync_at: Optional[str] = None
_last_sync_monotonic: Optional[float] = None
_last_static_sync_at: Optional[str] = None
_last_static_sync_monotonic: Optional[float] = None
_last_static_sync_hash: Optional[str] = None
_last_static_source_mtime: Optional[float] = None
AI_SYNC_MIN_INTERVAL_SECONDS = max(0, int(os.getenv("AI_SYNC_MIN_INTERVAL_SECONDS", "180")))
AI_STATIC_SYNC_MIN_INTERVAL_SECONDS = max(0, int(os.getenv("AI_STATIC_SYNC_MIN_INTERVAL_SECONDS", "900")))
AI_RESPONSE_TEMPERATURE = float(os.getenv("AI_RESPONSE_TEMPERATURE", "0.1"))
AI_RESPONSE_TOP_P = float(os.getenv("AI_RESPONSE_TOP_P", "0.85"))
AI_MAX_HISTORY_MESSAGES = 8
AI_MAX_USER_MESSAGE_CHARS = max(200, int(os.getenv("AI_MAX_USER_MESSAGE_CHARS", "2400")))
AI_MAX_HISTORY_MESSAGE_CHARS = max(120, int(os.getenv("AI_MAX_HISTORY_MESSAGE_CHARS", "1200")))

# Configurable constants for chunking, snippets and retrieval behavior
AI_CHUNK_SIZE_DEFAULT = int(os.getenv("AI_CHUNK_SIZE", "600"))
AI_CHUNK_OVERLAP_DEFAULT = int(os.getenv("AI_CHUNK_OVERLAP", "180"))
AI_RETRIEVE_PER_DOC_CHARS = int(os.getenv("AI_RETRIEVE_PER_DOC_CHARS", "600"))
AI_SEARCH_SNIPPET_CHARS = int(os.getenv("AI_SEARCH_SNIPPET_CHARS", "240"))
AI_RETRIEVE_MAX_TOTAL_CHARS = int(os.getenv("AI_RETRIEVE_MAX_TOTAL_CHARS", "4000"))
AI_RETRIEVE_MAX_DOCS = int(os.getenv("AI_RETRIEVE_MAX_DOCS", "6"))
AI_RETRIEVE_ASSEMBLE_DOCS = os.getenv("AI_RETRIEVE_ASSEMBLE_DOCS", "true").lower() in ("1","true","yes")

# Truncation constants for other places
AI_NAV_BODY_TRUNC = int(os.getenv("AI_NAV_BODY_TRUNC", "900"))
AI_EVENT_SNIPPET_TRUNC = int(os.getenv("AI_EVENT_SNIPPET_TRUNC", "260"))
AI_TITLE_TRUNC = int(os.getenv("AI_TITLE_TRUNC", "250"))
AI_PATH_TRUNC = int(os.getenv("AI_PATH_TRUNC", "180"))
AI_META_CATEGORY_TRUNC = int(os.getenv("AI_META_CATEGORY_TRUNC", "80"))
AI_META_STUDENT_NAME_TRUNC = int(os.getenv("AI_META_STUDENT_NAME_TRUNC", "160"))
AI_META_STATUS_TRUNC = int(os.getenv("AI_META_STATUS_TRUNC", "40"))
AI_META_UPLOADED_BY_TRUNC = int(os.getenv("AI_META_UPLOADED_BY_TRUNC", "120"))
AI_NAV_MATCH_SNIPPET_TRUNC = int(os.getenv("AI_NAV_MATCH_SNIPPET_TRUNC", "220"))

AI_RATE_LIMIT_CHAT_COUNT = max(1, int(os.getenv("AI_RATE_LIMIT_CHAT_COUNT", "8")))
AI_RATE_LIMIT_CHAT_WINDOW_SECONDS = max(1, int(os.getenv("AI_RATE_LIMIT_CHAT_WINDOW_SECONDS", "60")))
AI_RATE_LIMIT_CHAT_BASIC_COUNT = max(1, int(os.getenv("AI_RATE_LIMIT_CHAT_BASIC_COUNT", "8")))
AI_RATE_LIMIT_CHAT_BASIC_WINDOW_SECONDS = max(1, int(os.getenv("AI_RATE_LIMIT_CHAT_BASIC_WINDOW_SECONDS", "60")))
AI_RATE_LIMIT_NAV_SEARCH_COUNT = max(1, int(os.getenv("AI_RATE_LIMIT_NAV_SEARCH_COUNT", "6")))
AI_RATE_LIMIT_NAV_SEARCH_WINDOW_SECONDS = max(1, int(os.getenv("AI_RATE_LIMIT_NAV_SEARCH_WINDOW_SECONDS", "60")))
AI_RATE_LIMIT_KNOWLEDGE_SEARCH_COUNT = max(1, int(os.getenv("AI_RATE_LIMIT_KNOWLEDGE_SEARCH_COUNT", "8")))
AI_RATE_LIMIT_KNOWLEDGE_SEARCH_WINDOW_SECONDS = max(1, int(os.getenv("AI_RATE_LIMIT_KNOWLEDGE_SEARCH_WINDOW_SECONDS", "60")))

RATE_LIMIT_STATE: Dict[str, Deque[float]] = {}

# Cached static public element index (loaded from frontend build output)
_PUBLIC_ELEMENT_INDEX: Optional[Dict[str, Any]] = None

AI_SEARCH_INTENT_KEYWORDS = {
    "tim",
    "tim kiem",
    "tra cuu",
    "tra",
    "kiem",
    "liet ke",
    "goi y",
    "noi dung nao",
    "bai nao",
    "chi tiet",
    "thong tin",
}
AI_NAV_INTENT_KEYWORDS = {
    "mo",
    "mo trang",
    "di den",
    "chuyen den",
    "truy cap",
    "vao trang",
    "toi trang",
    "route",
}
AI_ELEMENT_FOCUS_KEYWORDS = {
    "danh dau",
    "đánh dấu",
    "khoanh vien",
    "khoanh viền",
    "khoanh",
    "highlight",
    "lam noi bat",
    "làm nổi bật",
    "tieu de",
    "tiêu đề",
    "heading",
    "phan tu",
    "phần tử",
    "label",
    "input",
    "field",
    "form",
    "o nhap",
    "ô nhập",
    "o dien",
    "ô điền",
    "nhap",
    "nhập",
    "nhap ten",
    "nhập tên",
    "cho nhap",
    "chỗ nhập",
    "cho dien",
    "chỗ điền",
    "ho va ten",
    "họ và tên",
    "ten tac gia",
    "tên tác giả",
    "tac gia",
    "tác giả",
    "button",
    "scroll",
    "nop",
    "nộp",
    "nop bai",
    "nộp bài",
    "gui",
    "gửi",
    "gui bai",
    "gửi bài",
    "upload",
    "dinh kem",
    "đính kèm",
    "sinh vien",
    "sinh viên",
}
AI_CONTENT_DISCOVERY_KEYWORDS = {
    "bai viet",
    "an pham",
    "nhai ben",
    "su kien",
    "hoat dong",
    "mua he",
    "campus",
    "story",
    "cau chuyen",
    "tin",
}
AI_WEBSITE_SCOPE_HINTS = {
    "to xa hoi",
    "tổ xã hội",
    "fpt",
    "website",
    "trang",
    "route",
    "nhai ben",
    "nhái bén",
    "an pham",
    "ấn phẩm",
    "su kien",
    "sự kiện",
    "phan mon",
    "phân môn",
    "van",
    "ktpl",
    "lich su",
    "dia li",
    "vovinam",
    "dang nhap",
    "dang ky",
    "profile",
    "admin",
}

AI_WEBSITE_SCOPE_FALLBACK = (
    "Mình chỉ hỗ trợ các nội dung liên quan trực tiếp đến website Tổ xã hội (trang, mục, bài viết, "
    "sự kiện, phân môn, và thao tác điều hướng/khoanh viền phần tử trên web). "
    "Bạn hãy nêu câu hỏi theo ngữ cảnh website để mình hỗ trợ chính xác hơn."
)

FACTUAL_GUARDRAILS = (
    "\n\nNGUYÊN TẮC CHỐNG ẢO GIÁC (BẮT BUỘC):\n"
    "- Chỉ khẳng định thông tin khi có trong dữ liệu đã biết (ngữ cảnh/tool/sitemap).\n"
    "- Không bịa số liệu, tên bài, đường dẫn, sự kiện, mốc thời gian hoặc trích dẫn.\n"
    "- Nếu thiếu dữ liệu xác thực: trả lời rõ 'Mình chưa có dữ liệu để xác nhận thông tin này.'\n"
    "- Không suy diễn như sự thật; nếu nêu giả định phải ghi rõ là giả định.\n"
)


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def _enforce_rate_limit(request: Request, scope: str):
    now = time.monotonic()
    ip = _get_client_ip(request)

    if scope == "chat":
        max_count = AI_RATE_LIMIT_CHAT_COUNT
        window_seconds = AI_RATE_LIMIT_CHAT_WINDOW_SECONDS
    elif scope == "chat_basic":
        max_count = AI_RATE_LIMIT_CHAT_BASIC_COUNT
        window_seconds = AI_RATE_LIMIT_CHAT_BASIC_WINDOW_SECONDS
    elif scope == "navigation_search":
        max_count = AI_RATE_LIMIT_NAV_SEARCH_COUNT
        window_seconds = AI_RATE_LIMIT_NAV_SEARCH_WINDOW_SECONDS
    elif scope == "knowledge_search":
        max_count = AI_RATE_LIMIT_KNOWLEDGE_SEARCH_COUNT
        window_seconds = AI_RATE_LIMIT_KNOWLEDGE_SEARCH_WINDOW_SECONDS
    else:
        return

    key = f"{scope}:{ip}"
    bucket = RATE_LIMIT_STATE.setdefault(key, deque())

    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()

    if len(bucket) >= max_count:
        retry_after = max(1, int(window_seconds - (now - bucket[0])))
        raise HTTPException(
            status_code=429,
            detail=f"Quá nhiều yêu cầu. Vui lòng thử lại sau {retry_after}s.",
        )

    bucket.append(now)


def _sanitize_message_content(value: str, max_chars: int) -> str:
    normalized = _normalize_text(value)
    if not normalized:
        return ""
    return normalized[:max_chars]


def _build_model_history(history_items: Optional[List[ChatRequestHistoryItem]]) -> List[Dict[str, str]]:
    if not history_items:
        return []

    safe_history: List[Dict[str, str]] = []
    recent_items = history_items[-AI_MAX_HISTORY_MESSAGES:]

    for item in recent_items:
        role = (item.role or "").strip().lower()
        if role not in {"user", "assistant"}:
            continue

        content = _sanitize_message_content(item.content, AI_MAX_HISTORY_MESSAGE_CHARS)
        if not content:
            continue

        safe_history.append({"role": role, "content": content})

    return safe_history

AI_TOOL_REGISTRY: Dict[str, dict] = {
    "navigate_to_page": {
        "description": "Điều hướng đến trang mục tiêu theo route whitelist.",
        "required_args": ["path"],
    },
    "search_content": {
        "description": "Tìm trang hoặc section phù hợp dựa trên query và sitemap phía client.",
        "required_args": ["query"],
    },
    "scroll_to_target": {
        "description": "Cuộn đến phần tử mục tiêu theo selector hoặc anchor key.",
        "required_args": ["target"],
    },
    "highlight_target": {
        "description": "Làm nổi bật phần tử mục tiêu bằng viền glow trong thời gian ngắn.",
        "required_args": ["target"],
    },
    "open_and_focus": {
        "description": "Tổ hợp hành động navigate -> scroll -> highlight cho một truy vấn điều hướng.",
        "required_args": ["path"],
    },
    "search_ai_knowledge": {
        "description": "Tra cứu AI knowledge để tìm nội dung liên quan trước khi điều hướng.",
        "required_args": ["query"],
    },
    "search_element_index": {
        "description": "Tìm phần tử UI trong public element index theo truy vấn và (tuỳ chọn) route.",
        "required_args": ["query"],
    },
    "compute_selector_for_text": {
        "description": "Tính toán target (anchor/selector/text) tốt nhất cho một cụm từ trên trang.",
        "required_args": ["query"],
    },
}

AI_ROUTE_SITEMAP: List[dict] = [
    {"path": "/", "title": "Trang chủ", "aliases": ["trang chủ", "trang chu", "home", "tổng quan", "tong quan"]},
    {"path": "/doingu/scale", "title": "Quy mô", "aliases": ["quy mô", "quy mo", "giới thiệu", "gioi thieu", "tổ xã hội", "to xa hoi"]},
    {"path": "/doingu/staff", "title": "Đội ngũ", "aliases": ["đội ngũ", "doi ngu", "giáo viên", "giao vien", "staff"]},
    {"path": "/events/upcoming", "title": "Sự kiện sắp tới", "aliases": ["sự kiện", "su kien", "lịch sự kiện", "lich su kien", "workshop"]},
    {"path": "/stories/inspiring", "title": "Câu chuyện truyền cảm hứng", "aliases": ["câu chuyện", "cau chuyen", "truyền cảm hứng", "truyen cam hung", "stories"]},
    {"path": "/doingu/honors", "title": "Vinh danh và giải thưởng", "aliases": ["vinh danh", "giải thưởng", "giai thuong", "honors"]},
    {"path": "/phanmon/van", "title": "Phân môn Ngữ văn", "aliases": ["văn", "van", "ngữ văn", "ngu van", "nhái bén", "nhai ben"]},
    {"path": "/phanmon/ktpl", "title": "Phân môn Kinh tế pháp luật", "aliases": ["ktpl", "kinh tế", "kinh te", "pháp luật", "phap luat"]},
    {"path": "/phanmon/lich-su", "title": "Phân môn Lịch sử", "aliases": ["lịch sử", "lich su", "history"]},
    {"path": "/phanmon/dia-li", "title": "Phân môn Địa lí", "aliases": ["địa lí", "dia li", "geography"]},
    {"path": "/phanmon/vovinam", "title": "Phân môn Vovinam", "aliases": ["vovinam", "võ thuật", "vo thuat"]},
    {"path": "/phanmon/van/cuoc-thi", "title": "Cuộc thi - Ngữ văn", "aliases": ["cuộc thi", "cuoc thi", "cuộc thi văn", "cuoc thi van"]},
    {"path": "/phanmon/ktpl/cuoc-thi", "title": "Cuộc thi - Kinh tế pháp luật", "aliases": ["cuộc thi", "cuoc thi", "cuộc thi ktpl", "cuoc thi ktpl"]},
    {"path": "/phanmon/lich-su/cuoc-thi", "title": "Cuộc thi - Lịch sử", "aliases": ["cuộc thi", "cuoc thi", "cuộc thi lịch sử", "cuoc thi lich su"]},
    {"path": "/phanmon/dia-li/cuoc-thi", "title": "Cuộc thi - Địa lí", "aliases": ["cuộc thi", "cuoc thi", "cuộc thi địa lí", "cuoc thi dia li"]},
    {"path": "/phanmon/vovinam/cuoc-thi", "title": "Cuộc thi - Vovinam", "aliases": ["cuộc thi", "cuoc thi", "cuộc thi vovinam", "cuoc thi vovinam"]},
    {"path": "/profile", "title": "Trang cá nhân", "aliases": ["profile", "tài khoản", "tai khoan", "cá nhân", "ca nhan"]},
    {"path": "/login", "title": "Đăng nhập", "aliases": ["đăng nhập", "dang nhap", "login"]},
    {"path": "/register", "title": "Đăng ký", "aliases": ["đăng ký", "dang ky", "register"]},
    {"path": "/admin/dashboard", "title": "Admin dashboard", "aliases": ["admin", "quan tri", "dashboard"]},
]


def _build_ollama_tools(include_search_tools: bool = True, route_paths: Optional[List[str]] = None) -> List[dict]:
    """Build the tool definitions presented to the upstream model.

    `route_paths` may be provided to include dynamic routes (e.g., /posts/{id}).
    """
    if route_paths is None:
        route_paths = [item["path"] for item in AI_ROUTE_SITEMAP if item.get("path")]
    else:
        # filter and dedupe while preserving order
        cleaned = [p for p in (route_paths or []) if isinstance(p, str) and p]
        route_paths = list(dict.fromkeys(cleaned + [item["path"] for item in AI_ROUTE_SITEMAP if item.get("path")]))

    tools: List[dict] = [
        {
            "type": "function",
            "function": {
                "name": "navigate_to_page",
                "description": AI_TOOL_REGISTRY["navigate_to_page"]["description"],
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "enum": route_paths,
                            "description": "Route path cần mở.",
                        },
                    },
                    "required": ["path"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "scroll_to_target",
                "description": AI_TOOL_REGISTRY["scroll_to_target"]["description"],
                "parameters": {
                    "type": "object",
                    "properties": {
                        "target": {"type": "string", "description": "id/selector/data-ai-anchor cần cuộn đến."},
                        "block": {
                            "type": "string",
                            "enum": ["start", "center", "end", "nearest"],
                            "description": "Vị trí cần canh khi cuộn.",
                        },
                    },
                    "required": ["target"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "highlight_target",
                "description": AI_TOOL_REGISTRY["highlight_target"]["description"],
                "parameters": {
                    "type": "object",
                    "properties": {
                        "target": {"type": "string", "description": "id/selector/data-ai-anchor cần làm nổi bật."},
                        "duration_ms": {
                            "type": "integer",
                            "description": "Thời gian glow (ms), mặc định 2000.",
                        },
                    },
                    "required": ["target"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "open_and_focus",
                "description": AI_TOOL_REGISTRY["open_and_focus"]["description"],
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "enum": route_paths,
                            "description": "Route path cần mở.",
                        },
                        "target": {"type": "string", "description": "id/selector/data-ai-anchor cần focus."},
                        "block": {
                            "type": "string",
                            "enum": ["start", "center", "end", "nearest"],
                            "description": "Vị trí cần canh khi cuộn.",
                        },
                        "duration_ms": {
                            "type": "integer",
                            "description": "Thời gian glow (ms), mặc định 2000.",
                        },
                    },
                    "required": ["path"],
                },
            },
        },
    ]

    if include_search_tools:
        tools.extend(
            [
                {
                    "type": "function",
                    "function": {
                        "name": "search_content",
                        "description": AI_TOOL_REGISTRY["search_content"]["description"],
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "Từ khóa cần tìm."},
                                "limit": {"type": "integer", "description": "Số kết quả tối đa cần trả."},
                            },
                            "required": ["query"],
                        },
                    },
                },
                {
                    "type": "function",
                    "function": {
                        "name": "compute_selector_for_text",
                        "description": AI_TOOL_REGISTRY["compute_selector_for_text"]["description"],
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "Cụm từ cần tìm/khớp trên trang."},
                                "path": {"type": "string", "description": "(Optional) route để ưu tiên."},
                                "limit": {"type": "integer", "description": "Số ứng viên trả về."},
                            },
                            "required": ["query"],
                        },
                    },
                },
                {
                    "type": "function",
                    "function": {
                        "name": "search_element_index",
                        "description": AI_TOOL_REGISTRY["search_element_index"]["description"],
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "Từ khóa phần tử cần tìm."},
                                "route": {"type": "string", "description": "(Optional) đường dẫn để ưu tiên tìm kiếm."},
                                "limit": {"type": "integer", "description": "Số kết quả tối đa cần trả."},
                            },
                            "required": ["query"],
                        },
                    },
                },
                {
                    "type": "function",
                    "function": {
                        "name": "search_ai_knowledge",
                        "description": AI_TOOL_REGISTRY["search_ai_knowledge"]["description"],
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "Truy vấn tìm trong AI knowledge."},
                                "limit": {"type": "integer", "description": "Số kết quả tối đa cần trả."},
                            },
                            "required": ["query"],
                        },
                    },
                },
            ]
        )

    return tools

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

try:
    import docx
except Exception:
    docx = None


def _get_chroma_collection():
    global _chroma_client, _chroma_collection

    if _chroma_collection is not None:
        return _chroma_collection

    _chroma_client = chromadb.PersistentClient(
        path=CHROMA_DB_PATH,
        settings=Settings(anonymized_telemetry=False),
    )
    _chroma_collection = _chroma_client.get_or_create_collection(CHROMA_COLLECTION_NAME)
    return _chroma_collection


def _get_navigation_chroma_collection():
    global _chroma_client

    if _chroma_client is None:
        # ensure client initialized
        _get_chroma_collection()

    try:
        nav_collection = _chroma_client.get_or_create_collection(NAV_CHROMA_COLLECTION_NAME)
    except Exception:
        nav_collection = _chroma_client.get_or_create_collection(NAV_CHROMA_COLLECTION_NAME)
    return nav_collection


def _get_http_client() -> httpx.AsyncClient:
    global _http_client

    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=120.0, write=20.0, pool=20.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )

    return _http_client


def _load_public_element_index(force: bool = False) -> Dict[str, Any]:
    """Load and cache the frontend-generated publicElementIndex.generated.json."""
    global _PUBLIC_ELEMENT_INDEX
    if _PUBLIC_ELEMENT_INDEX is not None and not force:
        return _PUBLIC_ELEMENT_INDEX

    repo_root = Path(__file__).resolve().parents[3]
    index_path = repo_root / "frontend" / "src" / "lib" / "ai-navigation" / "publicElementIndex.generated.json"
    if not index_path.exists():
        _PUBLIC_ELEMENT_INDEX = {"generatedAt": None, "version": 0, "total": 0, "elements": []}
        return _PUBLIC_ELEMENT_INDEX

    try:
        with index_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
            _PUBLIC_ELEMENT_INDEX = data if isinstance(data, dict) else {"generatedAt": None, "version": 0, "total": 0, "elements": []}
            return _PUBLIC_ELEMENT_INDEX
    except Exception:
        _PUBLIC_ELEMENT_INDEX = {"generatedAt": None, "version": 0, "total": 0, "elements": []}
        return _PUBLIC_ELEMENT_INDEX


def _normalize_text(text: str) -> str:
    return " ".join((text or "").split())


def _normalize_for_match(text: str) -> str:
    compact = _normalize_text(text).lower()
    if not compact:
        return ""
    decomposed = unicodedata.normalize("NFD", compact)
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


def _tokenize_for_match(text: str) -> List[str]:
    normalized = _normalize_for_match(text)
    if not normalized:
        return []
    return [token for token in re.split(r"[^a-z0-9]+", normalized) if len(token) >= 2]


def _score_match(query_norm: str, query_tokens: List[str], title: str, body: str, aliases: List[str]) -> float:
    title_norm = _normalize_for_match(title)
    body_norm = _normalize_for_match(body)
    alias_norms = [_normalize_for_match(item) for item in aliases if item]

    score = 0.0
    if query_norm and query_norm in title_norm:
        score += 260
    if query_norm and query_norm in body_norm:
        score += 160
    if query_norm and any(query_norm in item for item in alias_norms):
        score += 220

    for token in query_tokens:
        if token in title_norm:
            score += 20
        if token in body_norm:
            score += 8
        if any(token in item for item in alias_norms):
            score += 18

    return score


def _default_static_site_knowledge_entries() -> List[Dict[str, Any]]:
    return [
        {
            "id": "site-static:van-rules-2026",
            "title": "Thể lệ Nhái Bén 2026",
            "path": "/phanmon/van?tab=the-le",
            "target": None,
            "snippet": "Thể lệ sáng tác Nhái Bén 2026: sáng tác mới 100%, chủ đề Nhịp đập số - Khát vọng vươn tầm, và quy định thể loại/độ dài.",
            "aliases": [
                "thể lệ nhái bén",
                "the le nhai ben",
                "nhái bén 2026",
                "quy định nhái bén",
                "phân môn văn",
            ],
            "body": (
                "THỂ LỆ NHÁI BÉN 2026. "
                "1) Tác phẩm tham gia phải là sáng tác mới 100%, chưa từng công bố trên phương tiện truyền thông hoặc mạng xã hội. "
                "2) Chủ đề năm 2026: Nhip dap so - Khat vong vuon tam. "
                "3) Thể loại chấp nhận: Truyện ngắn tối đa 3000 chữ; Tản văn/Ghi chép tối đa 1500 chữ; Thơ tự do hoặc thơ có luật. "
                "4) Đối tượng tham gia: toàn thể học sinh, sinh viên trong hệ thống giáo dục FPT yêu thích văn chương. "
                "Trang xem chi tiết: /phanmon/van?tab=the-le"
            ),
        },
        {
            "id": "site-static:van-submit",
            "title": "Gửi bài sáng tác Nhái Bén",
            "path": "/phanmon/van?tab=sang-tac",
            "target": None,
            "snippet": "Khu vực gửi bài sáng tác Nhái Bén, theo dõi trạng thái chờ duyệt/đã duyệt.",
            "aliases": [
                "gửi bài nhái bén",
                "nop bai nhai ben",
                "submit nhai ben",
                "sáng tác ngữ văn",
            ],
            "body": (
                "Khu vực gửi bài sáng tác Nhái Bén tại /phanmon/van?tab=sang-tac. "
                "Người dùng có thể nhập tiêu đề, nội dung, thông tin tác giả và đính kèm PDF để nộp bài."
            ),
        },
    ]


def _normalize_static_knowledge_entry(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    static_id = _normalize_text(str(item.get("id") or ""))
    title = _normalize_text(str(item.get("title") or ""))
    body = _normalize_text(str(item.get("body") or ""))

    if not static_id or not title or not body:
        return None

    aliases = [_normalize_text(str(alias)) for alias in (item.get("aliases") or []) if alias]

    return {
        "id": static_id,
        "title": title,
        "path": _normalize_text(str(item.get("path") or "")),
        "target": item.get("target"),
        "snippet": _normalize_text(str(item.get("snippet") or "")),
        "aliases": aliases,
        "body": body,
    }


def _load_static_site_knowledge_from_file() -> List[Dict[str, Any]]:
    if not STATIC_SITE_KNOWLEDGE_PATH.exists():
        defaults = _default_static_site_knowledge_entries()
        STATIC_SITE_KNOWLEDGE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with STATIC_SITE_KNOWLEDGE_PATH.open("w", encoding="utf-8") as handle:
            json.dump(defaults, handle, ensure_ascii=False, indent=2)
        return defaults

    try:
        with STATIC_SITE_KNOWLEDGE_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except Exception:
        return _default_static_site_knowledge_entries()

    if not isinstance(data, list):
        return _default_static_site_knowledge_entries()

    entries: List[Dict[str, Any]] = []
    for raw_item in data:
        if not isinstance(raw_item, dict):
            continue
        normalized = _normalize_static_knowledge_entry(raw_item)
        if normalized is None:
            continue
        entries.append(normalized)

    return entries if entries else _default_static_site_knowledge_entries()


def _get_static_site_knowledge_entries() -> List[Dict[str, Any]]:
    return _load_static_site_knowledge_from_file()


def _get_static_site_knowledge_source_mtime() -> Optional[float]:
    if not STATIC_SITE_KNOWLEDGE_PATH.exists():
        return None
    try:
        return STATIC_SITE_KNOWLEDGE_PATH.stat().st_mtime
    except Exception:
        return None


def _build_static_site_knowledge_documents() -> Tuple[List[str], List[str], List[dict], str]:
    entries = _get_static_site_knowledge_entries()

    ids: List[str] = []
    documents: List[str] = []
    metadatas: List[dict] = []
    fingerprint_payload: List[dict] = []

    for item in entries:
        static_id = str(item.get("id") or "")
        static_title = _normalize_text(item.get("title") or "")
        static_body = _normalize_text(item.get("body") or "")
        static_path = _normalize_text(item.get("path") or "")
        static_aliases = [_normalize_text(alias) for alias in (item.get("aliases") or []) if alias]

        if not static_id or not (static_title or static_body):
            continue

        ids.append(static_id)
        documents.append(f"{static_title}\n\n{static_body}")
        metadatas.append(
            {
                "source_type": "site_static",
                "source_id": static_id,
                "title": static_title[:AI_TITLE_TRUNC],
                "path": static_path[:AI_PATH_TRUNC],
            }
        )
        fingerprint_payload.append(
            {
                "id": static_id,
                "title": static_title,
                "path": static_path,
                "aliases": static_aliases,
                "body": static_body,
            }
        )

    fingerprint_payload.sort(key=lambda item: item.get("id", ""))
    fingerprint_raw = json.dumps(fingerprint_payload, ensure_ascii=False, separators=(",", ":"))
    fingerprint = hashlib.sha256(fingerprint_raw.encode("utf-8")).hexdigest()

    return ids, documents, metadatas, fingerprint


def _sync_static_site_knowledge(collection, force: bool = False):
    global _last_static_sync_at, _last_static_sync_monotonic, _last_static_sync_hash, _last_static_source_mtime

    source_mtime = _get_static_site_knowledge_source_mtime()
    source_changed = source_mtime is not None and (
        _last_static_source_mtime is None or source_mtime > _last_static_source_mtime
    )

    if (
        not force
        and not source_changed
        and _last_static_sync_monotonic is not None
        and AI_STATIC_SYNC_MIN_INTERVAL_SECONDS > 0
    ):
        elapsed = time.monotonic() - _last_static_sync_monotonic
        if elapsed < AI_STATIC_SYNC_MIN_INTERVAL_SECONDS:
            return

    ids, documents, metadatas, fingerprint = _build_static_site_knowledge_documents()

    if not force and _last_static_sync_hash == fingerprint:
        _last_static_sync_monotonic = time.monotonic()
        return

    existing_ids = set(collection.get(include=[]).get("ids", []))
    existing_static_ids = {doc_id for doc_id in existing_ids if doc_id.startswith("site-static:")}
    next_static_ids = set(ids)
    stale_static_ids = list(existing_static_ids - next_static_ids)
    if stale_static_ids:
        collection.delete(ids=stale_static_ids)

    if ids:
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

    _last_static_sync_hash = fingerprint
    _last_static_sync_at = datetime.now(timezone.utc).isoformat()
    _last_static_sync_monotonic = time.monotonic()
    _last_static_source_mtime = source_mtime


def _build_navigation_content_index(db: Session) -> List[Dict[str, Any]]:
    publications = db.query(Publication).order_by(Publication.created_at.desc()).all()
    stories = db.query(Story).order_by(Story.created_at.desc()).all()
    events = db.query(Event).order_by(Event.event_date.asc()).all()

    home_publication_ids = {item.id for item in publications[:3]}
    items: List[Dict[str, Any]] = []

    for pub in publications:
        title = _normalize_text(pub.title)
        snippet = _normalize_text(pub.snippet)
        aliases = [
            _normalize_text(pub.category),
            _normalize_text(pub.subject),
            _normalize_text(pub.content_type),
            _normalize_text(pub.featured_year),
        ]

        items.append(
            {
                "entity_type": "publication",
                "entity_id": pub.id,
                "title": title,
                "snippet": snippet,
                "body": f"{title}\n{snippet}\n{_normalize_text(pub.content)[:AI_NAV_BODY_TRUNC]}",
                "aliases": aliases,
                "path": f"/posts/{pub.id}",
                "target": None,
                "home_path": "/" if pub.id in home_publication_ids else None,
                "home_target": f"text:{title}" if pub.id in home_publication_ids and title else None,
            }
        )

    for story in stories:
        title = _normalize_text(story.title)
        snippet = _normalize_text(story.snippet)
        aliases = [
            _normalize_text(story.category),
            _normalize_text(story.author),
            "câu chuyện truyền cảm hứng",
            "story inspiring",
        ]

        items.append(
            {
                "entity_type": "story",
                "entity_id": story.id,
                "title": title,
                "snippet": snippet,
                "body": f"{title}\n{snippet}\n{_normalize_text(story.content)[:AI_NAV_BODY_TRUNC]}",
                "aliases": aliases,
                "path": f"/stories/inspiring/{story.id}",
                "target": None,
                "home_path": None,
                "home_target": None,
            }
        )

    for event in events:
        title = _normalize_text(event.title)
        description = _normalize_text(event.description)
        aliases = [
            _normalize_text(event.location),
            _normalize_text(event.status),
            "sự kiện",
            "event",
        ]

        items.append(
            {
                "entity_type": "event",
                "entity_id": event.id,
                "title": title,
                "snippet": description[:AI_EVENT_SNIPPET_TRUNC],
                "body": f"{title}\n{description}",
                "aliases": aliases,
                "path": "/events/upcoming",
                "target": f"#event-card-{event.id}",
                "home_path": None,
                "home_target": None,
            }
        )

    static_intents = [
        {
            "entity_type": "intent",
            "entity_id": "van-submit",
            "title": "Nộp bài sáng tác Ngữ văn",
            "snippet": "Khu vực gửi bài dự thi sáng tác và theo dõi trạng thái duyệt bài.",
            "body": "Nộp bài, gửi bài sáng tác, khu vực submit bài.",
            "aliases": ["nộp bài", "gửi bài", "submit", "bài dự thi", "sáng tác"],
            "path": "/phanmon/van?tab=sang-tac",
            "target": None,
            "home_path": None,
            "home_target": None,
        },
        {
            "entity_type": "intent",
            "entity_id": "van-rules",
            "title": "Thể lệ Nhái Bén 2026",
            "snippet": "Quy định tham gia Nhái Bén: sáng tác mới 100%, chủ đề năm 2026, thể loại và giới hạn độ dài.",
            "body": (
                "Thể lệ Nhái Bén 2026: sáng tác mới 100%, chủ đề Nhip dap so - Khat vong vuon tam, "
                "thể loại gồm truyện ngắn (<=3000 chữ), tản văn/ghi chép (<=1500 chữ), thơ tự do hoặc thơ có luật."
            ),
            "aliases": ["thể lệ", "quy định", "luật", "hướng dẫn", "nhái bén", "the le nhai ben"],
            "path": "/phanmon/van?tab=the-le",
            "target": None,
            "home_path": None,
            "home_target": None,
        },
        {
            "entity_type": "intent",
            "entity_id": "home-publications",
            "title": "Card bài viết trên trang chủ",
            "snippet": "Khu vực card bài viết mới trên trang chủ.",
            "body": "Card bài viết, card trang chủ, ấn phẩm Nhái Bén.",
            "aliases": ["card", "trang chủ", "ấn phẩm", "nhái bén", "bài viết mới"],
            "path": "/",
            "target": "home-latest-publications",
            "home_path": None,
            "home_target": None,
        },
    ]

    for static_item in _get_static_site_knowledge_entries():
        items.append(
            {
                "entity_type": "site_static",
                "entity_id": static_item.get("id"),
                "title": static_item.get("title"),
                "snippet": static_item.get("snippet"),
                "body": static_item.get("body"),
                "aliases": static_item.get("aliases") or [],
                "path": static_item.get("path"),
                "target": static_item.get("target"),
                "home_path": None,
                "home_target": None,
            }
        )

    items.extend(static_intents)

    return items


def _search_navigation_content(db: Session, query: str, limit: int = 8) -> List[Dict[str, Any]]:
    query_norm = _normalize_for_match(query)
    query_tokens = _tokenize_for_match(query)
    if not query_norm and not query_tokens:
        return []

    index_items = _build_navigation_content_index(db)
    scored_items: List[Dict[str, Any]] = []

    for item in index_items:
        score = _score_match(
            query_norm=query_norm,
            query_tokens=query_tokens,
            title=item.get("title", ""),
            body=item.get("body", ""),
            aliases=item.get("aliases", []) or [],
        )

        if score <= 0:
            continue

        scored_items.append(
            {
                "entity_type": item.get("entity_type"),
                "entity_id": item.get("entity_id"),
                "title": item.get("title"),
                "snippet": item.get("snippet"),
                "path": item.get("path"),
                "target": item.get("target"),
                "home_path": item.get("home_path"),
                "home_target": item.get("home_target"),
                "score": round(score, 2),
            }
        )

    scored_items.sort(key=lambda value: value.get("score", 0), reverse=True)
    return scored_items[: max(1, limit)]


def _sync_knowledge_base(db: Session, force: bool = False):
    global _last_sync_at, _last_sync_monotonic

    collection = _get_chroma_collection()
    _sync_static_site_knowledge(collection, force=force)

    if not force and _last_sync_monotonic is not None and AI_SYNC_MIN_INTERVAL_SECONDS > 0:
        elapsed = time.monotonic() - _last_sync_monotonic
        if elapsed < AI_SYNC_MIN_INTERVAL_SECONDS:
            return

    publications = db.query(Publication).all()
    stories = db.query(Story).all()
    events = db.query(Event).all()
    submissions = db.query(Submission).filter(Submission.status == "approved").all()

    ids: List[str] = []
    documents: List[str] = []
    metadatas: List[dict] = []

    for pub in publications:
        content = _normalize_text(pub.content)
        title = _normalize_text(pub.title)
        if not content and not title:
            continue
        ids.append(f"pub:{pub.id}")
        documents.append(f"{title}\n\n{content}")
        metadatas.append(
            {
                "source_type": "publication",
                "source_id": pub.id,
                "title": title[:AI_TITLE_TRUNC],
                "category": _normalize_text(pub.category)[:AI_META_CATEGORY_TRUNC],
            }
        )

    for sub in submissions:
        content = _normalize_text(sub.content)
        title = _normalize_text(sub.title)
        if not content and not title:
            continue
        ids.append(f"sub:{sub.id}")
        documents.append(f"{title}\n\n{content}")
        metadatas.append(
            {
                "source_type": "submission",
                "source_id": sub.id,
                "title": title[:AI_TITLE_TRUNC],
                "student_name": _normalize_text(sub.student_name)[:AI_META_STUDENT_NAME_TRUNC],
            }
        )

    for story in stories:
        content = _normalize_text(story.content)
        title = _normalize_text(story.title)
        snippet = _normalize_text(story.snippet)
        if not content and not title and not snippet:
            continue
        ids.append(f"story:{story.id}")
        documents.append(f"{title}\n\n{snippet}\n\n{content}")
        metadatas.append(
            {
                "source_type": "story",
                "source_id": story.id,
                "title": title[:AI_TITLE_TRUNC],
                "category": _normalize_text(story.category)[:AI_META_CATEGORY_TRUNC],
            }
        )

    for event in events:
        description = _normalize_text(event.description)
        title = _normalize_text(event.title)
        location = _normalize_text(event.location)
        event_date = event.event_date.isoformat() if event.event_date else ""
        if not description and not title:
            continue
        ids.append(f"event:{event.id}")
        documents.append(f"{title}\n\n{description}\n\nĐịa điểm: {location}\nThời gian: {event_date}")
        metadatas.append(
            {
                "source_type": "event",
                "source_id": event.id,
                "title": title[:AI_TITLE_TRUNC],
                "status": _normalize_text(event.status)[:AI_META_STATUS_TRUNC],
            }
        )

    existing_ids = set(collection.get(include=[]).get("ids", []))
    existing_core_ids = {
        doc_id
        for doc_id in existing_ids
        if doc_id.startswith("pub:")
        or doc_id.startswith("sub:")
        or doc_id.startswith("story:")
        or doc_id.startswith("event:")
    }
    next_ids = set(ids)
    stale_ids = list(existing_core_ids - next_ids)
    if stale_ids:
        collection.delete(ids=stale_ids)

    if ids:
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

    _last_sync_at = datetime.now(timezone.utc).isoformat()
    _last_sync_monotonic = time.monotonic()


def _build_chroma_source_counts(collection) -> Dict[str, int]:
    data = collection.get(include=["metadatas"])
    metadatas = data.get("metadatas", []) or []

    counts: Dict[str, int] = {
        "publication": 0,
        "submission": 0,
        "story": 0,
        "event": 0,
        "site_static": 0,
        "knowledge_file": 0,
        "unknown": 0,
    }

    for item in metadatas:
        source_type = (item or {}).get("source_type", "unknown")
        if source_type not in counts:
            counts["unknown"] += 1
            continue
        counts[source_type] += 1

    return counts


def get_ai_knowledge_overview(db: Session) -> Dict[str, Any]:
    _sync_knowledge_base(db)
    collection = _get_chroma_collection()
    counts = _build_chroma_source_counts(collection)

    core_documents = (
        counts.get("publication", 0)
        + counts.get("submission", 0)
        + counts.get("story", 0)
        + counts.get("event", 0)
    )

    return {
        "status": "ok",
        "last_synced_at": _last_sync_at,
        "last_static_synced_at": _last_static_sync_at,
        "documents_total": collection.count(),
        "documents_core": core_documents,
        "documents_uploaded": counts.get("knowledge_file", 0),
        "source_counts": counts,
        "knowledge_assets": len(list_knowledge_files()),
    }


def _retrieve_context(query: str, n_results: int = 4) -> str:
    collection = _get_chroma_collection()
    results = collection.query(query_texts=[query], n_results=n_results)

    docs = results.get("documents", [[]])
    metas = results.get("metadatas", [[]])
    if not docs or not docs[0]:
        return ""

    chunks: List[str] = []
    for idx, doc in enumerate(docs[0]):
        meta = metas[0][idx] if metas and metas[0] and idx < len(metas[0]) else {}
        source_type = meta.get("source_type", "unknown")
        source_id = meta.get("source_id", "?")
        title = meta.get("title", "Không rõ tiêu đề")

        # By default use a short snippet from the matching chunk
        snippet = _normalize_text(doc)[:AI_RETRIEVE_PER_DOC_CHARS]

        # Optionally attempt to assemble full knowledge-file text for the top match
        if AI_RETRIEVE_ASSEMBLE_DOCS and idx == 0 and source_type == "knowledge_file" and source_id:
            try:
                assembled = assemble_full_asset_text(source_id, max_chars=AI_RETRIEVE_MAX_TOTAL_CHARS)
                if assembled.get("ok") and assembled.get("full_text"):
                    snippet = assembled.get("full_text")
            except Exception:
                # Keep the original short snippet on failure and log for operators
                logger.exception("Failed to assemble full asset for source_id=%s", source_id)

        chunks.append(
            f"[{idx + 1}] ({source_type}#{source_id}) {title}\n{snippet}"
        )

    return "\n\n".join(chunks)


def _search_knowledge_records(query: str, n_results: int = 5) -> List[Dict[str, Any]]:
    collection = _get_chroma_collection()
    results = collection.query(query_texts=[query], n_results=n_results)

    docs = results.get("documents", [[]])
    metas = results.get("metadatas", [[]])
    distances = results.get("distances", [[]])
    if not docs or not docs[0]:
        return []

    items: List[Dict[str, Any]] = []
    for idx, doc in enumerate(docs[0]):
        meta = metas[0][idx] if metas and metas[0] and idx < len(metas[0]) else {}
        distance = distances[0][idx] if distances and distances[0] and idx < len(distances[0]) else None
        snippet = _normalize_text(doc)[:AI_SEARCH_SNIPPET_CHARS]

        items.append(
            {
                "rank": idx + 1,
                "source_type": meta.get("source_type", "unknown"),
                "source_id": meta.get("source_id"),
                "title": meta.get("title", "Không rõ tiêu đề"),
                "snippet": snippet,
                "distance": float(distance) if isinstance(distance, (int, float)) else None,
            }
        )

    return items


def _is_search_intent(normalized_query: str) -> bool:
    if not normalized_query:
        return False
    return any(keyword in normalized_query for keyword in AI_SEARCH_INTENT_KEYWORDS)


def _is_navigation_intent(normalized_query: str) -> bool:
    if not normalized_query:
        return False

    if normalized_query.startswith("/"):
        return True
    if any(keyword in normalized_query for keyword in AI_NAV_INTENT_KEYWORDS):
        return True
    if _is_element_focus_intent(normalized_query):
        return True
    return any(item.get("path", "") in normalized_query for item in AI_ROUTE_SITEMAP)


def _is_content_discovery_intent(normalized_query: str) -> bool:
    if not normalized_query:
        return False
    return any(keyword in normalized_query for keyword in AI_CONTENT_DISCOVERY_KEYWORDS)


def _is_element_focus_intent(normalized_query: str) -> bool:
    if not normalized_query:
        return False
    return any(keyword in normalized_query for keyword in AI_ELEMENT_FOCUS_KEYWORDS)


def _is_smalltalk_query(normalized_query: str) -> bool:
    if not normalized_query:
        return True

    # Be tolerant to punctuation/spacing/diacritics by tokenizing the input.
    tokens = _tokenize_for_match(normalized_query)
    if not tokens:
        return False

    # Only treat short messages as smalltalk to avoid false positives.
    if len(tokens) > 4 or len(normalized_query) > 100:
        return False

    token_set = set(tokens)

    # Simple greeting tokens
    if token_set & {"hi", "hello", "helo", "hey", "alo", "chao"}:
        return True

    # Common two-word smalltalk phrases (e.g., "xin chao", "cam on")
    if "xin" in token_set and "chao" in token_set:
        return True
    if "cam" in token_set and "on" in token_set:
        return True
    # No special-case heuristics for typed variants (keep detection simple)

    return False


def _is_website_scope_query(normalized_query: str) -> bool:
    if not normalized_query:
        return True
    if _is_smalltalk_query(normalized_query):
        return True
    if _is_navigation_intent(normalized_query) or _is_search_intent(normalized_query) or _is_content_discovery_intent(normalized_query):
        return True
    if any(keyword in normalized_query for keyword in AI_WEBSITE_SCOPE_HINTS):
        return True
    return any(item.get("path", "") in normalized_query for item in AI_ROUTE_SITEMAP)


def _build_search_context(db: Session, query: str) -> str:
    parts: List[str] = []

    nav_matches: List[Dict[str, Any]] = []
    try:
        nav_matches = _search_navigation_content(db, query=query, limit=4)
    except Exception:
        nav_matches = []

    if nav_matches:
        lines = ["KẾT QUẢ TÌM TRÊN WEBSITE:"]
        for idx, item in enumerate(nav_matches, start=1):
            title = item.get("title") or "Không rõ tiêu đề"
            path = item.get("path") or "/"
            snippet = item.get("snippet") or ""
            target = item.get("target")
            line = f"[{idx}] {title} | path: {path}"
            if target:
                line += f" | target: {target}"
            if snippet:
                line += f" | mô tả: {snippet[:AI_NAV_MATCH_SNIPPET_TRUNC]}"
            lines.append(line)
        parts.append("\n".join(lines))

    knowledge_context = ""
    try:
        knowledge_context = _retrieve_context(query)
    except Exception:
        knowledge_context = ""

    if knowledge_context:
        parts.append("KẾT QUẢ TỪ AI KNOWLEDGE:\n" + knowledge_context)

    return "\n\n".join(parts).strip()


def _build_sitemap_quick_context(query: str, limit: int = 5) -> str:
    query_norm = _normalize_for_match(query)
    query_tokens = _tokenize_for_match(query)

    scored_routes: List[Tuple[float, dict]] = []
    for route in AI_ROUTE_SITEMAP:
        score = _score_match(
            query_norm=query_norm,
            query_tokens=query_tokens,
            title=route.get("title", ""),
            body=route.get("path", ""),
            aliases=route.get("aliases", []) or [],
        )
        if score <= 0:
            continue
        scored_routes.append((score, route))

    scored_routes.sort(key=lambda item: item[0], reverse=True)
    top_routes = scored_routes[: max(1, limit)]

    if not top_routes:
        top_routes = [(0, item) for item in AI_ROUTE_SITEMAP[: min(limit, len(AI_ROUTE_SITEMAP))]]

    lines = [
        "SITEMAP NHANH (ưu tiên route phù hợp):",
    ]
    for _, route in top_routes:
        lines.append(f"- {route.get('title', 'Không rõ tiêu đề')}: {route.get('path', '/')}")

    return "\n".join(lines)


def _resolve_chat_strategy(question: str, enable_tools: bool) -> Dict[str, Any]:
    normalized_query = _normalize_for_match(question)
    asks_for_content_discovery = _is_content_discovery_intent(normalized_query)
    asks_for_element_focus = _is_element_focus_intent(normalized_query)
    mentions_known_route = normalized_query.startswith("/") or any(item.get("path", "") in normalized_query for item in AI_ROUTE_SITEMAP)

    if _is_search_intent(normalized_query) or asks_for_content_discovery:
        return {
            "mode": "search",
            "enable_tools": bool(enable_tools),
            "include_search_tools": bool(enable_tools),
            "use_heavy_context": True,
            "context": "",
        }

    if _is_navigation_intent(normalized_query):
        include_search_tools = bool(enable_tools and (asks_for_element_focus or not mentions_known_route))
        return {
            "mode": "navigate",
            "enable_tools": bool(enable_tools),
            "include_search_tools": include_search_tools,
            "use_heavy_context": False,
            "context": _build_sitemap_quick_context(question),
        }

    return {
        "mode": "simple",
        "enable_tools": False,
        "include_search_tools": False,
        "use_heavy_context": False,
        "context": "",
    }


def _prepare_chat_runtime(question: str, db: Session, enable_tools: bool) -> Dict[str, Any]:
    strategy = _resolve_chat_strategy(question, enable_tools)

    # If strategy requests heavy context, perform a full sync and build search context.
    if strategy["use_heavy_context"]:
        try:
            _sync_knowledge_base(db)
            strategy["context"] = _build_search_context(db, question)
        except Exception:
            strategy["context"] = ""
    else:
        # For all other strategies, still attempt a lightweight retrieval from AI knowledge
        # to enrich context so the model can answer earlier turns.
        try:
            knowledge_context = _retrieve_context(question)
            if knowledge_context:
                existing = strategy.get("context", "") or ""
                if existing:
                    strategy["context"] = existing + "\n\n" + "KẾT QUẢ TỪ AI KNOWLEDGE:\n" + knowledge_context
                else:
                    strategy["context"] = "KẾT QUẢ TỪ AI KNOWLEDGE:\n" + knowledge_context
        except Exception:
            logger.exception("Failed to retrieve lightweight context for question=%s", question)

    return strategy


def _build_prompt_with_context(
    question: str,
    context: str,
    enable_tools: bool = True,
    chat_mode: str = "simple",
) -> str:
    tool_instructions = ""
    if enable_tools:
        tool_instructions = (
            "\n\nHƯỚNG DẪN DÙNG TOOL:\n"
            "- Nếu cần điều hướng hoặc thao tác UI, ưu tiên gọi tool thay vì chỉ mô tả chung chung.\n"
            "- Chỉ điều hướng đến route có trong sitemap whitelist.\n"
            "- Với yêu cầu tìm vị trí card hoặc section, chỉ gọi search_content khi người dùng thật sự yêu cầu tìm kiếm.\n"
            "- Chỉ gọi search_ai_knowledge khi yêu cầu tra cứu nội dung, không gọi cho câu chào/hỏi đơn giản.\n"
            "- Sau khi mở trang, nếu có mục tiêu cụ thể thì gọi scroll_to_target hoặc open_and_focus.\n"
            "\nSITEMAP WHITELIST:\n"
            f"{json.dumps(AI_ROUTE_SITEMAP, ensure_ascii=False, indent=2)}"
        )

    mode_instruction = ""
    if chat_mode == "simple":
        mode_instruction = "\n\nCHẾ ĐỘ TỐI ƯU TỐC ĐỘ: đây là câu chat đơn giản, ưu tiên trả lời ngắn gọn và trực tiếp, không tra cứu nặng."
    elif chat_mode == "navigate":
        mode_instruction = "\n\nCHẾ ĐỘ ĐIỀU HƯỚNG: ưu tiên route theo sitemap nhanh, không thực hiện tra cứu tri thức nặng."
    elif chat_mode == "search":
        mode_instruction = (
            "\n\nCHẾ ĐỘ TÌM KIẾM: được phép dùng ngữ cảnh tri thức và công cụ tìm kiếm để trả lời chính xác. "
            "Nếu có kết quả, bắt buộc nêu rõ ít nhất 1-3 mục với tiêu đề, mô tả ngắn và đường dẫn path tương ứng."
        )

    if not context:
        return (
            "Bạn là trợ lý AI thông minh của hệ thống Tổ xã hội tại FPT Education. "
            "Trả lời bằng tiếng Việt, rõ ràng và hữu ích. "
            "Chỉ hỗ trợ nội dung liên quan trực tiếp đến website này; từ chối chủ đề ngoài phạm vi website. "
            "Không bịa thông tin khi không chắc chắn. "
            + FACTUAL_GUARDRAILS
            + mode_instruction
            + tool_instructions
            + f"\n\nCâu hỏi: {question}"
        )

    return (
        "Bạn là trợ lý AI thông minh của hệ thống Tổ xã hội tại FPT Education. "
        "Hãy ưu tiên trả lời dựa trên NGỮ CẢNH TRI THỨC được cung cấp. "
        "Chỉ hỗ trợ nội dung liên quan trực tiếp đến website này; từ chối chủ đề ngoài phạm vi website. "
        "Nếu không đủ dữ liệu trong ngữ cảnh, hãy nói rõ phần chưa chắc chắn thay vì bịa thông tin. "
        "Trả lời bằng tiếng Việt, hỗ trợ Markdown và LaTeX khi cần."
        + FACTUAL_GUARDRAILS
        + mode_instruction
        + "\n\nNGỮ CẢNH TRI THỨC:\n"
        f"{context}"
        + tool_instructions
        + "\n\nCÂU HỎI NGƯỜI DÙNG:\n"
        f"{question}"
    )


def _validate_tool_call(item: dict) -> Optional[dict]:
    if not isinstance(item, dict):
        return None

    name = item.get("name")
    args = item.get("args", {})
    if name not in AI_TOOL_REGISTRY or not isinstance(args, dict):
        return None

    required_args = AI_TOOL_REGISTRY[name]["required_args"]
    if any(arg not in args for arg in required_args):
        return None

    return {"name": name, "args": args}


def _parse_tool_args(arguments: Any) -> Optional[dict]:
    if isinstance(arguments, dict):
        return arguments

    if isinstance(arguments, str):
        try:
            parsed = json.loads(arguments)
        except Exception:
            return None
        return parsed if isinstance(parsed, dict) else None

    return None


def _extract_ollama_tool_calls(raw_tool_calls: Any) -> Tuple[List[dict], List[str]]:
    warnings: List[str] = []
    tool_calls: List[dict] = []

    if not isinstance(raw_tool_calls, list):
        return tool_calls, ["tool_calls_invalid_type"]

    for item in raw_tool_calls:
        if not isinstance(item, dict):
            warnings.append("tool_call_invalid_shape")
            continue

        function_payload = item.get("function") if isinstance(item.get("function"), dict) else item
        name = function_payload.get("name")
        args = _parse_tool_args(function_payload.get("arguments", function_payload.get("args")))

        candidate = {"name": name, "args": args or {}}
        valid_item = _validate_tool_call(candidate)
        if valid_item is None:
            warnings.append("tool_call_rejected")
            continue

        tool_calls.append(valid_item)

    return tool_calls, warnings


def _compress_tool_calls(tool_calls: List[dict]) -> List[dict]:
    if not tool_calls:
        return []

    # Keep tool flow concise to avoid repetitive UI feedback.
    priority_order = {
        "open_and_focus": 0,
        "compute_selector_for_text": 1,
        "search_element_index": 2,
        "search_content": 3,
        "navigate_to_page": 4,
        "scroll_to_target": 5,
        "highlight_target": 6,
        "search_ai_knowledge": 7,
    }

    has_open_and_focus = any(item.get("name") == "open_and_focus" for item in tool_calls)
    has_search_content = any(item.get("name") == "search_content" for item in tool_calls)

    filtered: List[dict] = []
    for item in tool_calls:
        name = item.get("name")
        if has_open_and_focus and name in {"navigate_to_page", "scroll_to_target", "highlight_target"}:
            continue
        if has_search_content and name == "search_ai_knowledge":
            continue
        filtered.append(item)

    filtered.sort(key=lambda item: priority_order.get(item.get("name"), 99))

    # Prevent long chains of mostly equivalent actions in one turn.
    return filtered[:2]


def _load_knowledge_assets() -> List[dict]:
    if not KNOWLEDGE_INDEX_PATH.exists():
        return []
    try:
        with KNOWLEDGE_INDEX_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
            return data if isinstance(data, list) else []
    except Exception:
        return []


def _save_knowledge_assets(items: List[dict]):
    KNOWLEDGE_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    with KNOWLEDGE_INDEX_PATH.open("w", encoding="utf-8") as handle:
        json.dump(items, handle, ensure_ascii=False, indent=2)


def _extract_text_from_pdf(content_bytes: bytes) -> str:
    if PdfReader is None:
        raise ValueError("Thiếu thư viện pypdf. Vui lòng cài pypdf để đọc file PDF.")

    reader = PdfReader(BytesIO(content_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages)


def _extract_text_from_docx(content_bytes: bytes) -> str:
    if docx is None:
        raise ValueError("Thiếu thư viện python-docx. Vui lòng cài python-docx để đọc file Word.")

    document = docx.Document(BytesIO(content_bytes))
    return "\n".join([paragraph.text for paragraph in document.paragraphs if paragraph.text])


def _extract_text_by_extension(file_name: str, content_bytes: bytes) -> str:
    extension = Path(file_name).suffix.lower().strip()

    if extension in {".txt", ".md", ".doc"}:
        return content_bytes.decode("utf-8", errors="ignore")
    if extension == ".pdf":
        return _extract_text_from_pdf(content_bytes)
    if extension == ".docx":
        return _extract_text_from_docx(content_bytes)

    raise ValueError("Chỉ hỗ trợ: .pdf, .txt, .md, .doc, .docx")


def _split_chunks(text: str, chunk_size: int = AI_CHUNK_SIZE_DEFAULT, overlap: int = AI_CHUNK_OVERLAP_DEFAULT) -> List[str]:
    clean_text = _normalize_text(text)
    if not clean_text:
        return []

    chunks: List[str] = []
    cursor = 0
    text_length = len(clean_text)

    while cursor < text_length:
        end = min(text_length, cursor + chunk_size)
        chunks.append(clean_text[cursor:end])
        if end >= text_length:
            break
        cursor = max(end - overlap, 0)

    return chunks


def ingest_knowledge_file(file_name: str, content_bytes: bytes, uploaded_by: str = "admin") -> dict:
    parsed_text = _extract_text_by_extension(file_name, content_bytes)
    chunks = _split_chunks(parsed_text)
    if not chunks:
        raise ValueError("Nội dung file rỗng hoặc không thể trích xuất văn bản.")

    asset_id = str(uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    collection = _get_chroma_collection()
    doc_ids = [f"knowledge:{asset_id}:{index}" for index in range(len(chunks))]
    metadatas = [
        {
            "source_type": "knowledge_file",
            "source_id": asset_id,
            "title": _normalize_text(file_name)[:AI_TITLE_TRUNC],
            "file_name": _normalize_text(file_name)[:AI_TITLE_TRUNC],
            "chunk_index": index,
            "uploaded_by": _normalize_text(uploaded_by)[:AI_META_UPLOADED_BY_TRUNC],
            "uploaded_at": now_iso,
        }
        for index in range(len(chunks))
    ]
    collection.upsert(ids=doc_ids, documents=chunks, metadatas=metadatas)

    assets = _load_knowledge_assets()
    item = {
        "id": asset_id,
        "file_name": file_name,
        "file_type": Path(file_name).suffix.lower().replace(".", "") or "unknown",
        "size_bytes": len(content_bytes),
        "chunks": len(chunks),
        "uploaded_by": uploaded_by,
        "uploaded_at": now_iso,
    }
    assets.append(item)
    _save_knowledge_assets(assets)
    return item


def list_knowledge_files() -> List[dict]:
    items = _load_knowledge_assets()
    return sorted(items, key=lambda x: x.get("uploaded_at", ""), reverse=True)


def assemble_full_asset_text(asset_id: str, max_chars: Optional[int] = None) -> Dict[str, Any]:
    """Assemble full text for a knowledge asset by concatenating its chunks.

    Returns a dict with keys: ok (bool), full_text (str), truncated (bool), total_chars (int), chunks (int)
    """
    assets = _load_knowledge_assets()
    target = next((item for item in assets if item.get("id") == asset_id), None)
    if not target:
        return {"ok": False, "reason": "not_found"}

    total_chunks = int(target.get("chunks") or 0)
    if total_chunks <= 0:
        return {"ok": True, "full_text": "", "truncated": False, "total_chars": 0, "chunks": 0}

    collection = _get_chroma_collection()
    ids = [f"knowledge:{asset_id}:{i}" for i in range(total_chunks)]
    try:
        data = collection.get(ids=ids, include=["documents", "metadatas"]) or {}
    except Exception:
        logger.exception("Failed to assemble asset from chroma for asset_id=%s", asset_id)
        return {"ok": False, "reason": "chroma_error"}

    docs = data.get("documents", []) or []
    metas = data.get("metadatas", []) or []

    # Handle nested list shapes returned by query vs get
    if docs and isinstance(docs[0], list):
        docs = docs[0]
    if metas and isinstance(metas[0], list):
        metas = metas[0]

    parts: List[str] = []
    # Prefer ordering by metadata.chunk_index when available
    if metas and all(isinstance(m, dict) and "chunk_index" in m for m in metas):
        paired = []
        for idx, m in enumerate(metas):
            chunk_idx = int(m.get("chunk_index") or idx)
            text_piece = docs[idx] if idx < len(docs) else ""
            paired.append((chunk_idx, text_piece))
        paired.sort(key=lambda x: x[0])
        parts = [p[1] or "" for p in paired]
    else:
        parts = [d or "" for d in docs]

    full_text = " ".join([_normalize_text(p) for p in parts if p])
    total_chars = len(full_text)
    truncated = False
    if max_chars and total_chars > max_chars:
        result_text = full_text[:max_chars]
        truncated = True
    else:
        result_text = full_text

    return {"ok": True, "full_text": result_text, "truncated": truncated, "total_chars": total_chars, "chunks": total_chunks}


def delete_knowledge_file(asset_id: str) -> bool:
    assets = _load_knowledge_assets()
    target = next((item for item in assets if item.get("id") == asset_id), None)
    if not target:
        return False

    total_chunks = int(target.get("chunks") or 0)
    if total_chunks > 0:
        collection = _get_chroma_collection()
        ids = [f"knowledge:{asset_id}:{index}" for index in range(total_chunks)]
        collection.delete(ids=ids)

    remaining = [item for item in assets if item.get("id") != asset_id]
    _save_knowledge_assets(remaining)
    return True


def get_ai_health_snapshot(db: Session) -> Dict[str, Any]:
    _sync_knowledge_base(db)
    collection = _get_chroma_collection()
    return {
        "status": "ok",
        "chroma": {
            "available": True,
            "path": CHROMA_DB_PATH,
            "collection": CHROMA_COLLECTION_NAME,
            "documents": collection.count(),
            "knowledge_assets": len(list_knowledge_files()),
        },
    }


@router.get("/elements")
def get_public_element_index():
    """Serve the frontend-generated public element index JSON for AI tools."""
    repo_root = Path(__file__).resolve().parents[3]
    index_path = repo_root / "frontend" / "src" / "lib" / "ai-navigation" / "publicElementIndex.generated.json"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="public element index not found")
    try:
        with index_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except Exception:
        raise HTTPException(status_code=500, detail="failed to read public element index")
    return JSONResponse(content=data)


@router.post("/telemetry/element-resolution")
async def post_element_resolution_telemetry(payload: Dict[str, Any]):
    """Accept lightweight telemetry events for element resolution failures."""
    repo_root = Path(__file__).resolve().parents[3]
    telemetry_path = repo_root / "backend" / "ai_element_resolution_telemetry.jsonl"
    try:
        telemetry_path.parent.mkdir(parents=True, exist_ok=True)
        with telemetry_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps({"ts": datetime.now(timezone.utc).isoformat(), "payload": payload}, ensure_ascii=False) + "\n")
    except Exception:
        raise HTTPException(status_code=500, detail="failed to persist telemetry")
    return {"ok": True}


@router.post("/elements/ingest")
def ingest_public_elements():
    """Ingest frontend-generated public element index into navigation Chroma collection."""
    repo_root = Path(__file__).resolve().parents[3]
    index_path = repo_root / "frontend" / "src" / "lib" / "ai-navigation" / "publicElementIndex.generated.json"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="public element index not found")
    try:
        with index_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except Exception:
        raise HTTPException(status_code=500, detail="failed to read public element index")

    # refresh cached index
    try:
        global _PUBLIC_ELEMENT_INDEX
        _PUBLIC_ELEMENT_INDEX = payload if isinstance(payload, dict) else None
    except Exception:
        pass

    elements = payload.get("elements") if isinstance(payload, dict) else []
    if not isinstance(elements, list) or not elements:
        return JSONResponse(content={"ok": True, "imported": 0})

    collection = _get_navigation_chroma_collection()
    ids = []
    docs = []
    metadatas = []
    for idx, item in enumerate(elements):
        text = (item.get("text") or "").strip()
        if not text:
            continue
        signature = f"{item.get('route','')}:{text}"
        sighash = hashlib.sha1(signature.encode("utf-8")).hexdigest()[:8]
        doc_id = f"nav:{idx}:{sighash}"
        ids.append(doc_id)
        docs.append(text)
        metadatas.append({
            "route": item.get("route"),
            "kind": item.get("kind"),
            "source": item.get("source"),
            "anchor": item.get("anchor") if item.get("anchor") else None,
            "componentPath": item.get("componentPath") if item.get("componentPath") else None,
            "line": item.get("line"),
        })

    try:
        collection.upsert(ids=ids, documents=docs, metadatas=metadatas)
    except Exception:
        raise HTTPException(status_code=500, detail="failed to upsert elements into chroma")

    return JSONResponse(content={"ok": True, "imported": len(ids)})


@router.get("/elements/search")
def search_public_elements(query: str = Query(..., min_length=1), n_results: int = Query(8, alias='n_results')):
    payload = _load_public_element_index()
    elements = payload.get("elements") if isinstance(payload, dict) else []
    query_norm = _normalize_for_match(query)
    qtokens = _tokenize_for_match(query)

    scored = []
    for item in elements:
        text = item.get("text") or ""
        combined = " ".join([text, item.get("anchor") or "", item.get("source") or ""]).strip()
        target_norm = _normalize_for_match(combined)
        score = 0.0
        if query_norm and query_norm in target_norm:
            score += 200
        for t in qtokens:
            if t in target_norm:
                score += 10
        if score > 0:
            scored.append({
                "route": item.get("route"),
                "kind": item.get("kind"),
                "text": item.get("text"),
                "anchor": item.get("anchor"),
                "source": item.get("source"),
                "score": score,
            })

    scored.sort(key=lambda x: x.get("score", 0), reverse=True)
    return JSONResponse(content={"results": scored[:max(1, min(100, int(n_results)))]})


@router.post("/elements/compute")
def compute_selector_for_text(request: Dict[str, Any]):
    """Compute a recommended selector/target for a given phrase.

    Returns: { ok: True, target: 'anchor:KEY'|'text:...' , route: optional, confidence: float, candidates: [...] }
    """
    query = (request.get("query") or "").strip()
    path_hint = (request.get("path") or "").strip()
    n_results = int(request.get("limit") or 4)

    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    # 1) Try semantic lookup in navigation chroma collection
    nav_collection = _get_navigation_chroma_collection()
    try:
        results = nav_collection.query(query_texts=[query], n_results=n_results)
    except Exception:
        results = None

    candidates: List[Dict[str, Any]] = []
    if results:
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        for i, doc in enumerate(docs or []):
            meta = metas[i] if metas and i < len(metas) else {}
            dist = distances[i] if distances and i < len(distances) else None
            route = meta.get("route")
            anchor = meta.get("anchor")
            text = (doc or "").strip()
            confidence = None
            try:
                confidence = 1.0 - float(dist) if dist is not None else None
            except Exception:
                confidence = None

            if anchor:
                target = f"anchor:{anchor}"
            else:
                target = f"text:{text}"

            candidates.append({"target": target, "route": route, "text": text, "distance": dist, "confidence": confidence})

    # 2) If no good semantic candidate, fallback to static tokenized index search
    if not candidates:
        payload = _load_public_element_index()
        elements = payload.get("elements") if isinstance(payload, dict) else []
        qnorm = _normalize_for_match(query)
        qtokens = _tokenize_for_match(query)

        scored = []
        for item in elements:
            text = item.get("text") or ""
            combined = " ".join([text, item.get("anchor") or "", item.get("source") or ""]).strip()
            target_norm = _normalize_for_match(combined)
            score = 0.0
            if qnorm and qnorm in target_norm:
                score += 200
            for t in qtokens:
                if t in target_norm:
                    score += 10
            if score > 0:
                scored.append({"route": item.get("route"), "kind": item.get("kind"), "text": item.get("text"), "anchor": item.get("anchor"), "source": item.get("source"), "score": score})

        scored.sort(key=lambda x: x.get("score", 0), reverse=True)
        for s in scored[:n_results]:
            if s.get("anchor"):
                candidates.append({"target": f"anchor:{s.get('anchor')}", "route": s.get("route"), "text": s.get("text"), "score": s.get("score"), "confidence": min(0.95, 0.2 + s.get("score", 0) / 400)})
            else:
                candidates.append({"target": f"text:{s.get('text')}", "route": s.get("route"), "text": s.get("text"), "score": s.get("score"), "confidence": min(0.8, 0.15 + s.get("score", 0) / 600)})

    # select best candidate by confidence (or score)
    best = None
    for c in candidates:
        if best is None:
            best = c
            continue
        # prefer explicit anchors and higher confidence
        a_conf = c.get("confidence") if c.get("confidence") is not None else (c.get("score") or 0)
        b_conf = best.get("confidence") if best.get("confidence") is not None else (best.get("score") or 0)
        if a_conf > b_conf:
            best = c

    if not best:
        return JSONResponse(content={"ok": False, "reason": "no_candidate"})

    return JSONResponse(content={"ok": True, "target": best.get("target"), "route": best.get("route"), "confidence": float(best.get("confidence") or 0.0), "candidates": candidates})

async def ollama_stream(
    question: str,
    context: str,
    model: str,
    history: Optional[List[Dict[str, str]]] = None,
    enable_tools: bool = True,
    include_search_tools: bool = True,
    chat_mode: str = "simple",
    route_paths: Optional[List[str]] = None,
):
    full_response = ""
    collected_tool_calls: List[dict] = []
    warnings: List[str] = []
    system_prompt = _build_prompt_with_context("", context, enable_tools, chat_mode)
    conversation_messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    if history:
        conversation_messages.extend(history[-AI_MAX_HISTORY_MESSAGES:])
    conversation_messages.append({"role": "user", "content": question})

    payload: Dict[str, Any] = {
        "model": model,
        "messages": conversation_messages,
        "think": "low",
        "options": {
            "temperature": AI_RESPONSE_TEMPERATURE,
            "top_p": AI_RESPONSE_TOP_P,
        },
        "stream": True,
    }
    if enable_tools:
        payload["tools"] = _build_ollama_tools(include_search_tools=include_search_tools, route_paths=route_paths)

    client = _get_http_client()
    try:
        async with client.stream(
            "POST",
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
        ) as response:
            if response.status_code != 200:
                # Log internal details for operators, but return a generic message to the user
                logger.error(
                    "Upstream AI server returned non-200 status %s for model %s at %s",
                    response.status_code,
                    model,
                    OLLAMA_BASE_URL,
                )
                user_error = "Lỗi: dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau."
                yield json.dumps({"type": "chunk", "text": user_error}, ensure_ascii=False) + "\n"
                yield json.dumps(
                    {
                        "type": "meta",
                        "assistant_text": user_error,
                        "tool_calls": [],
                        "warnings": ["upstream_http_error"],
                    },
                    ensure_ascii=False,
                ) + "\n"
                yield json.dumps({"type": "done"}, ensure_ascii=False) + "\n"
                return

            async for chunk in response.aiter_text():
                if chunk:
                    # Ollama can return multiple JSON objects in one chunk
                    for line in chunk.strip().split("\n"):
                        if line:
                            try:
                                data = json.loads(line)
                                message = data.get("message") or {}
                                text_chunk = message.get("content")
                                if text_chunk:
                                    full_response += text_chunk
                                    yield json.dumps({"type": "chunk", "text": text_chunk}, ensure_ascii=False) + "\n"

                                raw_tool_calls = message.get("tool_calls")
                                if raw_tool_calls:
                                    valid_calls, call_warnings = _extract_ollama_tool_calls(raw_tool_calls)
                                    if valid_calls:
                                        collected_tool_calls.extend(valid_calls)
                                    if call_warnings:
                                        warnings.extend(call_warnings)

                                if data.get("done"):
                                    break
                            except json.JSONDecodeError:
                                warnings.append("upstream_chunk_json_decode_error")
                                continue

                deduped_tool_calls: List[dict] = []
            seen_signatures = set()
            for call in collected_tool_calls:
                signature = json.dumps(call, sort_keys=True, ensure_ascii=False)
                if signature in seen_signatures:
                    continue
                seen_signatures.add(signature)
                deduped_tool_calls.append(call)

                deduped_tool_calls = _compress_tool_calls(deduped_tool_calls)

            yield json.dumps(
                {
                    "type": "meta",
                    "assistant_text": full_response.strip(),
                    "tool_calls": deduped_tool_calls,
                    "warnings": list(dict.fromkeys(warnings)),
                },
                ensure_ascii=False,
            ) + "\n"
            yield json.dumps({"type": "done"}, ensure_ascii=False) + "\n"
    except Exception as e:
        # Log the exception details for debugging, but avoid leaking internals to users
        logger.exception("Error while streaming from upstream AI (%s): %s", OLLAMA_BASE_URL, str(e))
        user_error = "Lỗi kết nối tới dịch vụ AI. Vui lòng thử lại sau."
        yield json.dumps({"type": "chunk", "text": user_error}, ensure_ascii=False) + "\n"
        yield json.dumps(
            {
                "type": "meta",
                "assistant_text": user_error,
                "tool_calls": [],
                "warnings": ["upstream_connection_error"],
            },
            ensure_ascii=False,
        ) + "\n"
        yield json.dumps({"type": "done"}, ensure_ascii=False) + "\n"

@router.post("/chat")
async def chat_with_ai(request: Request, payload: ChatRequest, db: Session = Depends(get_db)):
    _enforce_rate_limit(request, "chat")

    message_to_use = _sanitize_message_content(payload.message, AI_MAX_USER_MESSAGE_CHARS)
    if not message_to_use:
        raise HTTPException(status_code=400, detail="message is required")

    model_to_use = payload.model if payload.model else DEFAULT_MODEL
    runtime = _prepare_chat_runtime(message_to_use, db, bool(payload.enable_tools))
    model_history = _build_model_history(payload.history)

    # Build route whitelist including dynamic content paths so model tools can navigate to posts
    try:
        nav_items = _build_navigation_content_index(db)
        dynamic_paths = [item.get("path") for item in nav_items if item.get("path")]
    except Exception:
        dynamic_paths = []

    static_paths = [item["path"] for item in AI_ROUTE_SITEMAP if item.get("path")]
    route_paths = list(dict.fromkeys(dynamic_paths + static_paths))

    async def _safe_ollama_stream(*args, **kwargs):
        # Call ollama_stream but tolerate test monkeypatches with narrower signatures.
        try:
            agen = ollama_stream(*args, **kwargs)
        except TypeError:
            # Fallbacks for tests that monkeypatch a simpler function signature.
            # 1) try calling without kwargs
            # 2) if that fails, try calling with common narrow signature (prompt, model)
            try:
                agen = ollama_stream(*args)
            except TypeError:
                try:
                    # Common simplified signature used in some tests: (prompt, model)
                    if len(args) >= 3:
                        # Build a composed prompt that includes the provided context
                        try:
                            composed = _build_prompt_with_context(args[0], args[1], True, 'simple')
                        except Exception:
                            composed = args[0]
                        agen = ollama_stream(composed, args[2])
                    else:
                        raise
                except TypeError:
                    # As a last resort, re-raise the original TypeError
                    raise

        async for chunk in agen:
            yield chunk

    return StreamingResponse(
        _safe_ollama_stream(
            message_to_use,
            runtime.get("context", ""),
            model_to_use,
            model_history,
            bool(runtime.get("enable_tools", False)),
            bool(runtime.get("include_search_tools", False)),
            str(runtime.get("mode", "simple")),
            route_paths=route_paths,
        ),
        media_type="application/x-ndjson",
    )


@router.post("/chat/basic")
async def chat_basic(request: Request, request_payload: ChatRequest, db: Session = Depends(get_db)):
    _enforce_rate_limit(request, "chat_basic")

    message_to_use = _sanitize_message_content(request_payload.message, AI_MAX_USER_MESSAGE_CHARS)
    if not message_to_use:
        raise HTTPException(status_code=400, detail="message is required")
    
    model_to_use = request_payload.model if request_payload.model else DEFAULT_MODEL
    session_id = request_payload.session_id or str(uuid4())

    runtime = _prepare_chat_runtime(message_to_use, db, bool(request_payload.enable_tools))
    system_prompt = _build_prompt_with_context(
        "",
        str(runtime.get("context", "")),
        bool(runtime.get("enable_tools", False)),
        str(runtime.get("mode", "simple")),
    )
    conversation_messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    conversation_messages.extend(_build_model_history(request_payload.history))
    conversation_messages.append({"role": "user", "content": message_to_use})

    # Build route whitelist including dynamic content paths so model tools can navigate to posts
    try:
        nav_items = _build_navigation_content_index(db)
        dynamic_paths = [item.get("path") for item in nav_items if item.get("path")]
    except Exception:
        dynamic_paths = []

    static_paths = [item["path"] for item in AI_ROUTE_SITEMAP if item.get("path")]
    route_paths = list(dict.fromkeys(dynamic_paths + static_paths))

    payload: Dict[str, Any] = {
        "model": model_to_use,
        "stream": False,
        "messages": conversation_messages,
        "options": {
            "temperature": AI_RESPONSE_TEMPERATURE,
            "top_p": AI_RESPONSE_TOP_P,
        },
    }
    # Also include a composed `prompt` field for upstreams/tests that expect a single prompt string
    try:
        payload_prompt = _build_prompt_with_context(
            message_to_use,
            str(runtime.get("context", "")),
            bool(runtime.get("enable_tools", False)),
            str(runtime.get("mode", "simple")),
        )
        payload["prompt"] = payload_prompt
    except Exception:
        # ignore prompt build failures and continue with messages array
        pass
    if runtime.get("enable_tools"):
        payload["tools"] = _build_ollama_tools(include_search_tools=bool(runtime.get("include_search_tools", False)), route_paths=route_paths)

    client = _get_http_client()
    try:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
        )
        if response.status_code != 200:
            raise HTTPException(status_code=503, detail="AI service unavailable")
        data = response.json()
        # Support multiple upstream JSON shapes for robustness in tests and different AI backends.
        answer = None
        if isinstance(data, dict):
            if "message" in data and isinstance(data.get("message"), dict):
                msg = data.get("message", {})
                answer = msg.get("content") or msg.get("text")
            # legacy/simple shape: { "response": "..." }
            if not answer:
                answer = data.get("response") or data.get("text") or data.get("answer")
        if not answer:
            answer = "Xin lỗi, tôi chưa thể trả lời lúc này."
    except Exception as e:
        logger.exception("AI service error (chat/basic) when calling %s: %s", OLLAMA_BASE_URL, str(e))
        raise HTTPException(status_code=503, detail="Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.")

    user_msg = {
        "id": str(uuid4()),
        "role": "user",
        "content": message_to_use,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    assistant_msg = {
        "id": str(uuid4()),
        "role": "assistant",
        "content": answer,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    chat_sessions.setdefault(session_id, []).extend([user_msg, assistant_msg])

    return {
        "session_id": session_id,
        "message": assistant_msg,
        "model": model_to_use,
    }


@router.get("/history", response_model=List[ChatHistoryItem])
async def get_chat_history(session_id: str):
    return chat_sessions.get(session_id, [])


@router.post("/feedback")
async def submit_chat_feedback(payload: ChatFeedbackRequest):
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="rating must be between 1 and 5")

    chat_feedbacks.append(
        {
            "session_id": payload.session_id,
            "message_id": payload.message_id,
            "rating": payload.rating,
            "comment": payload.comment,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {"message": "Feedback saved"}


@router.get("/health")
async def ai_health(db: Session = Depends(get_db)):
    try:
        return get_ai_health_snapshot(db)
    except Exception as e:
        logger.exception("AI health check failed: %s", str(e))
        return {
            "status": "degraded",
            "chroma": {
                "available": False,
                "path": CHROMA_DB_PATH,
                "collection": CHROMA_COLLECTION_NAME,
                "documents": 0,
                "error": "internal_error",
            },
        }


@router.get("/knowledge/search")
async def ai_knowledge_search(
    request: Request,
    query: str = Query(..., min_length=2),
    n_results: int = Query(5, ge=1, le=10),
    db: Session = Depends(get_db),
):
    _enforce_rate_limit(request, "knowledge_search")

    try:
        _sync_knowledge_base(db)
        items = _search_knowledge_records(query, n_results)
    except Exception as exc:
        logger.exception("Error searching AI knowledge for query=%s: %s", query, str(exc))
        raise HTTPException(status_code=500, detail="Không thể truy vấn AI knowledge lúc này. Vui lòng thử lại sau.")

    return {
        "query": query,
        "results": items,
        "total": len(items),
    }


@router.get("/navigation/search")
async def ai_navigation_search(
    request: Request,
    query: str = Query(..., min_length=2),
    n_results: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db),
):
    _enforce_rate_limit(request, "navigation_search")

    try:
        matches = _search_navigation_content(db, query=query, limit=n_results)
    except Exception as exc:
        logger.exception("Error searching navigation content for query=%s: %s", query, str(exc))
        raise HTTPException(status_code=500, detail="Không thể thực hiện tìm điều hướng lúc này. Vui lòng thử lại sau.")

    return {
        "query": query,
        "results": matches,
        "total": len(matches),
    }
