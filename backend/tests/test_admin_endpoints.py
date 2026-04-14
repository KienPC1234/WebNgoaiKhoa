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
