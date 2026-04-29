def test_event_occurrences_endpoint(client, admin_headers):
    # create a recurring event (weekly on Monday)
    payload = {
        "title": "Weekly Standup",
        "description": "Team standup",
        "event_date": "2026-05-04T09:00:00Z",
        "rrule": "FREQ=WEEKLY;BYDAY=MO;COUNT=5",
        "timezone": "UTC",
        "location": "Online",
    }
    res = client.post("/api/admin/events", headers=admin_headers, json=payload)
    assert res.status_code == 200

    # query occurrences between May and June
    start = "2026-05-01T00:00:00Z"
    end = "2026-06-30T23:59:59Z"
    occ_res = client.get(f"/api/admin/events/occurrences?start={start}&end={end}", headers=admin_headers)
    assert occ_res.status_code == 200
    occs = occ_res.json()
    assert len(occs) >= 5
    # ensure at least one occurrence is on the expected Monday
    assert any(o.get("event_date", "").startswith("2026-05-04") or o.get("event_date", "").startswith("2026-05-05") for o in occs)


def test_import_and_export_csv(client, admin_headers):
    # import a simple CSV with one event
    csv_text = (
        "title,description,event_date,location,rrule,timezone,image_url,status,linked_post_id,is_active\n"
        "CSV Event,Description,2026-07-01T10:00:00Z,Main Hall,,UTC,,upcoming,,true\n"
    )

    files = {"file": ("events.csv", csv_text, "text/csv")}
    import_res = client.post("/api/admin/events/import/csv", headers=admin_headers, files=files)
    assert import_res.status_code == 200
    payload = import_res.json()
    assert payload.get("created", 0) >= 1

    # export occurrences for July-August
    start = "2026-07-01T00:00:00Z"
    end = "2026-08-31T23:59:59Z"
    export_res = client.get(f"/api/admin/events/export/csv?start={start}&end={end}", headers=admin_headers)
    assert export_res.status_code == 200
    # CSV should include header row
    assert b"event_id" in export_res.content or b"occurrence_id" in export_res.content
