import asyncio
import json
import time

from fastapi import APIRouter, Depends, Query

from app.dependencies import DB, Redis
from app.models.response import EvalResponse
from app.services.auth import ApiKeyAuth, require_api_key
from app.services.cache import get_cached_flag, set_cached_flag
from app.services.eval import evaluate, normalize_user_id
from app.services.usage import log_flag_eval, track_eval, track_flag_eval

router = APIRouter(tags=["eval"])


@router.get("/flags/{key}", response_model=EvalResponse)
async def evaluate_flag(
    key: str,
    userId: str | None = Query(None),
    context: str = Query("{}"),
    auth: ApiKeyAuth = Depends(require_api_key),
    db: DB = None,
    redis: Redis = None,
):
    start = time.monotonic()

    org_id = auth.org_id
    env = auth.environment

    config = await get_cached_flag(redis, org_id, env, key)
    flag_id = None

    if config is None:
        row = await db.fetchrow(
            """
            SELECT f.id::text AS flag_id, fe.enabled, fe.rollout_pct, fe.rules::text, f.type
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
            "flag_id": row["flag_id"],
            "type": row["type"],
            "enabled": row["enabled"],
            "rollout_pct": row["rollout_pct"],
            "rules": json.loads(row["rules"]),
        }
        await set_cached_flag(redis, org_id, env, key, config)
        flag_id = row["flag_id"]
    else:
        flag_id = config.get("flag_id")

    if flag_id is None:
        row = await db.fetchrow(
            "SELECT id::text FROM flags WHERE org_id = $1::uuid AND key = $2",
            org_id,
            key,
        )
        flag_id = row["id"] if row else None

    user_context = json.loads(context)
    resolved_user_id = normalize_user_id(userId)
    enabled, reason = evaluate(config, key, resolved_user_id, user_context)

    asyncio.create_task(track_eval(org_id))
    if flag_id:
        asyncio.create_task(track_flag_eval(org_id, flag_id, env))
        asyncio.create_task(
            log_flag_eval(
                org_id,
                flag_id,
                env,
                resolved_user_id or "",
                user_context,
                enabled,
                reason,
                source="api",
            )
        )

    elapsed = round((time.monotonic() - start) * 1000)
    return EvalResponse(flag=key, enabled=enabled, reason=reason, latency_ms=elapsed)
