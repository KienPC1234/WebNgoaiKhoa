from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from app.api import ai, auth, admin, public
from app.api import notifications
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

def parse_csv_env(name: str, default: str = ""):
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# Cloudflare Tunnel / reverse proxy settings
cors_origins = parse_csv_env("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
trusted_hosts = parse_csv_env("TRUSTED_HOSTS", "localhost,127.0.0.1")
forwarded_allow_ips = os.getenv("FORWARDED_ALLOW_IPS", "*")

if "testserver" not in trusted_hosts:
    trusted_hosts.append("testserver")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=trusted_hosts,
)

app.add_middleware(
    GZipMiddleware,
    minimum_size=1024,
    compresslevel=5,
)

# Include Routers
app.include_router(public.router, prefix="/api/public", tags=["Public"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])

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
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        proxy_headers=True,
        forwarded_allow_ips=forwarded_allow_ips,
    )
