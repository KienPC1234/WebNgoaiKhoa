# 🍊 Ngoại khoá nhịp đập (WebNgoaiKhoa)

Nền tảng giáo dục và nội dung số tích hợp AI hỗ trợ học tập, sáng tạo dành cho học sinh. Dự án được xây dựng với mục tiêu mang lại không gian trải nghiệm tri thức hiện đại, năng động và đầy tính tương tác.

## 🚀 Tính năng nổi bật

-   **AI Chatbox:** Tích hợp mô hình AI Ollama (`gemma4:31b-cloud`) giúp giải đáp thắc mắc học thuật tức thì.
-   **Phân môn chuyên sâu:** 
    -   **Văn học:** Nơi sáng tác, chia sẻ và bình chọn cho ấn phẩm "Nhái Bén".
    -   **Kinh tế Pháp luật:** Học liệu và kiến thức xã hội.
-   **Quản lý bài thi:** Hệ thống gửi bài, duyệt bài và bình luận bài thi từ cộng đồng.
-   **Realtime Notifications:** Thông báo thời gian thực qua WebSockets.

## 🛠 Công nghệ sử dụng

-   **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons.
-   **Backend:** Python FastAPI, SQLAlchemy, Pydantic, WebSockets.
-   **AI Engine:** Ollama local server.
-   **Database:** MySQL (với hệ thống tự động khởi tạo database).

## 📦 Hướng dẫn cài đặt và chạy nhanh

Bạn chỉ cần chạy một lệnh duy nhất để khởi động toàn bộ hệ thống (Bao gồm tạo môi trường Conda, cài đặt dependencies, khởi tạo database và chạy app).

```bash
chmod +x start.sh
./start.sh
```

### Yêu cầu tiên quyết:
-   **Conda:** Đã cài đặt (Anaconda hoặc Miniconda).
-   **Node.js & npm:** Đã cài đặt.
-   **MySQL:** Đang chạy tại `localhost:3306` (Thông tin root: `Htt@!23456`).
-   **Ollama:** Đang chạy với model `gemma4:31b-cloud`.

## 📂 Cấu trúc dự án

```text
/data/WebNgoaiKhoa/
├── backend/            # FastAPI Backend
│   ├── app/
│   │   ├── api/        # Endpoints (AI, Auth, Publications)
│   │   ├── db/         # Session & Database Initialization
│   │   ├── models/     # SQLAlchemy Models
│   │   └── main.py     # FastAPI Entrypoint
├── frontend/           # React Frontend
│   ├── src/
│   │   ├── components/ # UI Kit & AI Widget
│   │   ├── pages/      # Home, PhanMonVan, etc.
│   │   └── App.jsx     # Main Application
├── start.sh            # Script quản lý tự động (QUAN TRỌNG)
└── README.md           # Tài liệu dự án
```

## 📝 Quản lý PID & Log
-   **Logs:** 
    -   `backend.log`: Xem log của FastAPI.
    -   `frontend.log`: Xem log của Vite.
-   **PID:** File `.run_pids` lưu Process IDs của backend và frontend để dễ dàng dừng tiến trình.

---
© 2026 Ngoại khoá nhịp đập. Phát triển bởi Đội ngũ Công nghệ Giáo dục.
