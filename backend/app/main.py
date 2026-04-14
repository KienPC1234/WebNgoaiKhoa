from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api import ai, auth, admin, public
from app.db.notifications import manager
import uvicorn
import os
from dotenv import load_dotenv

# Load env variables
load_dotenv()

app = FastAPI(
    title="WebNgoaiKhoa API",
    description="Hệ thống quản lý ngoại khóa và AI Assistant cho FPT Education",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(public.router, prefix="/api/public", tags=["Public"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Welcome to WebNgoaiKhoa API",
        "version": "2.0.0"
    }

@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and wait for client to close
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 3002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
