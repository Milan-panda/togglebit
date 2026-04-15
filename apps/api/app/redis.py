import redis.asyncio as aioredis

from app.config import settings

_redis: aioredis.Redis | None = None


async def create_redis() -> aioredis.Redis:
    global _redis
    _redis = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
    )
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.close()
        _redis = None


def get_redis() -> aioredis.Redis:
    if not _redis:
        raise RuntimeError("Redis client not initialized")
    return _redis
