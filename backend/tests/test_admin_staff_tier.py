def test_update_staff_tier(client, admin_headers):
    # Create a staff profile without tier
    create_payload = {
        "full_name": "Tier Test",
        "title": "Tester",
        "bio": "Bio",
        "email": "tier@test.local",
        "image_url": None,
        "expertise": "Testing",
        "display_order": 1,
        "is_active": True,
    }

    create_res = client.post("/api/admin/staff", headers=admin_headers, json=create_payload)
    assert create_res.status_code == 200
    created = create_res.json()
    staff_id = created["id"]

    # Initially there should be no tier
    assert created.get("tier") in (None, "")

    # Update tier to 'senior'
    update_payload = {**created, "tier": "senior"}
    update_res = client.put(f"/api/admin/staff/{staff_id}", headers=admin_headers, json=update_payload)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated.get("tier") == "senior"

    # Fetch list and verify
    list_res = client.get("/api/admin/staff", headers=admin_headers)
    assert list_res.status_code == 200
    staff_list = list_res.json()
    found = next((s for s in staff_list if s["id"] == staff_id), None)
    assert found is not None
    assert found.get("tier") == "senior"


def test_admin_staff_reactions_summary_endpoint(client, admin_headers, student_headers):
    create_payload = {
        "full_name": "Reaction Staff",
        "title": "Teacher",
        "bio": "Bio",
        "email": "reaction@test.local",
        "image_url": None,
        "expertise": "Testing",
        "display_order": 1,
        "is_active": True,
    }

    create_res = client.post("/api/admin/staff", headers=admin_headers, json=create_payload)
    assert create_res.status_code == 200
    staff_id = create_res.json()["id"]

    react_res = client.post(
        f"/api/public/doingu/staff/{staff_id}/react",
        headers=student_headers,
        json={"reaction_type": "love"},
    )
    assert react_res.status_code == 200

    summary_res = client.get("/api/admin/staff/reactions/summary", headers=admin_headers)
    assert summary_res.status_code == 200

    data = summary_res.json()
    item = next((x for x in data if x.get("staff_id") == staff_id), None)
    assert item is not None
    assert item.get("counts", {}).get("love") == 1
