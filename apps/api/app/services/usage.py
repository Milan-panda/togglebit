import asyncio
from datetime import date

from app.database import get_pool
from app.redis import get_redis


async def track_eval(org_id: str) -> None:
    """Increment eval counter in Redis. Non-blocking, fire-and-forget."""
    r = get_redis()
    month = date.today().replace(day=1).isoformat()
    await r.incr(f"evals:{org_id}:{month}")


async def flush_eval_counts() -> None:
    """Flush accumulated eval counts from Redis to Postgres."""
    r = get_redis()
    db = get_pool()

    cursor = "0"
    while True:
        cursor, keys = await r.scan(cursor=cursor, match="evals:*", count=100)
        for key in keys:
            count = await r.getdel(key)
            if not count:
                continue
            parts = key.split(":")
            if len(parts) != 3:
                continue
            _, org_id, month = parts
            await db.execute(
                """
                INSERT INTO usage (org_id, month, eval_count)
                VALUES ($1, $2::date, $3)
                ON CONFLICT (org_id, month)
                DO UPDATE SET eval_count = usage.eval_count + EXCLUDED.eval_count
                """,
                org_id,
                month,
                int(count),
            )
        if cursor == "0":
            break


async def flush_eval_counts_loop() -> None:
    """Background task: flush every 60 seconds."""
    while True:
        await asyncio.sleep(60)
        try:
            await flush_eval_counts()
        except Exception:
            pass
