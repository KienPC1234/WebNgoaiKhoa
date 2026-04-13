import pymysql
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.models.user import User, UserRole
from app.models.publication import Publication, Submission, Comment
from passlib.context import CryptContext

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            print("Admin user created.")
        else:
            print("Admin user already exists.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    # 4. Seed Demo Data
    try:
        # Check if publications exist
        if db.query(Publication).count() == 0:
            print("Seeding demo publications...")
            demo_pubs = [
                Publication(
                    title="Kế hoạch ngoại khóa Hè 2026: Rực rỡ nắng cam",
                    content="Chào đón mùa hè sôi động với chuỗi hoạt động ngoại khóa hấp dẫn tại campus FPT. Từ các giải đấu thể thao đến các workshop công nghệ...",
                    category="ngoaikhoa",
                    image_url="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop"
                ),
                Publication(
                    title="Phân tích chuyên sâu: Kinh tế số và cơ hội cho Gen Z",
                    content="Kinh tế số không chỉ là xu hướng mà là nền tảng tất yếu. Bài viết phân tích các cơ hội nghề nghiệp trong lĩnh vực Fintech và Blockchain...",
                    category="ktpl",
                    image_url="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop"
                ),
                Publication(
                    title="Nhái Bén Số 01: Nơi những tâm hồn đồng điệu",
                    content="Số đầu tiên của ấn phẩm Nhái Bén chính thức ra mắt, quy tụ những tác phẩm văn chương xuất sắc nhất từ các bạn học sinh, sinh viên...",
                    category="van",
                    image_url="https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1000&auto=format&fit=crop"
                )
            ]
            db.add_all(demo_pubs)
            db.commit()
            print("Demo publications seeded.")
    except Exception as e:
        print(f"Error seeding publications: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
