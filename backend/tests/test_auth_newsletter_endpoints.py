from pathlib import Path

from app.api.auth import build_unsubscribe_token
from app.models.user import User
from app.services import newsletter as newsletter_service


def test_unsubscribe_with_valid_token(client, db_session):
    email = "student@webngoaikhoa.edu.vn"
    token = build_unsubscribe_token(email)

    response = client.post(
        "/api/auth/unsubscribe",
        json={"email": email, "token": token},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["email"] == email
    assert payload["webpush_tokens_cleared"] is True

    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    assert user.is_subscribed is False


def test_unsubscribe_rejects_invalid_token(client):
    response = client.post(
        "/api/auth/unsubscribe",
        json={"email": "student@webngoaikhoa.edu.vn", "token": "bad-token"},
    )

    assert response.status_code == 400


def test_push_register_and_unregister(client, student_headers, monkeypatch, tmp_path):
    registry_path = tmp_path / "push_registry.json"
    monkeypatch.setattr(newsletter_service, "PUSH_REGISTRY_FILE", Path(registry_path))

    register_res = client.post(
        "/api/auth/push/register",
        headers=student_headers,
        json={"token": "fcm-token-1"},
    )
    assert register_res.status_code == 200
    assert register_res.json()["tokens"] == 1

    unregister_res = client.post(
        "/api/auth/push/unregister",
        headers=student_headers,
        json={"token": "fcm-token-1"},
    )
    assert unregister_res.status_code == 200
    assert unregister_res.json()["tokens"] == 0


def test_push_register_blocked_for_unsubscribed_user(client, student_headers):
    email = "student@webngoaikhoa.edu.vn"
    token = build_unsubscribe_token(email)

    unsub_res = client.post(
        "/api/auth/unsubscribe",
        json={"email": email, "token": token},
    )
    assert unsub_res.status_code == 200

    push_res = client.post(
        "/api/auth/push/register",
        headers=student_headers,
        json={"token": "fcm-token-2"},
    )
    assert push_res.status_code == 400


def test_login_accepts_email_with_mixed_case_and_spaces(client):
    response = client.post(
        "/api/auth/login",
        data={"username": "  STUDENT@WebNgoaiKhoa.edu.vn ", "password": "student123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["email"] == "student@webngoaikhoa.edu.vn"
