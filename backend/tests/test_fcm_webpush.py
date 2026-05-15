"""Tests for native Web Push and newsletter dispatch logic."""

import json
import app.services.newsletter as newsletter_service
from app.models.notification import PushSubscription


class _FakeWebPushException(Exception):
    def __init__(self, message, response=None):
        super().__init__(message)
        self.response = response


class _FakeResponse:
    def __init__(self, status_code=200):
        self.status_code = status_code


def _make_subscription(endpoint="https://fcm.googleapis.com/send/abc", p256dh="test-p256dh", auth="test-auth", user_id=None):
    sub = PushSubscription.__new__(PushSubscription)
    sub.endpoint = endpoint
    sub.p256dh = p256dh
    sub.auth = auth
    sub.user_id = user_id
    return sub


def test_is_webpush_channel_enabled(monkeypatch):
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_WEBPUSH_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "VAPID_PRIVATE_KEY", "test-key")

    assert newsletter_service.is_webpush_channel_enabled() is True


def test_is_webpush_channel_disabled_no_vapid(monkeypatch):
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_WEBPUSH_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "VAPID_PRIVATE_KEY", "")

    assert newsletter_service.is_webpush_channel_enabled() is False


def test_send_webpush_success(monkeypatch):
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_WEBPUSH_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "VAPID_PRIVATE_KEY", "test-private-key")
    monkeypatch.setattr(newsletter_service, "VAPID_CLAIM_EMAIL", "test@example.com")

    sent_data = []

    def fake_webpush(subscription_info, data, vapid_private_key, vapid_claims, timeout=15):
        sent_data.append({
            "subscription_info": subscription_info,
            "data": data,
        })

    monkeypatch.setattr(newsletter_service, "webpush", fake_webpush)

    sub = _make_subscription()
    result = newsletter_service.send_webpush(subscription=sub, title="Test Title", body="Test Body", url="/events")

    assert result is True
    assert len(sent_data) == 1
    assert sent_data[0]["subscription_info"]["endpoint"] == "https://fcm.googleapis.com/send/abc"
    payload = json.loads(sent_data[0]["data"])
    assert payload["title"] == "Test Title"
    assert payload["body"] == "Test Body"
    assert payload["url"] == "/events"


def test_send_webpush_uses_default_url(monkeypatch):
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_WEBPUSH_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "VAPID_PRIVATE_KEY", "test-key")
    monkeypatch.setattr(newsletter_service, "WEBPUSH_DEFAULT_URL", "https://example.com")

    sent_data = []

    def fake_webpush(subscription_info, data, vapid_private_key, vapid_claims, timeout=15):
        sent_data.append(json.loads(data))

    monkeypatch.setattr(newsletter_service, "webpush", fake_webpush)

    sub = _make_subscription()
    result = newsletter_service.send_webpush(subscription=sub, title="No URL", body="Body")

    assert result is True
    assert sent_data[0]["url"] == "https://example.com"


def test_send_webpush_returns_false_on_error(monkeypatch):
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_WEBPUSH_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "VAPID_PRIVATE_KEY", "test-key")

    def fake_webpush_error(**kwargs):
        raise Exception("Network error")

    monkeypatch.setattr(newsletter_service, "webpush", fake_webpush_error)

    sub = _make_subscription()
    result = newsletter_service.send_webpush(subscription=sub, title="Fail", body="Fail")

    assert result is False


def test_send_webpush_cleans_stale_subscription_on_410(monkeypatch):
    """When push service returns 410 Gone, the stale subscription should be removed."""
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_WEBPUSH_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "VAPID_PRIVATE_KEY", "test-key")

    removed_endpoints = []

    def fake_webpush_410(**kwargs):
        from pywebpush import WebPushException
        raise WebPushException("Gone", response=_FakeResponse(410))

    monkeypatch.setattr(newsletter_service, "webpush", fake_webpush_410)
    monkeypatch.setattr(newsletter_service, "_remove_stale_subscription", lambda sub: removed_endpoints.append(sub.endpoint))

    sub = _make_subscription(endpoint="https://fcm.googleapis.com/send/stale")
    result = newsletter_service.send_webpush(subscription=sub, title="Test", body="Test")

    assert result is False
    assert "https://fcm.googleapis.com/send/stale" in removed_endpoints


def test_dispatch_newsletter_bulk_disabled(monkeypatch):
    """When newsletter is disabled, no emails or pushes should be sent."""
    monkeypatch.setattr(newsletter_service, "is_newsletter_enabled", lambda: False)

    result = newsletter_service.dispatch_newsletter_bulk(
        recipients=[{"email": "a@b.com", "unsubscribe_token": "x"}],
        title="T",
        body="B",
    )

    assert result["email_sent"] == 0
    assert result["push_sent"] == 0
