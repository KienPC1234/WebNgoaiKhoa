from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import json
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = None

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:120b-cloud")

async def ollama_stream(prompt: str, model: str):
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model, 
                    "prompt": f"Bạn là trợ lý AI thông minh của hệ thống Ngoại khoá Nhịp đập tại FPT Education. Hãy trả lời câu hỏi sau bằng tiếng Việt, hỗ trợ Markdown và LaTeX nếu cần: {prompt}"
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
async def chat_with_ai(request: ChatRequest):
    model_to_use = request.model if request.model else DEFAULT_MODEL
    return StreamingResponse(ollama_stream(request.message, model_to_use), media_type="text/plain")
