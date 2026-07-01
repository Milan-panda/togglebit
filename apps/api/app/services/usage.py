import asyncio
import json
from datetime import date

from app.database import get_pool
from app.redis import get_redis


async def track_eval(org_id: str) -> None:
    """Increment eval counter in Redis. Non-blocking, fire-and-forget."""
    r = get_redis()
    month = date.today().replace(day=1).isoformat()
    await r.incr(f"evals:{org_id}:{month}")


async def track_flag_eval(org_id: str, flag_id: str, env: str) -> None:
    """Increment per-flag daily eval counter in Redis."""
    r = get_redis()
    day = date.today().isoformat()
    await r.incr(f"fevals:{org_id}:{flag_id}:{env}:{day}")


async def log_flag_eval(
    org_id: str,
    flag_id: str,
    environment: str,
    user_id: str,
    context: dict,
    enabled: bool,
    reason: str,
    source: str = "api",
) -> None:
    """Append a per-flag eval log row. Non-blocking, errors are swallowed."""
    try:
        db = get_pool()
        await db.execute(
            """
            INSERT INTO flag_eval_logs
                (org_id, flag_id, environment, user_id, context, enabled, reason, source)
            VALUES ($1::uuid, $2::uuid, $3, $4, $5::jsonb, $6, $7, $8)
            """,
            org_id,
            flag_id,
            environment,
            user_id,
            json.dumps(context),
            enabled,
            reason,
            source,
        )
    except Exception:
        pass


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

    cursor = "0"
    while True:
        cursor, keys = await r.scan(cursor=cursor, match="fevals:*", count=200)
        for key in keys:
            count = await r.getdel(key)
            if not count:
                continue
            parts = key.split(":")
            if len(parts) != 5:
                continue
            _, org_id, flag_id, env, day = parts
            await db.execute(
                """
                INSERT INTO flag_usage_daily (org_id, flag_id, environment, day, eval_count, updated_at)
                VALUES ($1::uuid, $2::uuid, $3, $4::date, $5, now())
                ON CONFLICT (org_id, flag_id, environment, day)
                DO UPDATE SET
                    eval_count = flag_usage_daily.eval_count + EXCLUDED.eval_count,
                    updated_at = now()
                """,
                org_id,
                flag_id,
                env,
                day,
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
