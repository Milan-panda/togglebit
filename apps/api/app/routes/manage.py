import asyncio
import json

from datetime import date
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import DB, Redis
from app.models.flag import (
    CreateFlagRequest,
    EnvConfig,
    FlagListResponse,
    FlagResponse,
    TestFlagRequest,
    UpdateEnvRequest,
)
from app.models.response import (
    FlagEvalLogListResponse,
    FlagEvalLogResponse,
    FlagEventListResponse,
    FlagEventResponse,
    FlagTestResponse,
    FlagUsageSeriesResponse,
    UsageMonthlyPoint,
    UsageMonthlyResponse,
)
from app.services.authorization import OrgMembership, require_org_membership, require_org_roles
from app.services.cache import invalidate_flag
from app.services.eval import evaluate, evaluate_debug, normalize_user_id
from app.services.usage import log_flag_eval

router = APIRouter(tags=["manage"])

DEFAULT_ENVS = ["dev", "staging", "prod"]


def _parse_iso_ts(value: str) -> datetime:
    """Parse ISO 8601 timestamps from the dashboard into a datetime."""
    try:
        raw = value.strip()
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        dt = datetime.fromisoformat(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid timestamp format")


def _parse_json_dict(value) -> dict | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    return json.loads(value)


@router.get("/flags", response_model=FlagListResponse)
async def list_flags(
    env: str = Query("dev"),
    q: str | None = Query(default=None),
    type_: str | None = Query(default=None, alias="type"),
    enabled: bool | None = Query(default=None),
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    where = ["f.org_id = $1::uuid"]
    args: list[object] = [membership.org_id, env]

    if q:
        args.append(f"%{q}%")
        where.append(f"(f.key ILIKE ${len(args)} OR f.name ILIKE ${len(args)})")

    if type_:
        args.append(type_)
        where.append(f"f.type = ${len(args)}")

    if enabled is not None:
        args.append(enabled)
        where.append(f"fe.enabled = ${len(args)}")

    rows = await db.fetch(
        f"""
        SELECT f.id::text, f.key, f.name, f.description, f.type,
               f.created_at::text,
               fe.enabled, fe.rollout_pct, fe.rules::text
        FROM flags f
        LEFT JOIN flag_environments fe
            ON fe.flag_id = f.id AND fe.environment = $2
        WHERE {" AND ".join(where)}
        ORDER BY f.created_at DESC
        """,
        *args,
    )

    flags = []
    for r in rows:
        env_config = None
        if r["enabled"] is not None:
            env_config = {
                env: EnvConfig(
                    enabled=r["enabled"],
                    rollout_pct=r["rollout_pct"],
                    rules=json.loads(r["rules"]) if r["rules"] else [],
                )
            }
        flags.append(
            FlagResponse(
                id=r["id"],
                key=r["key"],
                name=r["name"],
                description=r["description"],
                type=r["type"],
                created_at=r["created_at"],
                environments=env_config,
            )
        )

    return FlagListResponse(flags=flags, total=len(flags))


@router.post("/flags", response_model=FlagResponse, status_code=201)
async def create_flag(
    body: CreateFlagRequest,
    membership: OrgMembership = Depends(require_org_roles("owner", "admin", "developer")),
    db: DB = None,
):
    existing = await db.fetchrow(
        "SELECT id FROM flags WHERE org_id = $1::uuid AND key = $2",
        membership.org_id,
        body.key,
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Flag '{body.key}' already exists")

    row = await db.fetchrow(
        """
        INSERT INTO flags (org_id, key, name, description, type, created_by)
        VALUES ($1::uuid, $2, $3, $4, $5, $6)
        RETURNING id::text, key, name, description, type, created_at::text
        """,
        membership.org_id,
        body.key,
        body.name,
        body.description,
        body.type,
        membership.user_id,
    )

    envs = body.environments or {e: EnvConfig() for e in DEFAULT_ENVS}
    env_result = {}
    for env_name, env_config in envs.items():
        await db.execute(
            """
            INSERT INTO flag_environments
                (flag_id, org_id, environment, enabled, rollout_pct, rules, updated_by)
            VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, $7)
            """,
            row["id"],
            membership.org_id,
            env_name,
            env_config.enabled,
            env_config.rollout_pct,
            json.dumps(env_config.rules),
            membership.user_id,
        )
        env_result[env_name] = env_config

    await db.execute(
        """
        INSERT INTO flag_events (org_id, flag_id, environment, user_id, action, new_value)
        VALUES ($1::uuid, $2::uuid, 'all', $3, 'created', $4::jsonb)
        """,
        membership.org_id,
        row["id"],
        membership.user_id,
        json.dumps({"key": body.key, "type": body.type}),
    )

    return FlagResponse(
        id=row["id"],
        key=row["key"],
        name=row["name"],
        description=row["description"],
        type=row["type"],
        created_at=row["created_at"],
        environments=env_result,
    )


@router.get("/flags/{key}", response_model=FlagResponse)
async def get_flag(
    key: str,
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    flag = await db.fetchrow(
        """
        SELECT id::text, key, name, description, type, created_at::text
        FROM flags WHERE org_id = $1::uuid AND key = $2
        """,
        membership.org_id,
        key,
    )
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    env_rows = await db.fetch(
        """
        SELECT environment, enabled, rollout_pct, rules::text
        FROM flag_environments WHERE flag_id = $1::uuid
        """,
        flag["id"],
    )

    environments = {}
    for r in env_rows:
        environments[r["environment"]] = EnvConfig(
            enabled=r["enabled"],
            rollout_pct=r["rollout_pct"],
            rules=json.loads(r["rules"]) if r["rules"] else [],
        )

    return FlagResponse(
        id=flag["id"],
        key=flag["key"],
        name=flag["name"],
        description=flag["description"],
        type=flag["type"],
        created_at=flag["created_at"],
        environments=environments,
    )


@router.get("/flags/{key}/events", response_model=FlagEventListResponse)
async def list_flag_events(
    key: str,
    env: str | None = Query(default=None),
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = Query(default=None),
    before: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    where = [
        "e.org_id = $1::uuid",
        "f.key = $2",
    ]
    args: list[object] = [membership.org_id, key]

    if env and env != "all":
        args.append(env)
        where.append(f"e.environment = ${len(args)}")

    if from_:
        args.append(_parse_iso_ts(from_))
        where.append(f"e.created_at >= ${len(args)}::timestamptz")

    if to:
        args.append(_parse_iso_ts(to))
        where.append(f"e.created_at < ${len(args)}::timestamptz")

    if before:
        args.append(_parse_iso_ts(before))
        where.append(f"e.created_at < ${len(args)}::timestamptz")

    rows = await db.fetch(
        f"""
        SELECT e.id::text,
               e.environment,
               e.user_id,
               om.name AS user_name,
               om.email AS user_email,
               e.action,
               e.old_value,
               e.new_value,
               e.created_at::text
        FROM flag_events e
        JOIN flags f ON f.id = e.flag_id
        LEFT JOIN org_members om
          ON om.org_id = e.org_id AND om.user_id = e.user_id
        WHERE {" AND ".join(where)}
        ORDER BY e.created_at DESC
        LIMIT {limit + 1}
        """,
        *args,
    )

    next_before = None
    if len(rows) > limit:
        next_before = rows[limit]["created_at"]
        rows = rows[:limit]

    events = [
        FlagEventResponse(
            id=r["id"],
            environment=r["environment"],
            user_id=r["user_id"],
            user_name=r["user_name"],
            user_email=r["user_email"],
            action=r["action"],
            old_value=_parse_json_dict(r["old_value"]),
            new_value=_parse_json_dict(r["new_value"]),
            created_at=r["created_at"],
        )
        for r in rows
    ]

    return FlagEventListResponse(events=events, next_before=next_before)


@router.get("/flags/{key}/eval-logs", response_model=FlagEvalLogListResponse)
async def list_flag_eval_logs(
    key: str,
    env: str | None = Query(default=None),
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = Query(default=None),
    before: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    where = [
        "l.org_id = $1::uuid",
        "f.key = $2",
    ]
    args: list[object] = [membership.org_id, key]

    if env and env != "all":
        args.append(env)
        where.append(f"l.environment = ${len(args)}")

    if from_:
        args.append(_parse_iso_ts(from_))
        where.append(f"l.created_at >= ${len(args)}::timestamptz")

    if to:
        args.append(_parse_iso_ts(to))
        where.append(f"l.created_at < ${len(args)}::timestamptz")

    if before:
        args.append(_parse_iso_ts(before))
        where.append(f"l.created_at < ${len(args)}::timestamptz")

    rows = await db.fetch(
        f"""
        SELECT l.id::text,
               l.environment,
               l.user_id,
               l.context,
               l.enabled,
               l.reason,
               l.source,
               l.created_at::text
        FROM flag_eval_logs l
        JOIN flags f ON f.id = l.flag_id
        WHERE {" AND ".join(where)}
        ORDER BY l.created_at DESC
        LIMIT {limit + 1}
        """,
        *args,
    )

    next_before = None
    if len(rows) > limit:
        next_before = rows[limit]["created_at"]
        rows = rows[:limit]

    logs = [
        FlagEvalLogResponse(
            id=r["id"],
            environment=r["environment"],
            user_id=r["user_id"],
            context=_parse_json_dict(r["context"]) or {},
            enabled=r["enabled"],
            reason=r["reason"],
            source=r["source"],
            created_at=r["created_at"],
        )
        for r in rows
    ]

    return FlagEvalLogListResponse(logs=logs, next_before=next_before)


@router.get("/usage/monthly", response_model=UsageMonthlyResponse)
async def get_usage_monthly(
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    current = await db.fetchrow(
        """
        SELECT month::text, eval_count
        FROM usage
        WHERE org_id = $1::uuid
          AND month = date_trunc('month', now())::date
        """,
        membership.org_id,
    )
    current_point = UsageMonthlyPoint(
        month=(current["month"] if current else date.today().replace(day=1).isoformat()),
        eval_count=int(current["eval_count"]) if current else 0,
    )

    rows = await db.fetch(
        """
        SELECT month::text, eval_count
        FROM usage
        WHERE org_id = $1::uuid
        ORDER BY month DESC
        LIMIT 12
        """,
        membership.org_id,
    )
    series = [
        UsageMonthlyPoint(month=r["month"], eval_count=int(r["eval_count"])) for r in rows
    ]
    return UsageMonthlyResponse(current=current_point, series=series)


@router.get("/flags/usage", response_model=FlagUsageSeriesResponse)
async def get_flags_usage(
    env: str = Query("dev"),
    days: int = Query(7, ge=1, le=30),
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    rows = await db.fetch(
        """
        SELECT flag_id::text, day::text, eval_count
        FROM flag_usage_daily
        WHERE org_id = $1::uuid
          AND environment = $2
          AND day >= (current_date - ($3::int - 1))
        ORDER BY day ASC
        """,
        membership.org_id,
        env,
        days,
    )

    day_set = sorted({r["day"] for r in rows})
    by_flag: dict[str, dict[str, int]] = {}
    for r in rows:
        fid = r["flag_id"]
        by_flag.setdefault(fid, {})[r["day"]] = int(r["eval_count"])

    by_flag_id: dict[str, list[int]] = {}
    for fid, per_day in by_flag.items():
        by_flag_id[fid] = [per_day.get(d, 0) for d in day_set]

    return FlagUsageSeriesResponse(days=day_set, by_flag_id=by_flag_id)


@router.post("/flags/{key}/test", response_model=FlagTestResponse)
async def test_flag_evaluation(
    key: str,
    body: TestFlagRequest,
    membership: OrgMembership = Depends(require_org_roles("owner", "admin", "developer")),
    db: DB = None,
):
    start = time.monotonic()
    row = await db.fetchrow(
        """
        SELECT f.id::text AS flag_id,
               fe.enabled,
               fe.rollout_pct,
               fe.rules::text,
               f.type
        FROM flag_environments fe
        JOIN flags f ON f.id = fe.flag_id
        WHERE f.org_id = $1::uuid AND fe.environment = $2 AND f.key = $3
        """,
        membership.org_id,
        body.env,
        key,
    )

    if not row:
        elapsed = round((time.monotonic() - start) * 1000)
        return FlagTestResponse(
            flag=key,
            environment=body.env,
            enabled=False,
            reason="flag_not_found",
            latency_ms=elapsed,
            details={"summary": "No config found for this flag in the selected environment."},
        )

    config = {
        "type": row["type"],
        "enabled": row["enabled"],
        "rollout_pct": row["rollout_pct"],
        "rules": json.loads(row["rules"]) if row["rules"] else [],
    }

    resolved_user_id = normalize_user_id(body.userId)
    enabled, reason, details = evaluate_debug(config, key, resolved_user_id, body.context or {})
    elapsed = round((time.monotonic() - start) * 1000)

    asyncio.create_task(
        log_flag_eval(
            membership.org_id,
            row["flag_id"],
            body.env,
            resolved_user_id or "",
            body.context or {},
            enabled,
            reason,
            source="test",
        )
    )

    return FlagTestResponse(
        flag=key,
        environment=body.env,
        enabled=enabled,
        reason=reason,
        latency_ms=elapsed,
        details=details,
    )


@router.patch("/flags/{key}/environments/{env}")
async def update_flag_env(
    key: str,
    env: str,
    body: UpdateEnvRequest,
    membership: OrgMembership = Depends(require_org_roles("owner", "admin", "developer")),
    db: DB = None,
    redis: Redis = None,
):
    flag = await db.fetchrow(
        "SELECT id::text FROM flags WHERE org_id = $1::uuid AND key = $2",
        membership.org_id,
        key,
    )
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    old = await db.fetchrow(
        """
        SELECT enabled, rollout_pct, rules::text
        FROM flag_environments
        WHERE flag_id = $1::uuid AND environment = $2
        """,
        flag["id"],
        env,
    )
    if not old:
        raise HTTPException(status_code=404, detail=f"Environment '{env}' not found for this flag")

    new_enabled = body.enabled if body.enabled is not None else old["enabled"]
    new_pct = body.rollout_pct if body.rollout_pct is not None else old["rollout_pct"]
    new_rules = json.dumps(body.rules) if body.rules is not None else old["rules"]

    await db.execute(
        """
        UPDATE flag_environments
        SET enabled = $1, rollout_pct = $2, rules = $3::jsonb,
            updated_at = now(), updated_by = $4
        WHERE flag_id = $5::uuid AND environment = $6
        """,
        new_enabled,
        new_pct,
        new_rules if isinstance(new_rules, str) else json.dumps(new_rules),
        membership.user_id,
        flag["id"],
        env,
    )

    old_value = {
        "enabled": old["enabled"],
        "rollout_pct": old["rollout_pct"],
        "rules": json.loads(old["rules"]) if old["rules"] else [],
    }
    new_value = {
        "enabled": new_enabled,
        "rollout_pct": new_pct,
        "rules": json.loads(new_rules) if isinstance(new_rules, str) else new_rules,
    }

    action = "enabled" if new_enabled and not old["enabled"] else (
        "disabled" if not new_enabled and old["enabled"] else "updated"
    )

    await db.execute(
        """
        INSERT INTO flag_events
            (org_id, flag_id, environment, user_id, action, old_value, new_value)
        VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, $7::jsonb)
        """,
        membership.org_id,
        flag["id"],
        env,
        membership.user_id,
        action,
        json.dumps(old_value),
        json.dumps(new_value),
    )

    await invalidate_flag(redis, membership.org_id, env, key)

    return {"status": "updated", "flag": key, "environment": env}


@router.delete("/flags/{key}")
async def delete_flag(
    key: str,
    membership: OrgMembership = Depends(require_org_roles("owner", "admin")),
    db: DB = None,
    redis: Redis = None,
):
    flag = await db.fetchrow(
        "SELECT id::text FROM flags WHERE org_id = $1::uuid AND key = $2",
        membership.org_id,
        key,
    )
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    envs = await db.fetch(
        "SELECT environment FROM flag_environments WHERE flag_id = $1::uuid",
        flag["id"],
    )

    await db.execute(
        """
        INSERT INTO flag_events (org_id, flag_id, environment, user_id, action)
        VALUES ($1::uuid, $2::uuid, 'all', $3, 'deleted')
        """,
        membership.org_id,
        flag["id"],
        membership.user_id,
    )

    await db.execute("DELETE FROM flags WHERE id = $1::uuid", flag["id"])

    for env_row in envs:
        await invalidate_flag(redis, membership.org_id, env_row["environment"], key)

    return {"status": "deleted", "flag": key}
