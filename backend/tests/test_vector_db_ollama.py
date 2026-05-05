import json

import httpx
import pytest

import app.services.vector_db as vector_db


def _response(status_code, payload=None, text=""):
    request = httpx.Request("POST", "http://localhost:11434/api/embed")
    if payload is not None:
        return httpx.Response(status_code, request=request, content=json.dumps(payload).encode("utf-8"))
    return httpx.Response(status_code, request=request, content=text.encode("utf-8"))


def test_embed_texts_ollama_falls_back_to_adaptive_single_retry(monkeypatch):
    monkeypatch.setattr(vector_db, "OLLAMA_EMBED_MAX_CHARS", 80)
    monkeypatch.setattr(vector_db, "OLLAMA_EMBED_MIN_CHARS", 16)

    call_sizes = []

    def fake_post(url, json, timeout):
        inputs = json["input"]
        call_sizes.append([len(item) for item in inputs])

        # Simulate batch rejection due to one oversized item.
        if len(inputs) > 1:
            return _response(400, text='{"error":"the input length exceeds the context length"}')

        # Single item still too large until it is shrunk to <= 40 chars.
        if len(inputs[0]) > 40:
            return _response(400, text='{"error":"the input length exceeds the context length"}')

        return _response(200, payload={"embeddings": [[float(len(inputs[0]))]]})

    monkeypatch.setattr(httpx, "post", fake_post)

    embeddings = vector_db._embed_texts_ollama(["short text", "x" * 120])

    assert len(embeddings) == 2
    assert embeddings[0] == [10.0]
    assert embeddings[1] == [40.0]
    assert call_sizes[0] == [10, 80]


def test_embed_texts_ollama_still_raises_non_context_errors(monkeypatch):
    def fake_post(url, json, timeout):
        return _response(500, text='{"error":"internal"}')

    monkeypatch.setattr(httpx, "post", fake_post)

    with pytest.raises(httpx.HTTPStatusError):
        vector_db._embed_texts_ollama(["abc"])
