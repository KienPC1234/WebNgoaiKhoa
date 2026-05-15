"""
End-to-end integration tests simulating real user journeys:
  1. Auth flows (login / profile / password-change)
  2. Browse publications and post comments (requires auth)
  3. Admin comment moderation (list / toggle / delete)
  4. Submission lifecycle (post / admin approve/reject)
  5. Event CRUD
  6. Story CRUD
  7. Admin publication CRUD
  8. Staff / social-scale public listing
"""

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Flow 1 – Login → View profile / password change
# (Registration requires email-OTP verification, so we use pre-seeded users)
# ---------------------------------------------------------------------------

class TestAuthFlow:
    def test_register_returns_user(self, client):
        r = client.post("/api/auth/register", json={
            "email": "newreg_e2e@test.com",
            "password": "Pass1234!",
            "full_name": "E2E Register",
        })
        assert r.status_code in (200, 201), r.text
        body = r.json()
        # Returns some form of user object or token
        assert "id" in body or "email" in body or "message" in body

    def test_duplicate_register_rejected(self, client):
        client.post("/api/auth/register", json={
            "email": "dup2_e2e@test.com", "password": "Pass1234!", "full_name": "Dup",
        })
        r = client.post("/api/auth/register", json={
            "email": "dup2_e2e@test.com", "password": "Pass1234!", "full_name": "Dup",
        })
        assert r.status_code in (400, 409, 422), f"Expected error, got {r.status_code}"

    def test_wrong_password_rejected(self, client):
        r = client.post("/api/auth/login", data={"username": "admin@webngoaikhoa.edu.vn", "password": "wrongpw"})
        assert r.status_code in (400, 401, 403)

    def test_admin_login_returns_token(self, client):
        r = client.post("/api/auth/login", data={"username": "admin@webngoaikhoa.edu.vn", "password": "admin123"})
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_student_login_returns_token(self, client):
        r = client.post("/api/auth/login", data={"username": "student@webngoaikhoa.edu.vn", "password": "student123"})
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_view_own_profile_admin(self, client, admin_headers):
        r = client.get("/api/auth/me", headers=admin_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == "admin@webngoaikhoa.edu.vn"
        assert body["role"] in ("admin", "ADMIN")

    def test_view_own_profile_student(self, client, student_headers):
        r = client.get("/api/auth/me", headers=student_headers)
        assert r.status_code == 200
        assert r.json()["email"] == "student@webngoaikhoa.edu.vn"

    def test_profile_requires_auth(self, client):
        r = client.get("/api/auth/me")
        assert r.status_code in (401, 403)

    def test_password_change_admin(self, client, admin_headers):
        # Change to a new password then change back
        r = client.post("/api/auth/password/change", json={
            "current_password": "admin123",
            "new_password": "admin456!",
        }, headers=admin_headers)
        assert r.status_code in (200, 204), r.text
        # Change back
        r2 = client.post("/api/auth/login", data={"username": "admin@webngoaikhoa.edu.vn", "password": "admin456!"})
        assert r2.status_code == 200
        new_h = {"Authorization": f"Bearer {r2.json()['access_token']}"}
        client.post("/api/auth/password/change", json={
            "current_password": "admin456!",
            "new_password": "admin123",
        }, headers=new_h)


# ---------------------------------------------------------------------------
# Flow 2 – Browse publications + post comment (auth required)
# ---------------------------------------------------------------------------

class TestPublicationCommentFlow:
    def _create_pub(self, client, admin_headers, title="E2E Pub"):
        r = client.post("/api/admin/publications", json={
            "title": title,
            "content": "Some content for testing.",
            "category": "van",
        }, headers=admin_headers)
        assert r.status_code in (200, 201), r.text
        return r.json()["id"]

    def test_list_publications(self, client):
        r = client.get("/api/public/publications")
        assert r.status_code == 200
        assert isinstance(r.json(), (list, dict))

    def test_get_publication_detail(self, client, admin_headers):
        pub_id = self._create_pub(client, admin_headers, "Detail Pub E2E")
        r = client.get(f"/api/public/publications/{pub_id}")
        assert r.status_code == 200
        assert r.json()["id"] == pub_id

    def test_post_comment_requires_auth(self, client, admin_headers):
        pub_id = self._create_pub(client, admin_headers, "Auth-Required Pub E2E")
        r = client.post(f"/api/public/publications/{pub_id}/comments", json={
            "content": "Unauthenticated comment attempt",
        })
        assert r.status_code in (401, 403)

    def test_post_comment_authenticated(self, client, admin_headers):
        pub_id = self._create_pub(client, admin_headers, "Auth Comment Pub E2E")
        r = client.post(f"/api/public/publications/{pub_id}/comments", json={
            "content": "Authenticated comment here.",
        }, headers=admin_headers)
        assert r.status_code in (200, 201), r.text
        assert "id" in r.json()

    def test_list_comments_for_publication(self, client, admin_headers):
        pub_id = self._create_pub(client, admin_headers, "List Comment Pub E2E")
        client.post(f"/api/public/publications/{pub_id}/comments", json={
            "content": "Comment for listing.",
        }, headers=admin_headers)
        r = client.get(f"/api/public/publications/{pub_id}/comments")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_reply_to_comment(self, client, admin_headers):
        pub_id = self._create_pub(client, admin_headers, "Reply Pub E2E")
        r1 = client.post(f"/api/public/publications/{pub_id}/comments", json={
            "content": "Parent comment.",
        }, headers=admin_headers)
        assert r1.status_code in (200, 201), r1.text
        parent_id = r1.json()["id"]
        r2 = client.post(f"/api/public/publications/{pub_id}/comments", json={
            "content": "Reply to parent.",
            "parent_id": parent_id,
        }, headers=admin_headers)
        assert r2.status_code in (200, 201), r2.text
        assert r2.json().get("parent_id") == parent_id


# ---------------------------------------------------------------------------
# Flow 3 – Admin comment moderation
# ---------------------------------------------------------------------------

class TestAdminCommentModerationFlow:
    def _setup_comment(self, client, admin_headers):
        r_pub = client.post("/api/admin/publications", json={
            "title": "Mod Pub E2E",
            "content": "moderation content",
            "category": "van",
        }, headers=admin_headers)
        pub_id = r_pub.json()["id"]
        r_c = client.post(f"/api/public/publications/{pub_id}/comments", json={
            "content": "Needs moderation.",
        }, headers=admin_headers)
        assert r_c.status_code in (200, 201), r_c.text
        return pub_id, r_c.json()["id"]

    def test_admin_list_comments(self, client, admin_headers):
        r = client.get("/api/admin/comments", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_filter_by_publication(self, client, admin_headers):
        pub_id, _ = self._setup_comment(client, admin_headers)
        r = client.get(f"/api/admin/comments?publication_id={pub_id}", headers=admin_headers)
        assert r.status_code == 200
        items = r.json()
        assert all(c.get("publication_id") == pub_id for c in items)

    def test_admin_toggle_visibility(self, client, admin_headers):
        _, comment_id = self._setup_comment(client, admin_headers)
        r = client.put(f"/api/admin/comments/{comment_id}/visibility",
                       json={"is_visible": False}, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["is_visible"] is False
        # Re-enable
        r2 = client.put(f"/api/admin/comments/{comment_id}/visibility",
                        json={"is_visible": True}, headers=admin_headers)
        assert r2.json()["is_visible"] is True

    def test_admin_delete_comment(self, client, admin_headers):
        _, comment_id = self._setup_comment(client, admin_headers)
        r = client.delete(f"/api/admin/comments/{comment_id}", headers=admin_headers)
        assert r.status_code in (200, 204), r.text

    def test_student_cannot_moderate(self, client, student_headers):
        r = client.get("/api/admin/comments", headers=student_headers)
        assert r.status_code in (401, 403)

    def test_hidden_comment_not_public(self, client, admin_headers):
        pub_id, comment_id = self._setup_comment(client, admin_headers)
        client.put(f"/api/admin/comments/{comment_id}/visibility",
                   json={"is_visible": False}, headers=admin_headers)
        r = client.get(f"/api/public/publications/{pub_id}/comments")
        visible_ids = [c["id"] for c in r.json()]
        assert comment_id not in visible_ids


# ---------------------------------------------------------------------------
# Flow 4 – Submission lifecycle (requires auth)
# ---------------------------------------------------------------------------

class TestSubmissionFlow:
    def test_submit_work_authenticated(self, client, student_headers):
        r = client.post("/api/public/submissions", json={
            "title": "My E2E Poem",
            "content": "Roses are red, tests are green.",
            "subject": "van",
        }, headers=student_headers)
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert "id" in body
        assert body["status"] in ("pending", "submitted")

    def test_submit_work_requires_auth(self, client):
        r = client.post("/api/public/submissions", json={
            "title": "Unauth Poem",
            "content": "Should fail.",
        })
        assert r.status_code in (401, 403)

    def test_list_submissions_public(self, client):
        r = client.get("/api/public/submissions")
        assert r.status_code == 200

    def test_admin_list_submissions(self, client, admin_headers):
        r = client.get("/api/admin/submissions", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), (list, dict))

    def test_admin_approve_submission(self, client, admin_headers, student_headers):
        r_sub = client.post("/api/public/submissions", json={
            "title": "Approve Me E2E",
            "content": "Please approve this submission — it is good quality work.",
        }, headers=student_headers)
        assert r_sub.status_code in (200, 201), r_sub.text
        sub_id = r_sub.json()["id"]
        r = client.put(f"/api/admin/submissions/{sub_id}/status", json={"status": "approved"},
                       headers=admin_headers)
        assert r.status_code in (200, 201), r.text
        assert r.json().get("status") == "approved"

    def test_admin_reject_submission(self, client, admin_headers, student_headers):
        r_sub = client.post("/api/public/submissions", json={
            "title": "Reject Me E2E",
            "content": "This submission does not meet the required quality standards for publication.",
        }, headers=student_headers)
        assert r_sub.status_code in (200, 201), r_sub.text
        sub_id = r_sub.json()["id"]
        r = client.put(f"/api/admin/submissions/{sub_id}/status", json={"status": "rejected"},
                       headers=admin_headers)
        assert r.status_code in (200, 201), r.text
        assert r.json().get("status") == "rejected"


# ---------------------------------------------------------------------------
# Flow 5 – Events
# ---------------------------------------------------------------------------

class TestEventFlow:
    def _create_event(self, client, admin_headers, title="E2E Event"):
        r = client.post("/api/admin/events", json={
            "title": title,
            "description": "Test event description",
            "event_date": "2026-06-01T09:00:00",
            "location": "Online",
        }, headers=admin_headers)
        assert r.status_code in (200, 201), r.text
        return r.json()["id"]

    def test_create_event(self, client, admin_headers):
        event_id = self._create_event(client, admin_headers, "Created E2E Event")
        assert isinstance(event_id, int)

    def test_list_events_public(self, client, admin_headers):
        self._create_event(client, admin_headers, "List Test Event")
        r = client.get("/api/public/events/upcoming")
        assert r.status_code == 200

    def test_admin_list_events(self, client, admin_headers):
        self._create_event(client, admin_headers, "Admin List Event")
        r = client.get("/api/admin/events", headers=admin_headers)
        assert r.status_code == 200

    def test_get_event_detail_admin(self, client, admin_headers):
        event_id = self._create_event(client, admin_headers, "Detail Event E2E")
        r = client.get(f"/api/admin/events/{event_id}", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["id"] == event_id

    def test_update_event(self, client, admin_headers):
        event_id = self._create_event(client, admin_headers, "Update Me")
        r = client.put(f"/api/admin/events/{event_id}", json={
            "title": "Updated E2E Event",
            "event_date": "2026-06-01T09:00:00",
            "description": "Updated description",
            "location": "Online",
        }, headers=admin_headers)
        assert r.status_code in (200, 201), r.text
        assert r.json()["title"] == "Updated E2E Event"

    def test_delete_event(self, client, admin_headers):
        event_id = self._create_event(client, admin_headers, "Delete Me")
        r = client.delete(f"/api/admin/events/{event_id}", headers=admin_headers)
        assert r.status_code in (200, 204), r.text


# ---------------------------------------------------------------------------
# Flow 6 – Stories
# ---------------------------------------------------------------------------

class TestStoryFlow:
    def _create_story(self, client, admin_headers, title="E2E Story"):
        r = client.post("/api/admin/stories", json={
            "title": title,
            "content": "Story content for E2E testing.",
            "author": "E2E Author",
            "category": "inspiring",
        }, headers=admin_headers)
        assert r.status_code in (200, 201), r.text
        return r.json()["id"]

    def test_create_story(self, client, admin_headers):
        story_id = self._create_story(client, admin_headers, "Created E2E Story")
        assert isinstance(story_id, int)

    def test_list_stories_public(self, client, admin_headers):
        self._create_story(client, admin_headers, "List Story E2E")
        r = client.get("/api/public/stories/inspiring")
        assert r.status_code == 200

    def test_admin_list_stories(self, client, admin_headers):
        r = client.get("/api/admin/stories", headers=admin_headers)
        assert r.status_code == 200

    def test_get_story_detail_admin(self, client, admin_headers):
        story_id = self._create_story(client, admin_headers, "Detail Story E2E")
        r = client.get(f"/api/admin/stories/{story_id}", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["id"] == story_id

    def test_get_story_detail_public(self, client, admin_headers):
        story_id = self._create_story(client, admin_headers, "Public Detail Story E2E")
        r = client.get(f"/api/public/stories/inspiring/{story_id}")
        assert r.status_code == 200
        assert r.json()["id"] == story_id

    def test_update_story(self, client, admin_headers):
        story_id = self._create_story(client, admin_headers, "Story to Update")
        r = client.put(f"/api/admin/stories/{story_id}", json={
            "title": "Updated E2E Story",
            "author": "E2E Author",
            "content": "Updated content.",
        }, headers=admin_headers)
        assert r.status_code in (200, 201), r.text
        assert r.json()["title"] == "Updated E2E Story"

    def test_delete_story(self, client, admin_headers):
        story_id = self._create_story(client, admin_headers, "Story to Delete")
        r = client.delete(f"/api/admin/stories/{story_id}", headers=admin_headers)
        assert r.status_code in (200, 204), r.text


# ---------------------------------------------------------------------------
# Flow 7 – Admin publication CRUD
# ---------------------------------------------------------------------------

class TestAdminPublicationCRUD:
    def test_create_publication(self, client, admin_headers):
        r = client.post("/api/admin/publications", json={
            "title": "CRUD Pub E2E",
            "content": "Full CRUD test content.",
            "category": "van",
        }, headers=admin_headers)
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert body["title"] == "CRUD Pub E2E"

    def test_read_publication(self, client, admin_headers):
        r = client.post("/api/admin/publications", json={
            "title": "Read Pub E2E",
            "content": "Read test",
            "category": "van",
        }, headers=admin_headers)
        pub_id = r.json()["id"]
        r2 = client.get(f"/api/admin/publications/{pub_id}", headers=admin_headers)
        assert r2.status_code == 200
        assert r2.json()["id"] == pub_id

    def test_update_publication(self, client, admin_headers):
        r = client.post("/api/admin/publications", json={
            "title": "Update Pub E2E",
            "content": "Before update",
            "category": "van",
        }, headers=admin_headers)
        pub_id = r.json()["id"]
        r2 = client.put(f"/api/admin/publications/{pub_id}", json={
            "title": "Updated Pub E2E",
            "content": "After update",
        }, headers=admin_headers)
        assert r2.status_code in (200, 201), r2.text
        assert r2.json()["title"] == "Updated Pub E2E"

    def test_delete_publication(self, client, admin_headers):
        r = client.post("/api/admin/publications", json={
            "title": "Delete Pub E2E",
            "content": "To be deleted",
            "category": "van",
        }, headers=admin_headers)
        pub_id = r.json()["id"]
        r2 = client.delete(f"/api/admin/publications/{pub_id}", headers=admin_headers)
        assert r2.status_code in (200, 204), r2.text

    def test_student_cannot_create_publication(self, client, student_headers):
        r = client.post("/api/admin/publications", json={
            "title": "Unauthorized Pub",
            "content": "Should fail",
            "category": "van",
        }, headers=student_headers)
        assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Flow 8 – Staff / Social scale public listing
# ---------------------------------------------------------------------------

class TestStaffAndSocialFlow:
    def test_list_staff_public(self, client):
        r = client.get("/api/public/doingu/staff")
        assert r.status_code == 200

    def test_social_scale_public(self, client):
        r = client.get("/api/public/doingu/scale")
        # 200 when data exists; 404 when no SocialScale row in test DB — both are valid
        assert r.status_code in (200, 404)

    def test_admin_list_staff(self, client, admin_headers):
        r = client.get("/api/admin/staff", headers=admin_headers)
        assert r.status_code == 200
