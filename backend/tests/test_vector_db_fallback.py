import pytest
import time
import app.services.vector_db as vector_db
from qdrant_client import QdrantClient

def test_qdrant_client_fallback_on_dns_failure(monkeypatch):
    # Reset global singletons to force reconnection
    monkeypatch.setattr(vector_db, "_qdrant_client", None)
    monkeypatch.setattr(vector_db, "_is_fallback_client", False)
    monkeypatch.setattr(vector_db, "_last_remote_attempt", 0.0)
    monkeypatch.setattr(vector_db, "_embed_texts", lambda texts: [[0.1] * vector_db.get_vector_size() for _ in texts])
    
    # Point QDRANT_URL to a non-existent domain
    monkeypatch.setattr(vector_db, "QDRANT_URL", "http://non-existent-domain-12345.xyz")
    
    # Trigger client creation
    client = vector_db._get_qdrant_client()
    
    # Check that client was created and fallback client is active
    assert client is not None
    assert vector_db._is_fallback_client is True
    
    # Perform operations to verify in-memory db functionality
    collection = vector_db.QdrantCollection("test_fallback_col")
    assert collection.count() == 0
    
    collection.upsert(
        ids=["doc1"],
        documents=["This is a test document in fallback mode"],
        metadatas=[{"tag": "test"}]
    )
    assert collection.count() == 1
    
    results = collection.query(query_texts=["test document"])
    assert len(results["ids"][0]) == 1
    assert results["ids"][0][0] == str(collection._stable_id("doc1"))


def test_qdrant_client_fallback_cooldown(monkeypatch):
    monkeypatch.setattr(vector_db, "_qdrant_client", None)
    monkeypatch.setattr(vector_db, "_is_fallback_client", False)
    monkeypatch.setattr(vector_db, "_last_remote_attempt", 0.0)
    monkeypatch.setattr(vector_db, "QDRANT_URL", "http://non-existent-domain-12345.xyz")
    
    # Initial fallback connection
    client1 = vector_db._get_qdrant_client()
    assert vector_db._is_fallback_client is True
    first_attempt_time = vector_db._last_remote_attempt
    
    # Immediate subsequent call should return the same client without updating _last_remote_attempt
    client2 = vector_db._get_qdrant_client()
    assert client2 is client1
    assert vector_db._last_remote_attempt == first_attempt_time
    
    # Force expiration of cooldown by setting last attempt time in the past
    past_time = time.monotonic() - (vector_db.REMOTE_ATTEMPT_COOLDOWN + 10)
    monkeypatch.setattr(vector_db, "_last_remote_attempt", past_time)
    
    # Now get_client should try connecting again (and update _last_remote_attempt)
    client3 = vector_db._get_qdrant_client()
    assert vector_db._last_remote_attempt > past_time + vector_db.REMOTE_ATTEMPT_COOLDOWN


def test_qdrant_client_mid_operation_fallback(monkeypatch):
    monkeypatch.setattr(vector_db, "_qdrant_client", None)
    monkeypatch.setattr(vector_db, "_is_fallback_client", False)
    monkeypatch.setattr(vector_db, "_last_remote_attempt", 0.0)
    monkeypatch.setattr(vector_db, "_embed_texts", lambda texts: [[0.1] * vector_db.get_vector_size() for _ in texts])
    
    # Point QDRANT_URL to a non-existent domain to force fallback when reconnection is attempted
    monkeypatch.setattr(vector_db, "QDRANT_URL", "http://non-existent-domain-12345.xyz")
    
    # Create a mock remote client that fails on all initialization/query endpoints
    class MockFailingQdrantClient:
        def __init__(self):
            self._verified_collections = set()
            
        def get_collections(self):
            raise Exception("Temporary failure in name resolution")
            
        def scroll(self, *args, **kwargs):
            raise Exception("Temporary failure in name resolution")
            
        def count(self, *args, **kwargs):
            raise Exception("Temporary failure in name resolution")
            
    # Set remote client
    vector_db._qdrant_client = MockFailingQdrantClient()
    vector_db._is_fallback_client = False
    
    collection = vector_db.QdrantCollection("test_mid_fail_col")
    assert isinstance(collection._client, MockFailingQdrantClient)
    
    # Calling count() should raise exception in MockFailingQdrantClient,
    # which gets caught, invalidates the client, triggers fallback, and succeeds.
    assert collection.count() == 0
    assert isinstance(collection._client, QdrantClient)
    assert vector_db._is_fallback_client is True
