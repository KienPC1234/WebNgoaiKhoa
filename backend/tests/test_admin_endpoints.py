import app.api.admin as admin_module


def test_admin_stats_success(client, admin_headers):
    response = client.get("/api/admin/stats", headers=admin_headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["users"] >= 2
    assert payload["publications"] >= 1
    assert payload["submissions"] >= 1
    assert "pending_submissions" in payload


def test_admin_requires_token(client):
    response = client.get("/api/admin/users")

    assert response.status_code == 401


def test_non_admin_forbidden(client, student_headers):
    response = client.get("/api/admin/users", headers=student_headers)

    assert response.status_code == 403


def test_users_endpoint_handles_nullable_full_name(client, admin_headers):
    response = client.get("/api/admin/users", headers=admin_headers)

    assert response.status_code == 200
    users = response.json()
    assert any(user["full_name"] is None for user in users)


def test_admin_can_delete_user_but_not_self(client, admin_headers):
    users_res = client.get("/api/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    users = users_res.json()

    admin_user = next((u for u in users if u["role"] == "admin"), None)
    student_user = next((u for u in users if u["role"] != "admin"), None)
    assert admin_user is not None
    assert student_user is not None

    self_delete_res = client.delete(f"/api/admin/users/{admin_user['id']}", headers=admin_headers)
    assert self_delete_res.status_code == 400

    delete_res = client.delete(f"/api/admin/users/{student_user['id']}", headers=admin_headers)
    assert delete_res.status_code == 200

    users_after_res = client.get("/api/admin/users", headers=admin_headers)
    assert users_after_res.status_code == 200
    remaining_ids = [u["id"] for u in users_after_res.json()]
    assert student_user["id"] not in remaining_ids


def test_publications_crud_flow(client, admin_headers):
    create_payload = {
        "title": "New publication",
        "content": "New content",
        "category": "ktpl",
        "image_url": "https://example.com/image.png",
    }

    create_res = client.post("/api/admin/publications", headers=admin_headers, json=create_payload)
    assert create_res.status_code == 200

    created = create_res.json()
    publication_id = created["id"]
    assert created["title"] == create_payload["title"]

    update_payload = {
        "title": "Updated publication",
        "content": "Updated content",
        "category": "van",
        "image_url": None,
    }
    update_res = client.put(
        f"/api/admin/publications/{publication_id}",
        headers=admin_headers,
        json=update_payload,
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated publication"

    delete_res = client.delete(f"/api/admin/publications/{publication_id}", headers=admin_headers)
    assert delete_res.status_code == 200


def test_submission_status_update_supports_body_and_query(client, admin_headers):
    submissions_res = client.get("/api/admin/submissions", headers=admin_headers)
    assert submissions_res.status_code == 200
    submission_id = submissions_res.json()[0]["id"]

    body_res = client.put(
        f"/api/admin/submissions/{submission_id}/status",
        headers=admin_headers,
        json={"status": "approved"},
    )
    assert body_res.status_code == 200
    assert body_res.json()["status"] == "approved"

    query_res = client.put(
        f"/api/admin/submissions/{submission_id}/status?status=rejected",
        headers=admin_headers,
    )
    assert query_res.status_code == 200
    assert query_res.json()["status"] == "rejected"


def test_submission_status_rejects_invalid_value(client, admin_headers):
    submissions_res = client.get("/api/admin/submissions", headers=admin_headers)
    assert submissions_res.status_code == 200
    submission_id = submissions_res.json()[0]["id"]

    invalid_res = client.put(
        f"/api/admin/submissions/{submission_id}/status",
        headers=admin_headers,
        json={"status": "invalid-status"},
    )
    assert invalid_res.status_code == 422

    invalid_query_res = client.put(
        f"/api/admin/submissions/{submission_id}/status?status=invalid-status",
        headers=admin_headers,
    )
    assert invalid_query_res.status_code == 400


def test_admin_overview_returns_ai_and_activity(client, admin_headers):
    response = client.get("/api/admin/overview", headers=admin_headers)

    assert response.status_code == 200
    payload = response.json()
    assert "stats" in payload
    assert "ai_status" in payload
    assert "ai_documents" in payload
    assert "knowledge_assets" in payload
    assert "recent_activity" in payload


def test_ai_knowledge_upload_list_delete_flow(client, admin_headers):
    upload_res = client.post(
        "/api/admin/ai-knowledge/upload",
        headers=admin_headers,
        files={"files": ("rulebook.md", b"Noi dung the le cuoc thi", "text/markdown")},
    )
    assert upload_res.status_code == 200
    upload_payload = upload_res.json()
    assert len(upload_payload["uploaded"]) == 1
    asset_id = upload_payload["uploaded"][0]["id"]

    list_res = client.get("/api/admin/ai-knowledge/assets", headers=admin_headers)
    assert list_res.status_code == 200
    assert any(item["id"] == asset_id for item in list_res.json())

    delete_res = client.delete(f"/api/admin/ai-knowledge/assets/{asset_id}", headers=admin_headers)
    assert delete_res.status_code == 200


def test_admin_can_queue_newsletter_dispatch(client, admin_headers, monkeypatch):
    captured = {}

    def fake_dispatch(recipients, title, body, action_url=None, send_email=True, send_webpush_enabled=True):
        captured["recipients"] = recipients
        captured["title"] = title
        captured["body"] = body
        captured["action_url"] = action_url
        captured["send_email"] = send_email
        captured["send_webpush_enabled"] = send_webpush_enabled
        return {"total": len(recipients), "email_sent": len(recipients), "push_sent": 0}

    monkeypatch.setattr(admin_module.newsletter_service, "dispatch_newsletter_bulk", fake_dispatch)

    response = client.post(
        "/api/admin/newsletter/send",
        headers=admin_headers,
        json={
            "title": "Thong bao hoc tap",
            "body": "Noi dung cap nhat",
            "action_url": "/events/upcoming",
            "send_email": True,
            "send_webpush": False,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["queued"] is True
    assert payload["recipients"] >= 1
    assert captured["title"] == "Thong bao hoc tap"
    assert captured["send_email"] is True
    assert captured["send_webpush_enabled"] is False


def test_create_publication_respects_notification_channel_flags(client, admin_headers, monkeypatch):
    captured = {}

    def fake_dispatch(recipients, title, body, action_url=None, send_email=True, send_webpush_enabled=True):
        captured["send_email"] = send_email
        captured["send_webpush_enabled"] = send_webpush_enabled
        return {"total": len(recipients), "email_sent": 0, "push_sent": 0}

    monkeypatch.setattr(admin_module.newsletter_service, "dispatch_newsletter_bulk", fake_dispatch)

    create_payload = {
        "title": "Publication with flags",
        "content": "Content",
        "category": "van",
        "image_url": None,
    }

    response = client.post(
        "/api/admin/publications?send_email=false&send_webpush=true",
        headers=admin_headers,
        json=create_payload,
    )

    assert response.status_code == 200
    assert captured["send_email"] is False
    assert captured["send_webpush_enabled"] is True
