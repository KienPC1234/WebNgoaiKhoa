"""Qdrant-backed vector database service.

Drop-in replacement for the previous ChromaDB usage in the AI module.
Provides two named collections (knowledge + navigation) with automatic
text embedding via fastembed or Ollama.

Configuration (all via environment variables / .env):
    QDRANT_URL              – HTTP endpoint  (default http://localhost:6333)
    QDRANT_API_KEY          – optional API key
    QDRANT_COLLECTION_PREFIX – prefix for collection names (default "ws")
    QDRANT_PREFER_GRPC      – use gRPC transport if available (default false)
    QDRANT_GRPC_PORT        – gRPC port when prefer_grpc=true (default 6334)

    EMBEDDING_BACKEND       – "fastembed" (default) or "ollama"
    QDRANT_EMBEDDING_MODEL  – fastembed model name
                              (default "BAAI/bge-small-en-v1.5", 384-dim)
    OLLAMA_EMBEDDING_MODEL  – Ollama embedding model
                              (default "nomic-embed-text:latest", 768-dim)
    OLLAMA_EMBEDDING_URL    – Ollama HTTP endpoint for embeddings
                              (default http://localhost:11434)
    OLLAMA_EMBEDDING_DIM    – vector dimensionality for Ollama model
                              (default 768)
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional, Set

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY: Optional[str] = os.getenv("QDRANT_API_KEY") or None
QDRANT_COLLECTION_PREFIX: str = os.getenv("QDRANT_COLLECTION_PREFIX", "ws")
QDRANT_PREFER_GRPC: bool = os.getenv("QDRANT_PREFER_GRPC", "false").lower() in (
    "1",
    "true",
    "yes",
)
QDRANT_GRPC_PORT: int = int(os.getenv("QDRANT_GRPC_PORT", "6334"))

# Embedding backend: "fastembed" (local, default) or "ollama" (local Ollama server)
EMBEDDING_BACKEND: str = os.getenv("EMBEDDING_BACKEND", "fastembed").strip().lower()

# fastembed settings
QDRANT_EMBEDDING_MODEL: str = os.getenv(
    "QDRANT_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5"
)

# Ollama embedding settings
OLLAMA_EMBEDDING_MODEL: str = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text:latest")
OLLAMA_EMBEDDING_URL: str = os.getenv("OLLAMA_EMBEDDING_URL", "http://localhost:11434")
OLLAMA_EMBEDDING_DIM: int = int(os.getenv("OLLAMA_EMBEDDING_DIM", "768"))

# Collection name constants
KNOWLEDGE_COLLECTION: str = os.getenv(
    "QDRANT_KNOWLEDGE_COLLECTION",
    f"{QDRANT_COLLECTION_PREFIX}_knowledge",
)
NAVIGATION_COLLECTION: str = os.getenv(
    "QDRANT_NAVIGATION_COLLECTION",
    f"{QDRANT_COLLECTION_PREFIX}_navigation",
)

# ---------------------------------------------------------------------------
# Lazy singletons
# ---------------------------------------------------------------------------
_qdrant_client = None
_embedding_model = None
_vector_size: Optional[int] = None


def _get_embedding_model():
    """Return (and cache) the fastembed TextEmbedding instance."""
    global _embedding_model, _vector_size
    if _embedding_model is not None:
        return _embedding_model

    try:
        from fastembed import TextEmbedding
    except ImportError:
        raise RuntimeError(
            "fastembed is not installed. Install it with: pip install fastembed"
        )

    logger.info("Loading fastembed model: %s", QDRANT_EMBEDDING_MODEL)
    _embedding_model = TextEmbedding(model_name=QDRANT_EMBEDDING_MODEL)
    # Probe dimensionality
    _vector_size = len(list(_embedding_model.embed(["probe"]))[0])
    logger.info("fastembed model loaded – vector size %d", _vector_size)
    return _embedding_model


# Max characters per text sent to Ollama embed (prevents context overflow)
# Default is intentionally conservative because many embedding models expose
# smaller context windows than nominal max-token claims.
OLLAMA_EMBED_MAX_CHARS = int(os.getenv("OLLAMA_EMBED_MAX_CHARS", "3000"))
OLLAMA_EMBED_MIN_CHARS = int(os.getenv("OLLAMA_EMBED_MIN_CHARS", "256"))


def _is_context_length_error(exc: Exception) -> bool:
    try:
        import httpx

        if not isinstance(exc, httpx.HTTPStatusError):
            return False
        if exc.response.status_code != 400:
            return False
        return "input length exceeds the context length" in (exc.response.text or "").lower()
    except Exception:
        return False


def _extract_ollama_embeddings(payload: Dict[str, Any]) -> List[List[float]]:
    embeddings = payload.get("embeddings")
    if embeddings:
        return embeddings
    # Some Ollama-compatible providers use a singular key for single-item input.
    embedding = payload.get("embedding")
    if embedding:
        return [embedding]
    raise RuntimeError(f"Ollama returned no embeddings. Response: {payload}")


def _post_ollama_embed_batch(url: str, texts: List[str]) -> List[List[float]]:
    import httpx

    payload = {
        "model": OLLAMA_EMBEDDING_MODEL,
        "input": texts,
    }
    resp = httpx.post(url, json=payload, timeout=180.0)
    resp.raise_for_status()
    return _extract_ollama_embeddings(resp.json())


def _embed_single_text_with_adaptive_limit(url: str, text: str) -> List[float]:
    import httpx

    char_limit = min(len(text), OLLAMA_EMBED_MAX_CHARS)
    min_chars = max(1, OLLAMA_EMBED_MIN_CHARS)
    while True:
        candidate = text[:char_limit]
        try:
            return _post_ollama_embed_batch(url, [candidate])[0]
        except httpx.HTTPStatusError as exc:
            if _is_context_length_error(exc) and char_limit > min_chars:
                next_limit = max(min_chars, char_limit // 2)
                logger.warning(
                    "Ollama embed context overflow for single text (%d chars), retrying with %d chars",
                    char_limit,
                    next_limit,
                )
                if next_limit == char_limit:
                    raise
                char_limit = next_limit
                continue
            logger.error(
                "Ollama embed API error %s: %s",
                exc.response.status_code,
                exc.response.text[:500],
            )
            raise


def _embed_texts_ollama(texts: List[str]) -> List[List[float]]:
    """Embed texts using the local Ollama embedding endpoint.

    Sends texts in batches to avoid payload size limits.
    Truncates individual texts to prevent context window overflow.
    """
    import httpx

    url = f"{OLLAMA_EMBEDDING_URL.rstrip('/')}/api/embed"
    batch_size = 32  # Ollama handles batches well but very large payloads may fail
    all_embeddings: List[List[float]] = []

    # Truncate texts to prevent context overflow
    safe_texts = [t[:OLLAMA_EMBED_MAX_CHARS] if len(t) > OLLAMA_EMBED_MAX_CHARS else t for t in texts]

    for start in range(0, len(safe_texts), batch_size):
        batch = safe_texts[start : start + batch_size]
        try:
            embeddings = _post_ollama_embed_batch(url, batch)
        except httpx.HTTPStatusError as exc:
            if _is_context_length_error(exc):
                logger.warning(
                    "Ollama context overflow in embed batch (size=%d). Falling back to per-text adaptive retry.",
                    len(batch),
                )
                for text in batch:
                    all_embeddings.append(_embed_single_text_with_adaptive_limit(url, text))
                continue

            # Log non-context errors with response body for debugging
            logger.error(
                "Ollama embed API error %s: %s",
                exc.response.status_code,
                exc.response.text[:500],
            )
            raise

        all_embeddings.extend(embeddings)

    return all_embeddings


def get_vector_size() -> int:
    """Return the embedding dimensionality (triggers model load if needed)."""
    global _vector_size
    if _vector_size is not None:
        return _vector_size

    if EMBEDDING_BACKEND == "ollama":
        _vector_size = OLLAMA_EMBEDDING_DIM
        logger.info("Using Ollama embedding backend – vector size %d", _vector_size)
        return _vector_size

    # fastembed path: probe the model
    _get_embedding_model()
    return _vector_size  # type: ignore[return-value]


def _embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts and return list of float vectors.

    Uses the backend selected by EMBEDDING_BACKEND ("fastembed" or "ollama").
    """
    if EMBEDDING_BACKEND == "ollama":
        return _embed_texts_ollama(texts)

    model = _get_embedding_model()
    embeddings = list(model.embed(texts))
    return [vec.tolist() for vec in embeddings]


