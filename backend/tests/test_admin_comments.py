from app.models.publication import Publication


def test_admin_list_comments(client, admin_headers, db_session):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    student_resp = client.post(
        "/api/auth/login",
        data={"username": "student@webngoaikhoa.edu.vn", "password": "student123"},
    )
    student_token = student_resp.json()["access_token"]
    student_headers_local = {"Authorization": f"Bearer {student_token}"}

    client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "Test comment for admin listing"},
        headers=student_headers_local,
    )

    # admin can list comments
    r = client.get("/api/admin/comments", headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    # check that comment fields are populated
    found = [c for c in data if c["content"] == "Test comment for admin listing"]
    assert len(found) == 1
    c = found[0]
    assert c["publication_id"] == pub_id
    assert c["is_visible"] is True
    assert c["author_name"] is not None


def test_admin_filter_comments_by_publication(client, admin_headers, db_session):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    r = client.get(f"/api/admin/comments?publication_id={pub_id}", headers=admin_headers)
    assert r.status_code == 200


def test_admin_toggle_comment_visibility(client, admin_headers, student_headers, db_session):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    # create comment
    resp = client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "Toggle visibility test"},
        headers=student_headers,
    )
    comment_id = resp.json()["id"]

    # toggle to hidden
    r1 = client.put(f"/api/admin/comments/{comment_id}/visibility", headers=admin_headers)
    assert r1.status_code == 200
    assert r1.json()["is_visible"] is False

    # toggle back to visible
    r2 = client.put(f"/api/admin/comments/{comment_id}/visibility", headers=admin_headers)
    assert r2.status_code == 200
    assert r2.json()["is_visible"] is True


def test_admin_delete_comment(client, admin_headers, student_headers, db_session):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    # create comment
    resp = client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "To be deleted by admin"},
        headers=student_headers,
    )
    comment_id = resp.json()["id"]

    # admin deletes
    r = client.delete(f"/api/admin/comments/{comment_id}", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["deleted"] is True

    # comment should no longer appear
    listing = client.get("/api/admin/comments", headers=admin_headers)
    ids = [c["id"] for c in listing.json()]
    assert comment_id not in ids


def test_user_delete_own_comment(client, student_headers, db_session):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    # create comment
    resp = client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "My own comment to delete"},
        headers=student_headers,
    )
    comment_id = resp.json()["id"]

    # user deletes own comment
    r = client.delete(f"/api/public/publications/{pub_id}/comments/{comment_id}", headers=student_headers)
    assert r.status_code == 200
    assert r.json()["deleted"] is True


def test_user_cannot_delete_others_comment(client, student_headers, admin_headers, db_session):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    # admin creates comment
    resp = client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "Admin's comment"},
        headers=admin_headers,
    )
    comment_id = resp.json()["id"]

    # student tries to delete admin's comment — should fail
    r = client.delete(f"/api/public/publications/{pub_id}/comments/{comment_id}", headers=student_headers)
    assert r.status_code == 403


def test_hidden_comment_not_shown_in_public_list(client, admin_headers, student_headers, db_session):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    # create comment
    resp = client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "Will be hidden"},
        headers=student_headers,
    )
    comment_id = resp.json()["id"]

    # admin hides it
    client.put(f"/api/admin/comments/{comment_id}/visibility", headers=admin_headers)

    # public listing should not show it
    r = client.get(f"/api/public/publications/{pub_id}/comments")
    assert r.status_code == 200
    ids = [c["id"] for c in r.json()]
    assert comment_id not in ids


def test_non_admin_forbidden_comment_management(client, student_headers):
    # student cannot access admin comment endpoints
    r1 = client.get("/api/admin/comments", headers=student_headers)
    assert r1.status_code == 403

    r2 = client.put("/api/admin/comments/1/visibility", headers=student_headers)
    assert r2.status_code == 403

    r3 = client.delete("/api/admin/comments/1", headers=student_headers)
    assert r3.status_code == 403


def test_admin_filter_comments_by_type(client, admin_headers, student_headers, db_session):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    # create a publication comment
    resp = client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "Publication type filter test"},
        headers=student_headers,
    )
    assert resp.status_code == 200

    # filter by publication type should include it
    r = client.get("/api/admin/comments?comment_type=publication", headers=admin_headers)
    assert r.status_code == 200
    ids = [c["id"] for c in r.json()]
    assert resp.json()["id"] in ids

    # filter by submission type should NOT include it
    r2 = client.get("/api/admin/comments?comment_type=submission", headers=admin_headers)
    assert r2.status_code == 200
    ids2 = [c["id"] for c in r2.json()]
    assert resp.json()["id"] not in ids2


def test_parent_comment_validation(client, student_headers, db_session):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    # create a root comment
    r1 = client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "Root comment"},
        headers=student_headers,
    )
    assert r1.status_code == 200
    root_id = r1.json()["id"]

    # reply to root should succeed
    r2 = client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "Reply to root", "parent_id": root_id},
        headers=student_headers,
    )
    assert r2.status_code == 200
    reply_id = r2.json()["id"]

    # reply to a reply should fail (max 1 level nesting)
    r3 = client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "Reply to reply", "parent_id": reply_id},
        headers=student_headers,
    )
    assert r3.status_code == 400

    # reply with non-existent parent should fail
    r4 = client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "Bad parent", "parent_id": 99999},
        headers=student_headers,
    )
    assert r4.status_code == 400


def test_delete_parent_also_deletes_children(client, admin_headers, student_headers, db_session):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    # create root + child
    r1 = client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "Parent to delete"},
        headers=student_headers,
    )
    parent_id = r1.json()["id"]

    r2 = client.post(
        f"/api/public/publications/{pub_id}/comments",
        json={"content": "Child reply", "parent_id": parent_id},
        headers=student_headers,
    )
    child_id = r2.json()["id"]

    # admin deletes parent
    r3 = client.delete(f"/api/admin/comments/{parent_id}", headers=admin_headers)
    assert r3.status_code == 200

    # child should also be gone
    listing = client.get("/api/admin/comments", headers=admin_headers)
    all_ids = [c["id"] for c in listing.json()]
    assert parent_id not in all_ids
    assert child_id not in all_ids
