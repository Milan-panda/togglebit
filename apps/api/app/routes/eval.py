import asyncio
import json
import time

from fastapi import APIRouter, Depends, Query

from app.dependencies import DB, Redis
from app.models.response import EvalResponse
from app.services.auth import ApiKeyAuth, require_api_key
from app.services.cache import get_cached_flag, set_cached_flag
from app.services.eval import evaluate
from app.services.usage import track_eval

router = APIRouter(tags=["eval"])


@router.get("/flags/{key}", response_model=EvalResponse)
async def evaluate_flag(
    key: str,
    userId: str = Query(...),
    context: str = Query("{}"),
    auth: ApiKeyAuth = Depends(require_api_key),
    db: DB = None,
    redis: Redis = None,
):
    start = time.monotonic()

    org_id = auth.org_id
    env = auth.environment

    config = await get_cached_flag(redis, org_id, env, key)

    if config is None:
        row = await db.fetchrow(
            """
            SELECT fe.enabled, fe.rollout_pct, fe.rules::text, f.type
            FROM flag_environments fe
            JOIN flags f ON f.id = fe.flag_id
            WHERE f.org_id = $1::uuid AND fe.environment = $2 AND f.key = $3
            """,
            org_id,
            env,
            key,
        )

        if not row:
            elapsed = round((time.monotonic() - start) * 1000)
            return EvalResponse(
                flag=key, enabled=False, reason="flag_not_found", latency_ms=elapsed
            )

        config = {
            "type": row["type"],
            "enabled": row["enabled"],
            "rollout_pct": row["rollout_pct"],
            "rules": json.loads(row["rules"]),
        }
        await set_cached_flag(redis, org_id, env, key, config)

    user_context = json.loads(context)
    enabled, reason = evaluate(config, key, userId, user_context)

    asyncio.create_task(track_eval(org_id))

    elapsed = round((time.monotonic() - start) * 1000)
    return EvalResponse(flag=key, enabled=enabled, reason=reason, latency_ms=elapsed)