def _get_qdrant_client():
    """Return (and cache) the QdrantClient instance."""
    global _qdrant_client
    if _qdrant_client is not None:
        return _qdrant_client

    try:
        from qdrant_client import QdrantClient
    except ImportError:
        raise RuntimeError(
            "qdrant-client is not installed. Install it with: pip install qdrant-client"
        )

    kwargs: Dict[str, Any] = {"url": QDRANT_URL}
    if QDRANT_API_KEY:
        kwargs["api_key"] = QDRANT_API_KEY
    if QDRANT_PREFER_GRPC:
        kwargs["prefer_grpc"] = True
        kwargs["grpc_port"] = QDRANT_GRPC_PORT

    logger.info("Connecting to Qdrant at %s (grpc=%s)", QDRANT_URL, QDRANT_PREFER_GRPC)
    _qdrant_client = QdrantClient(**kwargs)
    return _qdrant_client


def _ensure_collection(collection_name: str):
    """Create the collection if it does not exist, or recreate if vector dimension mismatches."""
    client = _get_qdrant_client()
    from qdrant_client.models import Distance, VectorParams

    expected_dim = get_vector_size()
    existing_names = [c.name for c in client.get_collections().collections]

    if collection_name in existing_names:
        # Verify existing collection has the correct vector dimension
        try:
            info = client.get_collection(collection_name)
            current_dim = info.config.params.vectors.size
            if current_dim != expected_dim:
                logger.warning(
                    "Collection '%s' has dim=%d but expected dim=%d. Recreating...",
                    collection_name, current_dim, expected_dim,
                )
                client.delete_collection(collection_name=collection_name)
                client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=expected_dim, distance=Distance.COSINE),
                )
                logger.info("Recreated Qdrant collection '%s' (dim=%d)", collection_name, expected_dim)
        except Exception:
            logger.exception("Failed to verify collection '%s' dimensions; keeping existing", collection_name)
    else:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=expected_dim, distance=Distance.COSINE),
        )
        logger.info("Created Qdrant collection '%s' (dim=%d)", collection_name, expected_dim)


