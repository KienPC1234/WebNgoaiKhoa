#!/bin/bash

# Configuration
BACKEND_PORT=3002
FRONTEND_PORT=5173

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
ORANGE='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${ORANGE}=== DỪNG HỆ THỐNG NGOẠI KHOÁ NHỊP ĐẬP ===${NC}"

kill_port() {
    local port=$1
    local name=$2
    # Get all PIDs using the port
    local pids=$(lsof -t -i:$port)
    
    if [ ! -z "$pids" ]; then
        echo -e "${RED}Đang dừng $name trên cổng $port (PIDs: $pids)...${NC}"
        # Kill each PID
        for pid in $pids; do
            kill -9 $pid 2>/dev/null
        done
        echo -e "${GREEN}✔ Đã dừng $name.${NC}"
    else
        echo -e "${GREEN}✔ Không thấy tiến trình nào đang chạy trên cổng $port ($name).${NC}"
    fi
}

# Stop Backend
kill_port $BACKEND_PORT "Backend (FastAPI)"

# Stop Frontend
kill_port $FRONTEND_PORT "Frontend (Vite)"

# Clean up PID file if exists
if [ -f ".run_pids" ]; then
    rm .run_pids
fi

echo -e "${GREEN}=== HỆ THỐNG ĐÃ DỪNG HOÀN TOÀN ===${NC}"
