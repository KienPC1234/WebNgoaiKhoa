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
