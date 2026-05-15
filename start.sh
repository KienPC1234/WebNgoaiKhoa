#!/bin/bash

# Dev Start Script - WebNgoaiKhoa
# Tắt Production nếu đang chạy, khởi động Dev mode dễ debug

# Configuration
CONDA_ENV_NAME="webngoaikhoa_fpt_env"
BACKEND_PORT=3002
FRONTEND_PORT=5173
PID_FILE=".run_pids"

# Colors
ORANGE='\033[0;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${ORANGE}=== DEV MODE - NGOẠI KHOÁ NHỊP ĐẬP ===${NC}"
echo ""

# ============================================
# 1. TẮT PRODUCTION SERVERS (nếu đang chạy)
# ============================================
echo -e "${CYAN}[1/7] Kiểm tra và tắt Production servers...${NC}"

kill_port() {
    local port=$1
    local name=$2
    local pids=$(lsof -t -i:$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo -e "${RED}  Dừng $name trên cổng $port (PIDs: $pids)...${NC}"
        for pid in $pids; do
            kill -9 $pid 2>/dev/null
        done
        sleep 1
    fi
}

# Tắt production servers trên cả 2 port
kill_port $FRONTEND_PORT "Frontend (Vite Preview/Dev)"
kill_port $BACKEND_PORT "Backend (FastAPI/Uvicorn)"

# Kill thêm uvicorn workers (production có thể chạy nhiều workers)
pkill -f "uvicorn app.main:app" 2>/dev/null
pkill -f "vite preview" 2>/dev/null

# Đợi OS giải phóng port
sleep 1

echo -e "${GREEN}  Đã dọn dẹp xong!${NC}"
echo ""

# Clear old PID file
> $PID_FILE

# ============================================
# 2. SETUP CONDA ENVIRONMENT
# ============================================
echo -e "${CYAN}[2/7] Kiểm tra môi trường Conda...${NC}"

CONDA_PATH=$(which conda)
if [ -z "$CONDA_PATH" ]; then
    echo -e "${RED}  LỖI: Không tìm thấy Conda.${NC}"
    exit 1
fi

if ! conda info --envs | grep -q "$CONDA_ENV_NAME"; then
    echo -e "${ORANGE}  Tạo môi trường Conda: $CONDA_ENV_NAME...${NC}"
    conda create -n $CONDA_ENV_NAME python=3.10 -y
fi

CONDA_BASE=$(conda info --base)
source "$CONDA_BASE/etc/profile.d/conda.sh"
conda activate $CONDA_ENV_NAME

if [[ "$CONDA_DEFAULT_ENV" != "$CONDA_ENV_NAME" ]]; then
    echo -e "${RED}  LỖI: Không thể kích hoạt $CONDA_ENV_NAME.${NC}"
    exit 1
fi
echo -e "${GREEN}  Môi trường: $CONDA_DEFAULT_ENV${NC}"
echo ""

# ============================================
# 3. INSTALL BACKEND DEPENDENCIES
# ============================================
echo -e "${CYAN}[3/7] Cài đặt thư viện Backend...${NC}"
pip install -r backend/requirements.txt --quiet
echo -e "${GREEN}  Hoàn tất!${NC}"
echo ""

# ============================================
# 4. INITIALIZE DATABASE
# ============================================
echo -e "${CYAN}[4/7] Khởi tạo Database...${NC}"
export PYTHONPATH=$PYTHONPATH:$(pwd)/backend
python backend/app/db/init_db.py
echo ""

# ============================================
# 5. START BACKEND (Dev - reload + debug)
# ============================================
echo -e "${CYAN}[5/7] Khởi động Backend (FastAPI - Dev Mode)...${NC}"
cd backend
nohup python -c "
import uvicorn
import os
from dotenv import load_dotenv
load_dotenv()

port = int(os.getenv('PORT', 3002))
forwarded_allow_ips = os.getenv('FORWARDED_ALLOW_IPS', '*')

uvicorn.run(
    'app.main:app',
    host='0.0.0.0',
    port=port,
    reload=True,
    log_level='debug',
    proxy_headers=True,
    forwarded_allow_ips=forwarded_allow_ips,
    access_log=True,
)
" > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID >> ../$PID_FILE
cd ..
echo -e "${GREEN}  Backend PID: $BACKEND_PID (reload=True, log_level=debug)${NC}"
echo ""

# ============================================
# 6. SETUP FRONTEND
# ============================================
echo -e "${CYAN}[6/7] Chuẩn bị Frontend (Vite)...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${ORANGE}  Cài đặt thư viện Frontend...${NC}"
    npm install --silent
fi
echo ""

# ============================================
# 7. START FRONTEND (Dev - HMR)
# ============================================
echo -e "${CYAN}[7/7] Khởi động Frontend (Vite Dev - HMR)...${NC}"
nohup npm run dev -- --host > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID >> ../$PID_FILE
cd ..
echo -e "${GREEN}  Frontend PID: $FRONTEND_PID (HMR enabled)${NC}"
echo ""

# ============================================
# ĐỢI SERVICES KHỞI ĐỘNG
# ============================================
echo -e "${YELLOW}  Đợi services khởi động...${NC}"
sleep 3

# ============================================
# SUMMARY
# ============================================
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  DEV SERVER ĐÃ KHỞI ĐỘNG!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "${BLUE}  Trang chủ : http://localhost:$FRONTEND_PORT${NC}"
echo -e "${BLUE}  API Docs   : http://localhost:$BACKEND_PORT/docs${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "${CYAN}  Debug Mode:${NC}"
echo -e "    Backend  : reload=True, log_level=debug"
echo -e "    Frontend : HMR (Hot Module Replacement)"
echo -e "${GREEN}=========================================${NC}"
echo -e "${ORANGE}  Theo dõi logs:${NC}"
echo -e "    tail -f backend.log"
echo -e "    tail -f frontend.log"
echo -e "${GREEN}=========================================${NC}"
