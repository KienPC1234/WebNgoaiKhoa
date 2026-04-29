#!/bin/bash

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
NC='\033[0m' # No Color

echo -e "${ORANGE}=== HỆ THỐNG NGOẠI KHOÁ NHỊP ĐẬP (FPT EDITION) ===${NC}"

# 1. Kill processes on ports
kill_port() {
    local port=$1
    # Get only PIDs, excluding the command header
    local pids=$(lsof -t -i:$port)
    if [ ! -z "$pids" ]; then
        echo -e "${RED}Dừng các tiến trình trên cổng $port (PIDs: $pids)...${NC}"
        # Use xargs for cleaner multi-PID killing
        echo $pids | xargs kill -9 2>/dev/null
        # Wait a moment for OS to release the port
        sleep 2
    fi
}

kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# 2. Setup Conda Environment (Isolated)
echo -e "${BLUE}Kiểm tra môi trường Conda...${NC}"
CONDA_PATH=$(which conda)
if [ -z "$CONDA_PATH" ]; then
    echo -e "${RED}LỖI: Không tìm thấy Conda. Vui lòng cài đặt Miniconda hoặc Anaconda.${NC}"
    exit 1
fi

if ! conda info --envs | grep -q "$CONDA_ENV_NAME"; then
    echo -e "${ORANGE}Tạo môi trường Conda mới: $CONDA_ENV_NAME...${NC}"
    conda create -n $CONDA_ENV_NAME python=3.10 -y
fi

# Robust activation
CONDA_BASE=$(conda info --base)
source "$CONDA_BASE/etc/profile.d/conda.sh"
conda activate $CONDA_ENV_NAME

if [[ "$CONDA_DEFAULT_ENV" != "$CONDA_ENV_NAME" ]]; then
    echo -e "${RED}LỖI: Không thể kích hoạt môi trường $CONDA_ENV_NAME.${NC}"
    exit 1
fi
echo -e "${GREEN}Môi trường đang dùng: $CONDA_DEFAULT_ENV${NC}"

# 3. Install Backend Dependencies
echo -e "${BLUE}Cài đặt thư viện Backend...${NC}"
pip install -r backend/requirements.txt --quiet

# 4. Initialize Database
echo -e "${BLUE}Khởi tạo Cơ sở dữ liệu MySQL...${NC}"
export PYTHONPATH=$PYTHONPATH:$(pwd)/backend
python backend/app/db/init_db.py

# 5. Start Backend
echo -e "${ORANGE}Khởi động Backend (FastAPI)...${NC}"
cd backend
nohup python app/main.py > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../$PID_FILE
cd ..

# 6. Setup and Start Frontend
echo -e "${BLUE}Chuẩn bị Frontend (Vite)...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${ORANGE}Cài đặt thư viện Frontend (npm install)...${NC}"
    npm install --silent
fi

echo -e "${ORANGE}Khởi động Frontend...${NC}"
nohup npm run dev -- --host > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID >> ../$PID_FILE
cd ..

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}KHỞI ĐỘNG THÀNH CÔNG (FPT THEME)${NC}"
echo -e "${BLUE}Trang chủ: http://localhost:$FRONTEND_PORT${NC}"
echo -e "${BLUE}API Docs: http://localhost:$BACKEND_PORT/docs${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e "${ORANGE}Dùng 'tail -f backend.log' để theo dõi Backend.${NC}"
