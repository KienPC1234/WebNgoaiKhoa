from app.models.publication import (
    Comment,
    ContentType,
    Event,
    Publication,
    SocialScale,
    StaffProfile,
    Story,
    Submission,
)
import pymysql
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.models.user import User, UserRole
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta

load_dotenv()

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

from sqlalchemy.engine.url import make_url

def init_database():
    # 1. Connect to MySQL without database to create it if not exists
    db_url = os.getenv("DATABASE_URL")
    url = make_url(db_url)
    
    user = url.username
    password = url.password
    host = url.host
    db_name = url.database

    print(f"Connecting to MySQL at {host} as {user}...")
    
    try:
        connection = pymysql.connect(
            host=host,
            user=user,
            password=password
        )
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print(f"Database '{db_name}' ensured.")
        connection.close()
    except Exception as e:
        print(f"Error creating database: {e}")
        return

    # 2. Use SQLAlchemy to create tables
    engine = create_engine(db_url)
    try:
        Base.metadata.create_all(bind=engine)
        print("All tables created successfully.")
    except Exception as e:
        print(f"Error creating tables: {e}")
        return

    # 2.1. Ensure new columns for legacy databases
    try:
        inspector = inspect(engine)
        pub_columns = {c["name"] for c in inspector.get_columns("publications")}
        user_columns = {c["name"] for c in inspector.get_columns("users")}
        statements = []

        if "subject" not in pub_columns:
            statements.append("ALTER TABLE publications ADD COLUMN subject VARCHAR(50) NOT NULL DEFAULT 'van'")
        if "content_type" not in pub_columns:
            statements.append("ALTER TABLE publications ADD COLUMN content_type VARCHAR(50) NOT NULL DEFAULT 'an-pham'")
        if "featured_year" not in pub_columns:
            statements.append("ALTER TABLE publications ADD COLUMN featured_year VARCHAR(20) NULL")
        if "layout_metadata" not in pub_columns:
            statements.append("ALTER TABLE publications ADD COLUMN layout_metadata JSON NULL")

        if "email_verified" not in user_columns:
            statements.append("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0")
        if "verification_token" not in user_columns:
            statements.append("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255) NULL")
        if "verification_token_expires_at" not in user_columns:
            statements.append("ALTER TABLE users ADD COLUMN verification_token_expires_at DATETIME NULL")
        if "last_verification_sent_at" not in user_columns:
            statements.append("ALTER TABLE users ADD COLUMN last_verification_sent_at DATETIME NULL")
        if "is_subscribed" not in user_columns:
            statements.append("ALTER TABLE users ADD COLUMN is_subscribed BOOLEAN NOT NULL DEFAULT 1")

        if statements:
            with engine.begin() as conn:
                for stmt in statements:
                    conn.execute(text(stmt))
            print("Legacy publication schema upgraded.")

        with engine.begin() as conn:
            conn.execute(text("UPDATE publications SET subject = category WHERE subject IS NULL OR subject = ''"))
            conn.execute(text("UPDATE publications SET category = subject WHERE category IS NULL OR category = ''"))
            conn.execute(text("UPDATE publications SET content_type = 'an-pham' WHERE content_type IS NULL OR content_type = ''"))
            conn.execute(text("UPDATE users SET is_subscribed = 1 WHERE is_subscribed IS NULL"))
    except Exception as e:
        print(f"Warning: schema upgrade skipped due to: {e}")

    # 3. Seed Demo Admin User
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        admin_email = "admin@webngoaikhoa.edu.vn"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            print(f"Seeding demo admin user: {admin_email}...")
            new_admin = User(
                email=admin_email,
                hashed_password=get_password_hash("admin123"),
                full_name="Ban Tổ Chức (Admin)",
                role=UserRole.ADMIN,
                is_active=True,
                email_verified=True,
            )
            db.add(new_admin)
            db.commit()
            print("Admin user created.")
        else:
            # If existing admin hash is not using pbkdf2_sha256, replace it with the demo password hash
            existing_hash = (admin.hashed_password or "")
            if not existing_hash.startswith("$pbkdf2-sha256$"):
                print("Admin exists but password hash uses an unsupported scheme. Resetting to demo password...")
                admin.hashed_password = get_password_hash("admin123")
                db.add(admin)
                db.commit()
                print("Admin password reset to demo credentials.")
            else:
                print("Admin user already exists with compatible password hash.")
            admin.email_verified = True
            db.add(admin)
            db.commit()
    except Exception as e:
        print(f"Error seeding database: {e}")
    # 4. Seed Demo Data
    try:
        # Check if publications exist
        if db.query(Publication).count() == 0:
            print("Seeding demo publications...")
            demo_pubs = [
                Publication(
                    title="Ngữ Văn: Tuyển tập sáng tác học kỳ II",
                    content="Tổng hợp các tác phẩm tiêu biểu do học sinh sinh viên biên soạn trong học kỳ II năm học 2025-2026.",
                    category="van",
                    subject="van",
                    content_type=ContentType.AN_PHAM.value,
                    featured_year="2025-2026",
                    image_url="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop"
                ),
                Publication(
                    title="KTPL: Bộ tài liệu tham khảo Luật Công dân số",
                    content="Bộ tài liệu tham khảo phục vụ học phần Kinh tế pháp luật, nhấn mạnh quyền và nghĩa vụ trong môi trường số.",
                    category="ktpl",
                    subject="ktpl",
                    content_type=ContentType.TAI_LIEU.value,
                    featured_year="2025-2026",
                    image_url="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop"
                ),
                Publication(
                    title="Lịch sử: Vinh danh nghiên cứu trẻ",
                    content="Vinh danh nhóm sinh viên có đề tài nghiên cứu lịch sử địa phương xuất sắc năm học 2025-2026.",
                    category="lich-su",
                    subject="lich-su",
                    content_type=ContentType.VINH_DANH.value,
                    featured_year="2025-2026",
                    image_url="https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1000&auto=format&fit=crop"
                ),
                Publication(
                    title="Địa lí: Atlas học đường số hóa",
                    content="Ấn phẩm học tập trực quan về địa lí Việt Nam và thế giới dành cho học sinh THPT.",
                    category="dia-li",
                    subject="dia-li",
                    content_type=ContentType.AN_PHAM.value,
                    featured_year="2025-2026",
                    image_url="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop"
                ),
                Publication(
                    title="Vovinam: Tài liệu kỹ thuật căn bản",
                    content="Tài liệu chuẩn hóa các kỹ thuật căn bản, lộ trình luyện tập và quy tắc an toàn trong Vovinam.",
                    category="vovinam",
                    subject="vovinam",
                    content_type=ContentType.TAI_LIEU.value,
                    featured_year="2025-2026",
                    image_url="https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1000&auto=format&fit=crop"
                )
            ]
            db.add_all(demo_pubs)
            db.commit()
            print("Demo publications seeded.")

        if db.query(Event).count() == 0:
            print("Seeding demo events...")
            demo_events = [
                Event(
                    title="Hội thảo chuyển đổi số trong giáo dục xã hội",
                    description="Chuỗi chuyên đề về ứng dụng AI và dữ liệu số trong giảng dạy các môn khoa học xã hội.",
                    event_date=datetime.now(timezone.utc) + timedelta(days=10),
                    location="Hội trường Alpha, FPT Education",
                    image_url="https://images.unsplash.com/photo-1540575861501-7ad058211a37?auto=format&fit=crop&q=80&w=1000",
                    status="upcoming",
                    is_active=True,
                ),
                Event(
                    title="Giao lưu Vovinam cấp trường",
                    description="Hoạt động giao lưu võ đạo và trình diễn kỹ thuật giữa các câu lạc bộ.",
                    event_date=datetime.now(timezone.utc) + timedelta(days=20),
                    location="Nhà thi đấu đa năng FPT",
                    image_url="https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=1000",
                    status="registration",
                    is_active=True,
                ),
            ]
            db.add_all(demo_events)
            db.commit()
            print("Demo events seeded.")

        if db.query(Story).count() == 0:
            print("Seeding demo stories...")
            demo_stories = [
                Story(
                    title="Từ CLB Văn học đến giải thưởng sáng tác trẻ",
                    content="Hành trình của một sinh viên từ những buổi sinh hoạt CLB đầu tiên đến giải thưởng sáng tác cấp thành phố.",
                    snippet="Hành trình trưởng thành qua từng trang viết và từng lần phản biện.",
                    author="Lê Minh Quan",
                    category="Cá nhân",
                    image_url="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1000",
                    read_time_minutes=6,
                    is_published=True,
                ),
                Story(
                    title="Dự án lịch sử số hóa di tích địa phương",
                    content="Nhóm sinh viên liên ngành đã dùng công nghệ để số hóa dữ liệu di tích và kể lại lịch sử bằng trải nghiệm trực quan.",
                    snippet="Khi công nghệ gặp lịch sử, lớp học trở thành không gian trải nghiệm.",
                    author="Nhóm Sáng tạo Trẻ",
                    category="Cộng đồng",
                    image_url="https://images.unsplash.com/photo-1544650030-3c9baf62110c?auto=format&fit=crop&q=80&w=1000",
                    read_time_minutes=8,
                    is_published=True,
                ),
            ]
            db.add_all(demo_stories)
            db.commit()
            print("Demo stories seeded.")

        if db.query(SocialScale).count() == 0:
            print("Seeding social scale profile...")
            scale = SocialScale(
                hero_title="Tổ xã hội - Quy mô & phát triển",
                hero_subtitle="Deep learning with love - Kết nối tri thức xã hội trong môi trường số.",
                vision="Phát triển năng lực công dân toàn cầu cho học sinh sinh viên thông qua các phân môn xã hội và hoạt động liên ngành.",
                subjects_overview="Ngữ Văn, Kinh tế pháp luật, Lịch sử, Địa lí, Vovinam",
                staff_count=50,
                student_count=5000,
                projects_count=100,
                awards_count=25,
                roadmap="2026-2028: mở rộng học liệu số, hệ sinh thái sự kiện liên môn và mạng lưới cố vấn học thuật.",
                is_active=True,
            )
            db.add(scale)
            db.commit()
            print("Social scale seeded.")

        if db.query(StaffProfile).count() == 0:
            print("Seeding staff profiles...")
            staff_items = [
                StaffProfile(
                    full_name="ThS. Nguyễn Văn A",
                    title="Trưởng bộ môn Ngữ Văn",
                    bio="Hơn 15 năm kinh nghiệm giảng dạy và nghiên cứu văn học hiện đại.",
                    expertise="Văn học hiện đại",
                    image_url="https://i.pravatar.cc/300?u=staff-a",
                    display_order=1,
                    is_active=True,
                ),
                StaffProfile(
                    full_name="TS. Trần Thị B",
                    title="Giảng viên Lịch sử",
                    bio="Chuyên gia về lịch sử bang giao quốc tế và văn hóa Việt Nam.",
                    expertise="Lịch sử và văn hóa",
                    image_url="https://i.pravatar.cc/300?u=staff-b",
                    display_order=2,
                    is_active=True,
                ),
                StaffProfile(
                    full_name="ThS. Lê Văn C",
                    title="Huấn luyện viên Vovinam",
                    bio="Võ sư trung đẳng, tâm huyết với sự nghiệp phát triển võ thuật học đường.",
                    expertise="Vovinam",
                    image_url="https://i.pravatar.cc/300?u=staff-c",
                    display_order=3,
                    is_active=True,
                ),
                StaffProfile(
                    full_name="ThS. Phạm Thị D",
                    title="Giảng viên Địa lí",
                    bio="Nghiên cứu sâu về biến đổi khí hậu và quy hoạch vùng.",
                    expertise="Địa lí ứng dụng",
                    image_url="https://i.pravatar.cc/300?u=staff-d",
                    display_order=4,
                    is_active=True,
                ),
            ]
            db.add_all(staff_items)
            db.commit()
            print("Staff profiles seeded.")

    except Exception as e:
        print(f"Error seeding publications: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
