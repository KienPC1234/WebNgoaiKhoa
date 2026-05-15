import os
import time
from typing import Optional

from fastapi import HTTPException, status

try:
    import redis
except Exception:
    redis = None


class RateLimiter:
    """Simple per-key fixed-window rate limiter dependency.

    Usage: Depends(RateLimiter('pub_view', limit=60, window=60))
    It will look for REDIS_URL in env and use Redis if available, otherwise fallback to in-memory store (process-local).
    """

    _memory_store = {}

    def __init__(self, key_prefix: str, limit: int = 60, window: int = 60):
        self.key_prefix = key_prefix
        self.limit = limit
        self.window = window
        self.redis_url = os.getenv('REDIS_URL')
        self._redis = None
        if redis and self.redis_url:
            try:
                self._redis = redis.Redis.from_url(self.redis_url, decode_responses=True)
            except Exception:
                self._redis = None

    def _make_key(self, identifier: Optional[str]):
        return f"rl:{self.key_prefix}:{identifier or 'anon'}:{int(time.time() // self.window)}"

    def __call__(self, identifier: Optional[str] = None):
        # identifier can be user id, ip, session id, etc.
        key = self._make_key(identifier)
        now = int(time.time())
        if self._redis:
            try:
                current = self._redis.get(key)
                if current is None:
                    pipe = self._redis.pipeline()
                    pipe.set(key, 1, ex=self.window)
                    pipe.execute()
                    current = 1
                else:
                    current = int(self._redis.incr(key))
            except Exception:
                current = None

            if current is not None and current > self.limit:
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail='rate limit exceeded')
            return True

        # fallback memory limiter (works only in single-process)
        bucket = RateLimiter._memory_store.setdefault(key, {'count': 0, 'ts': now})
        if bucket['count'] >= self.limit:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail='rate limit exceeded')
        bucket['count'] += 1
        return True
import os
import time
import threading
from typing import Optional
from fastapi import Request, HTTPException
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

_mem_lock = threading.Lock()
_mem_buckets = {}

# Try to create a Redis client if URL provided
_redis_client = None
_redis_url = os.getenv('RATE_LIMIT_REDIS_URL') or os.getenv('REDIS_URL')
if _redis_url:
    try:
        import redis

        _redis_client = redis.from_url(_redis_url)
    except Exception:
        _redis_client = None


class RateLimiter:
    """Callable dependency for FastAPI to rate-limit by client IP.

    Uses Redis INCR+EXPIRE when available, otherwise falls back to an
    in-process memory bucket (suitable for single-process deployments).
    """

    def __init__(self, prefix: str, limit: int = 60, window: int = 60):
        self.prefix = prefix
        self.limit = int(os.getenv(f"RATE_LIMIT_{prefix.upper()}_LIMIT", str(limit)))
        self.window = int(os.getenv(f"RATE_LIMIT_{prefix.upper()}_WINDOW", str(window)))

    async def __call__(self, request: Request):
        # Determine client identifier (X-Forwarded-For preferred)
        forwarded = request.headers.get('x-forwarded-for')
        if forwarded:
            client_ip = forwarded.split(',')[0].strip()
        else:
            client_ip = request.client.host if request.client else 'unknown'

        key = f"rl:{self.prefix}:{client_ip}"

        # Redis-backed limiter
        if _redis_client is not None:
            try:
                count = _redis_client.incr(key)
                if count == 1:
                    _redis_client.expire(key, self.window)
                if count > self.limit:
                    raise HTTPException(status_code=HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests")
                return
            except HTTPException:
                raise
            except Exception:
                # Fall through to in-memory fallback
                pass

        # In-memory fallback (not distributed)
        now = int(time.time())
        with _mem_lock:
            bucket = _mem_buckets.get(key)
            if not bucket:
                bucket = []
            # keep only timestamps within window
            cutoff = now - self.window
            bucket = [t for t in bucket if t > cutoff]
            if len(bucket) >= self.limit:
                raise HTTPException(status_code=HTTP_429_TOO_MANY_REQUESTS, detail='Too many requests')
            bucket.append(now)
            _mem_buckets[key] = bucket

        return
