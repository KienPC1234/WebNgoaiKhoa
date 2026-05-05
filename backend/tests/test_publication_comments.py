import json

from app.models.publication import Publication, Comment, CommentMention
from app.models.notification import Notification


def test_create_publication_comment_with_mention(client, db_session, student_headers):
    # Arrange: get existing publication and users from seeded fixture
    pub = db_session.query(Publication).first()
    assert pub is not None

    # Find an admin user to mention
    admin = db_session.query(Notification).filter().first()
    # The conftest creates admin user first; instead query users table directly
    from app.models.user import User
    admin_user = db_session.query(User).filter(User.role == 'admin').first()
    assert admin_user is not None

    # Build comment content with CKEditor mention markup
    mention_payload = json.dumps({"id": admin_user.id, "name": admin_user.full_name or admin_user.email})
    content = f"Hello <a class=\"mention\" data-mention='{mention_payload}'>@{admin_user.full_name or admin_user.email}</a> this is a test"

    # Act: post comment as student
    response = client.post(f"/api/public/publications/{pub.id}/comments", json={"content": content}, headers=student_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body.get("id")
    comment_id = body.get("id")

    # Assert: comment row exists
    c = db_session.query(Comment).filter(Comment.id == comment_id).first()
    assert c is not None
    assert c.publication_id == pub.id

    # Assert: mention row created
    mentions = db_session.query(CommentMention).filter(CommentMention.comment_id == comment_id).all()
    assert len(mentions) >= 1

    # Assert: a Notification record was created for the mentioned admin
    notifs = db_session.query(Notification).filter(Notification.user_id == admin_user.id).all()
    assert len(notifs) >= 1


def test_create_publication_comment_allows_non_contestant_user(client, db_session, admin_headers):
    pub = db_session.query(Publication).first()
    assert pub is not None

    response = client.post(
        f"/api/public/publications/{pub.id}/comments",
        json={"content": "Admin can now comment on publication"},
        headers=admin_headers,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body.get("id")
    assert body.get("publication_id") == pub.id


def test_publication_comment_reactions_like_dislike(client, db_session, student_headers, admin_headers):
    pub = db_session.query(Publication).first()
    assert pub is not None

    create = client.post(
        f"/api/public/publications/{pub.id}/comments",
        json={"content": "Reaction target comment"},
        headers=student_headers,
    )
    assert create.status_code == 200, create.text
    comment_id = create.json()["id"]

    react_like = client.post(
        f"/api/public/publications/{pub.id}/comments/{comment_id}/react",
        json={"reaction_type": "like"},
        headers=admin_headers,
    )
    assert react_like.status_code == 200, react_like.text
    assert react_like.json()["user_reaction"] == "like"
    assert react_like.json()["like_count"] == 1
    assert react_like.json()["dislike_count"] == 0

    react_dislike = client.post(
        f"/api/public/publications/{pub.id}/comments/{comment_id}/react",
        json={"reaction_type": "dislike"},
        headers=admin_headers,
    )
    assert react_dislike.status_code == 200, react_dislike.text
    assert react_dislike.json()["user_reaction"] == "dislike"
    assert react_dislike.json()["like_count"] == 0
    assert react_dislike.json()["dislike_count"] == 1

    listing = client.get(f"/api/public/publications/{pub.id}/comments", headers=admin_headers)
    assert listing.status_code == 200, listing.text
    target = [item for item in listing.json() if item["id"] == comment_id][0]
    assert target["user_reaction"] == "dislike"
    assert target["like_count"] == 0
    assert target["dislike_count"] == 1

    unreact = client.delete(
        f"/api/public/publications/{pub.id}/comments/{comment_id}/react",
        headers=admin_headers,
    )
    assert unreact.status_code == 200, unreact.text
    assert unreact.json()["user_reaction"] is None
    assert unreact.json()["like_count"] == 0
    assert unreact.json()["dislike_count"] == 0


def test_reply_comment_sends_notification_to_parent_owner(client, db_session, student_headers, admin_headers):
    pub = db_session.query(Publication).first()
    assert pub is not None

    root = client.post(
        f"/api/public/publications/{pub.id}/comments",
        json={"content": "Admin root comment"},
        headers=admin_headers,
    )
    assert root.status_code == 200, root.text
    root_id = root.json()["id"]

    reply = client.post(
        f"/api/public/publications/{pub.id}/comments",
        json={"content": "Student reply comment", "parent_id": root_id},
        headers=student_headers,
    )
    assert reply.status_code == 200, reply.text
    reply_body = reply.json()
    assert reply_body["parent_id"] == root_id

    # Admin should receive a notification about this reply.
    notifications = db_session.query(Notification).all()
    assert any("trả lời bình luận" in (n.title or "") for n in notifications)


def test_mentions_endpoint_returns_valid_user_payload(client, student_headers):
    response = client.get("/api/public/users/mentions?q=9", headers=student_headers)
    assert response.status_code == 200, response.text

    body = response.json()
    assert isinstance(body, list)
    if body:
        first = body[0]
        assert "user" in first
        assert "submissions" in first
        assert "is_active" in first["user"]


def test_mentions_endpoint_prioritizes_exact_user_id(client, db_session, student_headers):
    from app.models.user import User

    target = db_session.query(User).filter(User.role == 'admin').first()
    assert target is not None

    response = client.get(f"/api/public/users/mentions?q={target.id}", headers=student_headers)
    assert response.status_code == 200, response.text

    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 1
    assert body[0]["user"]["id"] == target.id


def test_create_publication_comment_with_tokenized_mention(client, db_session, student_headers):
    from app.models.user import User

    pub = db_session.query(Publication).first()
    assert pub is not None

    admin_user = db_session.query(User).filter(User.role == 'admin').first()
    assert admin_user is not None

    username = (admin_user.email or '').split('@')[0] if admin_user.email else f"user{admin_user.id}"
    content = f"Hello <span class=\"mention\" data-mention='@u:{admin_user.id}:{username}'>@{username}</span> token mention test"

    response = client.post(
        f"/api/public/publications/{pub.id}/comments",
        json={"content": content},
        headers=student_headers,
    )
    assert response.status_code == 200, response.text
    comment_id = response.json()["id"]

    mentions = db_session.query(CommentMention).filter(CommentMention.comment_id == comment_id).all()
    assert any(m.user_id == admin_user.id for m in mentions)
