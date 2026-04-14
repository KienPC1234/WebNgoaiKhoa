import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import Base, get_db
from app.main import app
from app.models.publication import Publication, Submission
from app.models.user import User, UserRole
from app.api.auth import get_password_hash


TEST_DB_PATH = Path(__file__).resolve().parent / "test_backend.sqlite3"
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


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db

    yield

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest.fixture(scope="function")
def db_session():
    db = TestingSessionLocal()
    try:
        db.query(Publication).delete()
        db.query(Submission).delete()
        db.query(User).delete()
        db.commit()

        admin = User(
            email="admin@webngoaikhoa.edu.vn",
            hashed_password=get_password_hash("admin123"),
            full_name="Admin",
            role=UserRole.ADMIN.value,
            is_active=True,
            email_verified=True,
        )
        student = User(
            email="student@webngoaikhoa.edu.vn",
            hashed_password=get_password_hash("student123"),
            full_name=None,
            role=UserRole.STUDENT.value,
            is_active=True,
            email_verified=True,
        )

        db.add_all([admin, student])
        db.commit()

        publication = Publication(
            title="Initial publication",
            content="Initial content",
            category="van",
            image_url=None,
            author_id=admin.id,
        )
        submission = Submission(
            title="Initial submission",
            content="Submission content",
            student_name=None,
            student_email=None,
            status="pending",
            votes=0,
        )

        db.add_all([publication, submission])
        db.commit()

        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client(db_session):
    return TestClient(app)


@pytest.fixture(scope="function")
def admin_headers(client):
    response = client.post(
        "/api/auth/login",
        data={"username": "admin@webngoaikhoa.edu.vn", "password": "admin123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def student_headers(client):
    response = client.post(
        "/api/auth/login",
        data={"username": "student@webngoaikhoa.edu.vn", "password": "student123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
