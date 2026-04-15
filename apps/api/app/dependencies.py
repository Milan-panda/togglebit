from typing import Annotated

import asyncpg
import redis.asyncio as aioredis
from fastapi import Depends

from app.database import get_pool
from app.redis import get_redis


async def dep_db() -> asyncpg.Pool:
    return get_pool()


async def dep_redis() -> aioredis.Redis:
    return get_redis()


DB = Annotated[asyncpg.Pool, Depends(dep_db)]
Redis = Annotated[aioredis.Redis, Depends(dep_redis)]
