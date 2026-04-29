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
