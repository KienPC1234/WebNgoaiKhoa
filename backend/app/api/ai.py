from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import json
import os
from typing import Optional, Dict, List
from dotenv import load_dotenv
from datetime import datetime, timezone
from uuid import uuid4
from pathlib import Path
import chromadb
from chromadb.config import Settings
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.publication import Publication, Submission

load_dotenv()

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    model: Optional[str] = None


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
CHROMA_DB_PATH = os.getenv(
    "CHROMA_DB_PATH",
    str(Path(__file__).resolve().parent.parent.parent / "chroma_db"),
)

_chroma_client = None
_chroma_collection = None


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


def _normalize_text(text: str) -> str:
    return " ".join((text or "").split())


def _sync_knowledge_base(db: Session):
    collection = _get_chroma_collection()

    publications = db.query(Publication).all()
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
                "title": title[:250],
                "category": _normalize_text(pub.category)[:80],
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
                "title": title[:250],
                "student_name": _normalize_text(sub.student_name)[:160],
            }
        )

    existing_ids = set(collection.get(include=[]).get("ids", []))
    next_ids = set(ids)
    stale_ids = list(existing_ids - next_ids)
    if stale_ids:
        collection.delete(ids=stale_ids)

    if ids:
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)


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
        snippet = _normalize_text(doc)[:500]
        chunks.append(
            f"[{idx + 1}] ({source_type}#{source_id}) {title}\n{snippet}"
        )

    return "\n\n".join(chunks)


def _build_prompt_with_context(question: str, context: str) -> str:
    if not context:
        return (
            "Bạn là trợ lý AI thông minh của hệ thống Tổ xã hội tại FPT Education. "
            "Trả lời bằng tiếng Việt, rõ ràng và hữu ích. "
            f"\n\nCâu hỏi: {question}"
        )

    return (
        "Bạn là trợ lý AI thông minh của hệ thống Tổ xã hội tại FPT Education. "
        "Hãy ưu tiên trả lời dựa trên NGỮ CẢNH TRI THỨC được cung cấp. "
        "Nếu không đủ dữ liệu trong ngữ cảnh, hãy nói rõ phần chưa chắc chắn thay vì bịa thông tin. "
        "Trả lời bằng tiếng Việt, hỗ trợ Markdown và LaTeX khi cần."
        "\n\nNGỮ CẢNH TRI THỨC:\n"
        f"{context}"
        "\n\nCÂU HỎI NGƯỜI DÙNG:\n"
        f"{question}"
    )

async def ollama_stream(prompt: str, model: str):
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model, 
                    "prompt": prompt,
                },
            ) as response:
                if response.status_code != 200:
                    yield f"Lỗi: Server AI phản hồi trạng thái {response.status_code}. Vui lòng kiểm tra lại cấu hình mô hình {model}."
                    return

                async for chunk in response.aiter_text():
                    if chunk:
                        # Ollama can return multiple JSON objects in one chunk
                        for line in chunk.strip().split("\n"):
                            if line:
                                try:
                                    data = json.loads(line)
                                    if "response" in data:
                                        yield data["response"]
                                    if data.get("done"):
                                        break
                                except json.JSONDecodeError:
                                    continue
        except Exception as e:
            yield f"Lỗi kết nối tới AI: {str(e)}. Hãy đảm bảo server AI đang chạy tại {OLLAMA_BASE_URL}."

@router.post("/chat")
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    model_to_use = request.model if request.model else DEFAULT_MODEL
    try:
        _sync_knowledge_base(db)
        context = _retrieve_context(request.message)
    except Exception:
        context = ""

    prompt = _build_prompt_with_context(request.message, context)
    return StreamingResponse(ollama_stream(prompt, model_to_use), media_type="text/plain")


@router.post("/chat/basic")
async def chat_basic(request: ChatRequest, db: Session = Depends(get_db)):
    model_to_use = request.model if request.model else DEFAULT_MODEL
    session_id = request.session_id or str(uuid4())

    try:
        _sync_knowledge_base(db)
        context = _retrieve_context(request.message)
    except Exception:
        context = ""

    prompt = _build_prompt_with_context(request.message, context)

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model_to_use,
                    "stream": False,
                    "prompt": prompt,
                },
            )
            if response.status_code != 200:
                raise HTTPException(status_code=503, detail="AI service unavailable")
            data = response.json()
            answer = data.get("response", "Xin lỗi, tôi chưa thể trả lời lúc này.")
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"AI service error: {str(e)}")

    user_msg = {
        "id": str(uuid4()),
        "role": "user",
        "content": request.message,
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
        _sync_knowledge_base(db)
        collection = _get_chroma_collection()
        total_docs = collection.count()
        return {
            "status": "ok",
            "ollama_base_url": OLLAMA_BASE_URL,
            "default_model": DEFAULT_MODEL,
            "chroma": {
                "available": True,
                "path": CHROMA_DB_PATH,
                "collection": CHROMA_COLLECTION_NAME,
                "documents": total_docs,
            },
        }
    except Exception as e:
        return {
            "status": "degraded",
            "ollama_base_url": OLLAMA_BASE_URL,
            "default_model": DEFAULT_MODEL,
            "chroma": {
                "available": False,
                "path": CHROMA_DB_PATH,
                "collection": CHROMA_COLLECTION_NAME,
                "documents": 0,
                "error": str(e),
            },
        }
