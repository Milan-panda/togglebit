import json

import redis.asyncio as aioredis

FLAG_TTL = 300  # 5 minutes


def flag_cache_key(org_id: str, env: str, key: str) -> str:
    return f"flag:{org_id}:{env}:{key}"


async def get_cached_flag(r: aioredis.Redis, org_id: str, env: str, key: str) -> dict | None:
    cache_key = flag_cache_key(org_id, env, key)
    cached = await r.get(cache_key)
    if cached:
        return json.loads(cached)
    return None


async def set_cached_flag(r: aioredis.Redis, org_id: str, env: str, key: str, data: dict) -> None:
    cache_key = flag_cache_key(org_id, env, key)
    await r.set(cache_key, json.dumps(data), ex=FLAG_TTL)


async def invalidate_flag(r: aioredis.Redis, org_id: str, env: str, key: str) -> None:
    cache_key = flag_cache_key(org_id, env, key)
    await r.delete(cache_key)
