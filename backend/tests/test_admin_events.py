def test_create_event_with_rrule_and_timezone(client, admin_headers):
    payload = {
        "title": "Recurring meeting",
        "description": "Weekly team sync",
        "event_date": "2026-05-01T09:00:00Z",
        "rrule": "FREQ=WEEKLY;BYDAY=MO",
        "timezone": "Asia/Ho_Chi_Minh",
        "location": "Room 1",
        "image_url": None,
        "status": "upcoming",
        "linked_post_id": None,
        "is_active": True,
    }

    create_res = client.post("/api/admin/events", headers=admin_headers, json=payload)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["title"] == payload["title"]
    assert created["rrule"] == payload["rrule"]
    assert created["timezone"] == payload["timezone"]


def test_event_attachments_crud(client, admin_headers):
    # create a simple event
    payload = {
        "title": "Event with attachments",
        "description": "Event body",
        "event_date": "2026-06-01T10:00:00Z",
        "location": "Main Hall",
    }
    create_res = client.post("/api/admin/events", headers=admin_headers, json=payload)
    assert create_res.status_code == 200
    event = create_res.json()
    event_id = event["id"]

    attach_payload = {"file_url": "/api/public/uploads/images/test.png", "file_name": "test.png", "file_type": "image/png"}
    create_attach = client.post(f"/api/admin/events/{event_id}/attachments", headers=admin_headers, json=attach_payload)
    assert create_attach.status_code == 200
    created_attach = create_attach.json()
    assert created_attach["file_url"] == attach_payload["file_url"]

    list_res = client.get(f"/api/admin/events/{event_id}/attachments", headers=admin_headers)
    assert list_res.status_code == 200
    attachments = list_res.json()
    assert any(a["id"] == created_attach["id"] for a in attachments)

    delete_res = client.delete(f"/api/admin/events/attachments/{created_attach['id']}", headers=admin_headers)
    assert delete_res.status_code == 200

    list_after = client.get(f"/api/admin/events/{event_id}/attachments", headers=admin_headers)
    assert list_after.status_code == 200
    assert not any(a["id"] == created_attach["id"] for a in list_after.json())
