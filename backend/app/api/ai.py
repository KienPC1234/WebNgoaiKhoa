from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import json
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:31b-cloud")

async def ollama_stream(prompt: str):
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL, 
                    "prompt": f"Bạn là trợ lý AI thông minh của hệ thống Ngoại khoá Nhịp đập tại FPT Education. Hãy trả lời câu hỏi sau bằng tiếng Việt, hỗ trợ Markdown và LaTeX nếu cần: {prompt}"
                },
            ) as response:
                if response.status_code != 200:
                    yield f"Error: Ollama server returned status {response.status_code}"
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
            yield f"Error connecting to Ollama: {str(e)}. Hãy đảm bảo Ollama đang chạy tại {OLLAMA_BASE_URL}."

@router.post("/chat")
async def chat_with_ai(request: ChatRequest):
    return StreamingResponse(ollama_stream(request.message), media_type="text/plain")
