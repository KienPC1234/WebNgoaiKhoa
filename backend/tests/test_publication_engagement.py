from app.models.publication import Publication


def test_publication_view_unique_sessions(client, db_session):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    # first view with session 's1' should count
    r1 = client.post(f"/api/public/publications/{pub_id}/view", params={"session": "s1"})
    assert r1.status_code == 200
    assert r1.json().get("viewed") is True
    assert r1.json().get("view_count") == 1

    # repeated view with same session should not increment
    r2 = client.post(f"/api/public/publications/{pub_id}/view", params={"session": "s1"})
    assert r2.status_code == 200
    assert r2.json().get("viewed") is False
    assert r2.json().get("view_count") == 1

    # new session should increment
    r3 = client.post(f"/api/public/publications/{pub_id}/view", params={"session": "s2"})
    assert r3.status_code == 200
    assert r3.json().get("viewed") is True
    assert r3.json().get("view_count") == 2


def test_publication_favorite_and_vote_flow_require_auth(client, db_session, student_headers):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    # favorite requires auth
    r = client.post(f"/api/public/publications/{pub_id}/favorite")
    assert r.status_code == 401

    # add favorite as student
    r2 = client.post(f"/api/public/publications/{pub_id}/favorite", headers=student_headers)
    assert r2.status_code == 200
    assert r2.json().get("favorited") is True
    assert r2.json().get("favorites_count") == 1

    # duplicate favorite is idempotent
    r3 = client.post(f"/api/public/publications/{pub_id}/favorite", headers=student_headers)
    assert r3.status_code == 200
    assert r3.json().get("favorites_count") == 1

    # remove favorite
    r4 = client.delete(f"/api/public/publications/{pub_id}/favorite", headers=student_headers)
    assert r4.status_code == 200
    assert r4.json().get("favorited") is False
    assert r4.json().get("favorites_count") == 0

    # vote requires auth
    rv = client.post(f"/api/public/publications/{pub_id}/vote")
    assert rv.status_code == 401

    # add vote
    rv2 = client.post(f"/api/public/publications/{pub_id}/vote", headers=student_headers)
    assert rv2.status_code == 200
    assert rv2.json().get("voted") is True
    assert rv2.json().get("votes_count") == 1

    # duplicate vote is idempotent
    rv3 = client.post(f"/api/public/publications/{pub_id}/vote", headers=student_headers)
    assert rv3.status_code == 200
    assert rv3.json().get("votes_count") == 1

    # remove vote
    rv4 = client.delete(f"/api/public/publications/{pub_id}/vote", headers=student_headers)
    assert rv4.status_code == 200
    assert rv4.json().get("voted") is False
    assert rv4.json().get("votes_count") == 0


def test_get_engagement_returns_counts_and_user_flags(client, db_session, student_headers):
    pub = db_session.query(Publication).first()
    pub_id = pub.id

    # ensure zeroed
    r0 = client.get(f"/api/public/publications/{pub_id}/engagement")
    assert r0.status_code == 200
    data0 = r0.json()
    assert data0.get("view_count") == 0
    assert data0.get("favorites_count") == 0
    assert data0.get("votes_count") == 0

    # student favorites and votes
    client.post(f"/api/public/publications/{pub_id}/favorite", headers=student_headers)
    client.post(f"/api/public/publications/{pub_id}/vote", headers=student_headers)

    r1 = client.get(f"/api/public/publications/{pub_id}/engagement", headers=student_headers)
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1.get("favorites_count") == 1
    assert d1.get("votes_count") == 1
    assert d1.get("favorited") is True
    assert d1.get("voted") is True
