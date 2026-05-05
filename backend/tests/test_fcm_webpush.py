"""Tests for FCM webpush and newsletter dispatch logic."""

import app.services.newsletter as newsletter_service


class _FakeMessaging:
    """Capture calls to firebase_admin.messaging."""

    last_message = None
    send_count = 0
    raise_on_send = None

    @classmethod
    def reset(cls):
        cls.last_message = None
        cls.send_count = 0
        cls.raise_on_send = None

    @classmethod
    def send(cls, message):
        cls.last_message = message
        cls.send_count += 1
        if cls.raise_on_send:
            raise cls.raise_on_send


class _FakeNotification:
    def __init__(self, title=None, body=None):
        self.title = title
        self.body = body


class _FakeWebpushFCMOptions:
    def __init__(self, link=None):
        self.link = link


class _FakeWebpushConfig:
    def __init__(self, fcm_options=None):
        self.fcm_options = fcm_options


class _FakeMessage:
    def __init__(self, token=None, notification=None, webpush=None):
        self.token = token
        self.notification = notification
        self.webpush = webpush


def _patch_messaging(monkeypatch):
    """Replace firebase_admin.messaging with fakes."""
    _FakeMessaging.reset()
    monkeypatch.setattr(newsletter_service, "messaging", type("M", (), {
        "Message": _FakeMessage,
        "Notification": _FakeNotification,
        "WebpushConfig": _FakeWebpushConfig,
        "WebpushFCMOptions": _FakeWebpushFCMOptions,
        "send": _FakeMessaging.send,
    }))
    # Ensure webpush channel is considered enabled
    monkeypatch.setattr(newsletter_service, "_firebase_initialized", True)
    monkeypatch.setattr(newsletter_service, "FCM_HTTP_V1_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_ENABLED", True)
    monkeypatch.setattr(newsletter_service, "NEWSLETTER_WEBPUSH_ENABLED", True)
    return _FakeMessaging


def test_send_webpush_success(monkeypatch):
    fake = _patch_messaging(monkeypatch)

    result = newsletter_service.send_webpush(
        token="fcm-token-abc",
        title="Test Title",
        body="Test Body",
        link="/events/upcoming",
    )

    assert result is True
    assert fake.send_count == 1
    assert fake.last_message.token == "fcm-token-abc"
    assert fake.last_message.notification.title == "Test Title"
    assert fake.last_message.notification.body == "Test Body"
    assert fake.last_message.webpush.fcm_options.link == "/events/upcoming"


def test_send_webpush_uses_default_link(monkeypatch):
    fake = _patch_messaging(monkeypatch)

    result = newsletter_service.send_webpush(
        token="fcm-token-xyz",
        title="No Link",
        body="Body",
    )

    assert result is True
    assert fake.last_message.webpush.fcm_options.link == newsletter_service.FCM_WEBPUSH_LINK


def test_send_webpush_returns_false_on_error(monkeypatch):
    fake = _patch_messaging(monkeypatch)
    fake.raise_on_send = Exception("FCM server error")

    result = newsletter_service.send_webpush(
        token="bad-token",
        title="Fail",
        body="Fail",
    )

    assert result is False
    assert fake.send_count == 1


def test_send_webpush_cleans_stale_token(monkeypatch, tmp_path):
    """When FCM returns a 'not-registered' error, the stale token should be removed."""
    fake = _patch_messaging(monkeypatch)
    fake.raise_on_send = Exception("Requested entity was not found. [registration-token-not-registered]")

    # Setup a registry file with the stale token
    registry_file = tmp_path / "push_registry.json"
    registry_file.write_text('{"user@example.com": ["stale-token-123", "good-token-456"]}')
    monkeypatch.setattr(newsletter_service, "PUSH_REGISTRY_FILE", registry_file)

    # Skip DB cleanup by making SessionLocal raise
    monkeypatch.setattr(newsletter_service, "SessionLocal", lambda: (_ for _ in ()).throw(RuntimeError("no db")))

    result = newsletter_service.send_webpush(
        token="stale-token-123",
        title="Test",
        body="Test",
    )

    assert result is False

    # Verify the stale token was removed from registry
    import json
    data = json.loads(registry_file.read_text())
    assert "stale-token-123" not in data.get("user@example.com", [])
    assert "good-token-456" in data.get("user@example.com", [])


def test_dispatch_newsletter_bulk_sends_webpush(monkeypatch):
    """dispatch_newsletter_bulk should call send_webpush for each recipient's tokens."""
    sent_tokens = []

    def fake_send_webpush(token, title, body, link=None):
        sent_tokens.append(token)
        return True

    monkeypatch.setattr(newsletter_service, "send_webpush", fake_send_webpush)
    monkeypatch.setattr(newsletter_service, "is_newsletter_enabled", lambda: True)
    monkeypatch.setattr(newsletter_service, "is_email_channel_enabled", lambda: False)

    # Mock registry with tokens
    monkeypatch.setattr(newsletter_service, "_load_registry", lambda: {
        "user1@example.com": ["token-a", "token-b"],
        "user2@example.com": ["token-c"],
    })

    # Skip DB notification persistence
    monkeypatch.setattr(newsletter_service, "SessionLocal", lambda: (_ for _ in ()).throw(RuntimeError("no db")))

    recipients = [
        {"email": "user1@example.com", "unsubscribe_token": "ut1"},
        {"email": "user2@example.com", "unsubscribe_token": "ut2"},
    ]

    result = newsletter_service.dispatch_newsletter_bulk(
        recipients=recipients,
        title="Newsletter",
        body="Content",
        send_email=False,
        send_webpush_enabled=True,
    )

    assert result["push_sent"] == 3  # token-a, token-b, token-c
    assert set(sent_tokens) == {"token-a", "token-b", "token-c"}


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