# ---------------------------------------------------------------------------
# Public API – mirrors the ChromaDB collection interface used in ai.py
# ---------------------------------------------------------------------------

class QdrantCollection:
    """Thin wrapper that exposes the subset of collection operations used by ai.py.

    Methods mirror the ChromaDB Collection API so that ai.py can call them
    without major refactoring.
    """

    def __init__(self, name: str):
        self.name = name
        _ensure_collection(name)

    # -- helpers ----------------------------------------------------------

    @property
    def _client(self):
        return _get_qdrant_client()

    # -- count ------------------------------------------------------------

    def count(self) -> int:
        """Return total number of points in the collection."""
        result = self._client.count(collection_name=self.name, exact=True)
        return result.count

    # -- upsert -----------------------------------------------------------

    def upsert(
        self,
        ids: List[str],
        documents: List[str],
        metadatas: Optional[List[dict]] = None,
    ):
        """Insert or update points. Embeds documents automatically."""
        from qdrant_client.models import PointStruct

        vectors = _embed_texts(documents)
        points: List[PointStruct] = []
        for idx, (pid, vec) in enumerate(zip(ids, vectors)):
            payload: Dict[str, Any] = {"document": documents[idx]}
            if metadatas and idx < len(metadatas):
                payload["metadata"] = metadatas[idx]
            points.append(
                PointStruct(
                    id=self._stable_id(pid),
                    vector=vec,
                    payload=payload,
                )
            )

        # Upsert in batches of 100
        batch_size = 100
        for start in range(0, len(points), batch_size):
            self._client.upsert(
                collection_name=self.name,
                points=points[start : start + batch_size],
            )

    # -- get --------------------------------------------------------------

    def get(
        self,
        ids: Optional[List[str]] = None,
        include: Optional[List[str]] = None,
    ) -> dict:
        """Retrieve points by IDs (or all if ids is None).

        Returns a dict with keys: ids, documents, metadatas
        (matching the ChromaDB .get() response shape).
        """
        include_documents = include and "documents" in include
        include_metadatas = include and "metadatas" in include

        if ids is not None:
            stable_ids = [self._stable_id(pid) for pid in ids]
            points = self._client.retrieve(
                collection_name=self.name,
                ids=stable_ids,
                with_payload=True,
                with_vectors=False,
            )
            # Build lookup by stable id
            id_map = {p.id: p for p in points}
            ordered = [id_map.get(sid) for sid in stable_ids]

            result_ids: List[str] = []
            result_docs: List[Optional[str]] = []
            result_metas: List[Optional[dict]] = []
            for orig_id, pt in zip(ids, ordered):
                result_ids.append(orig_id)
                if pt is None:
                    result_docs.append(None)
                    result_metas.append(None)
                else:
                    payload = pt.payload or {}
                    result_docs.append(payload.get("document") if include_documents else None)
                    result_metas.append(payload.get("metadata") if include_metadatas else None)

            return {"ids": result_ids, "documents": result_docs, "metadatas": result_metas}

        # No ids → return all
        all_ids: List[str] = []
        all_docs: List[Optional[str]] = []
        all_metas: List[Optional[dict]] = []
        offset = None
        while True:
            points, offset = self._client.scroll(
                collection_name=self.name,
                offset=offset,
                limit=500,
                with_payload=True,
                with_vectors=False,
            )
            for pt in points:
                payload = pt.payload or {}
                all_ids.append(str(pt.id))
                all_docs.append(payload.get("document") if include_documents else None)
                all_metas.append(payload.get("metadata") if include_metadatas else None)
            if offset is None:
                break

        return {"ids": all_ids, "documents": all_docs, "metadatas": all_metas}

    # -- delete -----------------------------------------------------------

    def delete(self, ids: List[str]):
        """Delete points by their string IDs."""
        from qdrant_client.models import PointIdsList

        stable_ids = [self._stable_id(pid) for pid in ids]
        self._client.delete(
            collection_name=self.name,
            points_selector=PointIdsList(points=stable_ids),
        )

    # -- query (semantic search) ------------------------------------------

    def query(
        self,
        query_texts: List[str],
        n_results: int = 4,
    ) -> dict:
        """Semantic search. Returns dict with keys: ids, documents, metadatas, distances."""
        query_vec = _embed_texts(query_texts)[0]

        results = self._client.query_points(
            collection_name=self.name,
            query=query_vec,
            limit=n_results,
            with_payload=True,
        )

        ids_list: List[List[str]] = [[]]
        docs_list: List[List[Optional[str]]] = [[]]
        metas_list: List[List[Optional[dict]]] = [[]]
        dists_list: List[List[Optional[float]]] = [[]]

        for hit in results.points:
            payload = hit.payload or {}
            ids_list[0].append(str(hit.id))
            docs_list[0].append(payload.get("document"))
            metas_list[0].append(payload.get("metadata"))
            dists_list[0].append(hit.score)  # Qdrant returns similarity score

        return {
            "ids": ids_list,
            "documents": docs_list,
            "metadatas": metas_list,
            "distances": dists_list,
        }

    # -- stable id mapping ------------------------------------------------

    @staticmethod
    def _stable_id(string_id: str) -> int:
        """Map a string ID to a stable unsigned 64-bit integer for Qdrant.

        Uses a deterministic hash so the same string always maps to the same int.
        """
        import hashlib

        h = hashlib.sha256(string_id.encode("utf-8")).hexdigest()
        return int(h[:16], 16)  # first 16 hex chars → 64-bit int


# ---------------------------------------------------------------------------
# Convenience getters (drop-in replacements for _get_chroma_collection etc.)
# ---------------------------------------------------------------------------

_knowledge_collection: Optional[QdrantCollection] = None
_navigation_collection: Optional[QdrantCollection] = None


def get_knowledge_collection() -> QdrantCollection:
    """Return the main knowledge collection (lazy singleton)."""
    global _knowledge_collection
    if _knowledge_collection is None:
        _knowledge_collection = QdrantCollection(KNOWLEDGE_COLLECTION)
    return _knowledge_collection


def get_navigation_collection() -> QdrantCollection:
    """Return the navigation elements collection (lazy singleton)."""
    global _navigation_collection
    if _navigation_collection is None:
        _navigation_collection = QdrantCollection(NAVIGATION_COLLECTION)
    return _navigation_collection
