from pathlib import Path

import app.api.public as public_module
from sqlalchemy import text


def test_contestant_can_submit_with_pdf(client, student_headers, monkeypatch, tmp_path):
    monkeypatch.setattr(public_module, "UPLOAD_DIR", Path(tmp_path) / "submissions")

    response = client.post(
        "/api/public/submissions/upload",
        headers=student_headers,
        data={
            "title": "Bai du thi PDF",
            "content": "Noi dung bai du thi co tep dinh kem",
            "student_name": "Sinh vien A",
        },
        files={"file": ("entry.pdf", b"%PDF-1.4\n%fake\n", "application/pdf")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "Bai du thi PDF"
    assert payload["attachment_url"]
    assert payload["attachment_url"].endswith(".pdf")


def test_reject_non_pdf_submission_upload(client, student_headers, monkeypatch, tmp_path):
    monkeypatch.setattr(public_module, "UPLOAD_DIR", Path(tmp_path) / "submissions")

    response = client.post(
        "/api/public/submissions/upload",
        headers=student_headers,
        data={
            "title": "Bai sai dinh dang",
            "content": "Noi dung",
            "student_name": "Sinh vien A",
        },
        files={"file": ("entry.txt", b"text", "text/plain")},
    )

    assert response.status_code == 400


def test_contestant_can_comment_on_approved_submission(client, student_headers, admin_headers):
    submissions_res = client.get("/api/admin/submissions", headers=admin_headers)
    assert submissions_res.status_code == 200
    sub_id = submissions_res.json()[0]["id"]

    approve_res = client.put(
        f"/api/admin/submissions/{sub_id}/status",
        headers=admin_headers,
        json={"status": "approved"},
    )
    assert approve_res.status_code == 200

    create_comment_res = client.post(
        f"/api/public/submissions/{sub_id}/comments",
        headers=student_headers,
        json={"content": "<p>Bài viết rất truyền cảm hứng!</p>"},
    )
    assert create_comment_res.status_code == 200
    comment_payload = create_comment_res.json()
    assert comment_payload["submission_id"] == sub_id
    assert comment_payload["author_name"] == "student@webngoaikhoa.edu.vn"

    list_comment_res = client.get(f"/api/public/submissions/{sub_id}/comments")
    assert list_comment_res.status_code == 200
    items = list_comment_res.json()
    assert len(items) >= 1
    assert items[0]["submission_id"] == sub_id


def test_reject_comment_on_non_approved_submission(client, student_headers, admin_headers):
    submissions_res = client.get("/api/admin/submissions", headers=admin_headers)
    assert submissions_res.status_code == 200
    sub_id = submissions_res.json()[0]["id"]

    response = client.post(
        f"/api/public/submissions/{sub_id}/comments",
        headers=student_headers,
        json={"content": "Bình luận khi chưa duyệt"},
    )
    assert response.status_code == 404


def test_contestant_can_only_vote_once_per_submission(client, student_headers, admin_headers):
    submissions_res = client.get("/api/admin/submissions", headers=admin_headers)
    assert submissions_res.status_code == 200
    sub_id = submissions_res.json()[0]["id"]

    approve_res = client.put(
        f"/api/admin/submissions/{sub_id}/status",
        headers=admin_headers,
        json={"status": "approved"},
    )
    assert approve_res.status_code == 200

    first_vote = client.post(
        f"/api/public/submissions/{sub_id}/vote",
        headers=student_headers,
        json={},
    )
    assert first_vote.status_code == 200
    assert first_vote.json()["votes"] == 1

    second_vote = client.post(
        f"/api/public/submissions/{sub_id}/vote",
        headers=student_headers,
        json={},
    )
    assert second_vote.status_code == 409


def test_voted_submission_ids_returns_user_votes(client, student_headers, admin_headers):
    submissions_res = client.get("/api/admin/submissions", headers=admin_headers)
    assert submissions_res.status_code == 200
    sub_id = submissions_res.json()[0]["id"]

    approve_res = client.put(
        f"/api/admin/submissions/{sub_id}/status",
        headers=admin_headers,
        json={"status": "approved"},
    )
    assert approve_res.status_code == 200

    vote_res = client.post(
        f"/api/public/submissions/{sub_id}/vote",
        headers=student_headers,
        json={},
    )
    assert vote_res.status_code == 200

    voted_res = client.get("/api/public/submissions/votes/me", headers=student_headers)
    assert voted_res.status_code == 200
    assert sub_id in voted_res.json()


def test_vote_endpoint_recovers_when_submission_votes_table_missing(client, student_headers, admin_headers, db_session):
    db_session.execute(text("DROP TABLE IF EXISTS submission_votes"))
    db_session.commit()

    submissions_res = client.get("/api/admin/submissions", headers=admin_headers)
    assert submissions_res.status_code == 200
    sub_id = submissions_res.json()[0]["id"]

    approve_res = client.put(
        f"/api/admin/submissions/{sub_id}/status",
        headers=admin_headers,
        json={"status": "approved"},
    )
    assert approve_res.status_code == 200

    vote_res = client.post(
        f"/api/public/submissions/{sub_id}/vote",
        headers=student_headers,
        json={},
    )
    assert vote_res.status_code == 200
