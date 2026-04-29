from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import Base, get_db
from app.api.auth import get_password_hash
from app.models.user import User, UserRole
from app.models.publication import StaffProfile

TEST_DB_PATH = Path(__file__).resolve().parent / "test_react.sqlite3"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == '__main__':
    # Clean up previous DB
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

    # Create schema
    Base.metadata.create_all(bind=engine)

    # Override app dependency
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)

    # Insert test user and a staff profile
    db = TestingSessionLocal()
    try:
        admin = User(
            email="student@webngoaikhoa.edu.vn",
            hashed_password=get_password_hash("student123"),
            full_name="Student",
            role=UserRole.STUDENT.value,
            is_active=True,
            email_verified=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        staff = StaffProfile(
            full_name="Test Staff",
            title="Instructor",
            bio="Test bio",
            is_active=True,
        )
        db.add(staff)
        db.commit()
        db.refresh(staff)

        print(f"Created test user id={admin.id} and staff id={staff.id}")

    finally:
        db.close()

    # Login to get token
    resp = client.post(
        "/api/auth/login",
        data={"username": "student@webngoaikhoa.edu.vn", "password": "student123"},
    )
    print("Login status:", resp.status_code, resp.text)
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]

    # Post a reaction with token
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post(f"/api/public/doingu/staff/{staff.id}/react", json={"reaction_type": "love"}, headers=headers)
    print("React response:", r.status_code, r.text)
    assert r.status_code == 200, r.text

    # Get bulk reactions
    r2 = client.get(f"/api/public/doingu/staff/reactions?ids={staff.id}")
    print("Bulk reactions response:", r2.status_code, r2.text)
    assert r2.status_code == 200

    print('Test flow OK')
