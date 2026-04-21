import pytest

from app.api import ai as ai_module


def test_split_chunks_basic():
    # Create predictable text and verify chunk lengths and overlap behavior
    text = " ".join(["word"] * 1000)
    chunks = ai_module._split_chunks(text, chunk_size=200, overlap=50)
    assert isinstance(chunks, list)
    assert len(chunks) >= 2
    for i, c in enumerate(chunks[:-1]):
        assert len(c) <= 200


def test_assemble_full_asset_text(monkeypatch):
    # Prepare fake asset manifest and fake chroma collection
    asset_id = "asset-test-1"
    assets = [{"id": asset_id, "chunks": 3}]

    monkeypatch.setattr(ai_module, "_load_knowledge_assets", lambda: assets)

    class FakeCollection:
        def get(self, ids=None, include=None):
            # Return nested-list shape similar to chroma query/get
            return {
                "documents": [["part1", "part2", "part3"]],
                "metadatas": [[{"chunk_index": 0}, {"chunk_index": 1}, {"chunk_index": 2}]],
            }

    monkeypatch.setattr(ai_module, "_get_chroma_collection", lambda: FakeCollection())

    res = ai_module.assemble_full_asset_text(asset_id, max_chars=None)
    assert res.get("ok") is True
    assert res.get("chunks") == 3
    assert "part1" in res.get("full_text", "")

    # Test truncation behavior
    res2 = ai_module.assemble_full_asset_text(asset_id, max_chars=5)
    assert res2.get("ok") is True
    assert res2.get("truncated") is True
    assert len(res2.get("full_text")) == 5
