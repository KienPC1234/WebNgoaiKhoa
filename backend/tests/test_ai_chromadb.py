import app.api.ai as ai_module


class _FakeResponse:
    status_code = 200

    @staticmethod
    def json():
        return {"response": "Tra loi mau"}


class _FakeAsyncClient:
    def __init__(self, captured):
        self._captured = captured

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, json):
        self._captured["url"] = url
        self._captured["prompt"] = json.get("prompt", "")
        self._captured["model"] = json.get("model", "")
        return _FakeResponse()


def test_ai_chat_stream_uses_vector_db_context(client, monkeypatch):
    captured = {}

    async def fake_stream(prompt, model):
        captured["prompt"] = prompt
        captured["model"] = model
        yield "stream-ok"

    monkeypatch.setattr(ai_module, "ollama_stream", fake_stream)
    monkeypatch.setattr(ai_module, "_sync_knowledge_base", lambda db: None)
    monkeypatch.setattr(
        ai_module,
        "_retrieve_context",
        lambda query, n_results=4: "[1] (publication#1) Noi quy\nThong tin the le",
    )

    response = client.post(
        "/api/ai/chat",
        json={"message": "The le bai viet la gi?", "model": "test-model"},
    )

    assert response.status_code == 200
    assert "stream-ok" in response.text
    assert captured["model"] == "test-model"
    assert "NGỮ CẢNH TRI THỨC" in captured["prompt"]
    assert "Thong tin the le" in captured["prompt"]


def test_ai_chat_basic_uses_vector_db_context(client, monkeypatch):
    captured = {}

    monkeypatch.setattr(ai_module, "_sync_knowledge_base", lambda db: None)
    monkeypatch.setattr(
        ai_module,
        "_retrieve_context",
        lambda query, n_results=4: "[1] (submission#2) Bai mau\nNoi dung bai du thi",
    )
    monkeypatch.setattr(
        ai_module.httpx,
        "AsyncClient",
        lambda *args, **kwargs: _FakeAsyncClient(captured),
    )

    response = client.post(
        "/api/ai/chat/basic",
        json={"message": "Tom tat bai du thi", "model": "test-model"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["message"]["content"] == "Tra loi mau"
    assert captured["model"] == "test-model"
    assert "NGỮ CẢNH TRI THỨC" in captured["prompt"]
    assert "Noi dung bai du thi" in captured["prompt"]


def test_ai_health_reports_vector_db_state(client, monkeypatch):
    class FakeCollection:
        @staticmethod
        def count():
            return 5

    monkeypatch.setattr(ai_module, "_sync_knowledge_base", lambda db: None)
    monkeypatch.setattr(ai_module, "_get_chroma_collection", lambda: FakeCollection())

    response = client.get("/api/ai/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["chroma"]["available"] is True
    assert payload["chroma"]["documents"] == 5
