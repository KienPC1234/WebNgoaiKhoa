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


