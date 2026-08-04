"""
Simple cache for repeated generation requests (same topic/language/tone/
length hit the same cached result within the TTL window, saving a Groq
call). Uses Redis if REDIS_URL is set; otherwise falls back to an
in-memory dict with manual TTL expiry — works fine for a single-process
deployment, just doesn't share across multiple server instances.
"""
import hashlib
import json
import time
from typing import Optional

from app.config import get_settings

settings = get_settings()

_redis_client = None
_memory_cache: dict = {}  # key -> (value, expires_at)


def _get_redis():
    global _redis_client
    if not settings.redis_url:
        return None
    if _redis_client is None:
        import redis.asyncio as redis
        _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


def make_key(*parts: str) -> str:
    raw = "|".join(parts)
    return "cache:" + hashlib.sha256(raw.encode()).hexdigest()[:24]


async def get(key: str) -> Optional[str]:
    r = _get_redis()
    if r is not None:
        try:
            return await r.get(key)
        except Exception:
            return None
    entry = _memory_cache.get(key)
    if not entry:
        return None
    value, expires_at = entry
    if time.time() > expires_at:
        _memory_cache.pop(key, None)
        return None
    return value


async def set(key: str, value: str, ttl_seconds: Optional[int] = None) -> None:
    ttl = ttl_seconds or settings.cache_ttl_seconds
    r = _get_redis()
    if r is not None:
        try:
            await r.set(key, value, ex=ttl)
            return
        except Exception:
            pass
    _memory_cache[key] = (value, time.time() + ttl)


def backend_name() -> str:
    return "redis" if settings.redis_url else "in-memory"
