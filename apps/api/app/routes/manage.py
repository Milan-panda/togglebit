import asyncio
import json

from datetime import date
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import DB, Redis
from app.models.flag import (
    CloneFlagRequest,
    CreateFlagRequest,
    CreatedByInfo,
    EnvConfig,
    FlagListResponse,
    FlagResponse,
    TestFlagRequest,
    UpdateEnvRequest,
    UpdateFlagRequest,
)
from app.models.onboarding import OnboardingStatusResponse, OnboardingSteps
from app.models.response import (
    ActivityEventListResponse,
    ActivityEventResponse,
    FlagEvalLogListResponse,
    FlagEvalLogResponse,
    FlagEventListResponse,
    FlagEventResponse,
    FlagTestResponse,
    FlagUsageMeta,
    FlagUsageSeriesResponse,
    UsageMonthlyPoint,
    UsageMonthlyResponse,
)
from app.services.authorization import OrgMembership, require_org_membership, require_org_roles
from app.services.cache import invalidate_flag
from app.services.eval import evaluate, evaluate_debug, normalize_user_id
from app.services.usage import log_flag_eval, read_pending_flag_eval_counts, track_eval, track_flag_eval, usage_day_range

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


def _created_by_info(row) -> CreatedByInfo | None:
    user_id = row.get("created_by") if isinstance(row, dict) else None
    if not user_id:
        return None
    return CreatedByInfo(
        user_id=user_id,
        name=row.get("creator_name"),
        email=row.get("creator_email"),
    )


def _flag_response_from_row(r, env: str | None = None) -> FlagResponse:
    env_config = None
    if env and r.get("enabled") is not None:
        env_config = {
            env: EnvConfig(
                enabled=r["enabled"],
                rollout_pct=r["rollout_pct"],
                rules=json.loads(r["rules"]) if r["rules"] else [],
            )
        }
    elif not env and r.get("environments"):
        env_config = r["environments"]

    return FlagResponse(
        id=r["id"],
        key=r["key"],
        name=r["name"],
        description=r["description"],
        type=r["type"],
        created_at=r["created_at"],
        created_by=_created_by_info(r),
        archived_at=r.get("archived_at"),
        environments=env_config,
    )


async def _fetch_flag_environments(db, flag_id: str) -> dict[str, EnvConfig]:
    env_rows = await db.fetch(
        """
        SELECT environment, enabled, rollout_pct, rules::text
        FROM flag_environments WHERE flag_id = $1::uuid
        """,
        flag_id,
    )
    environments = {}
    for r in env_rows:
        environments[r["environment"]] = EnvConfig(
            enabled=r["enabled"],
            rollout_pct=r["rollout_pct"],
            rules=json.loads(r["rules"]) if r["rules"] else [],
        )
    return environments


@router.get("/flags", response_model=FlagListResponse)
async def list_flags(
    env: str = Query("dev"),
    q: str | None = Query(default=None),
    type_: str | None = Query(default=None, alias="type"),
    enabled: bool | None = Query(default=None),
    has_rules: bool | None = Query(default=None),
    rollout_gt: int | None = Query(default=None, ge=0, le=100),
    sort: str = Query(default="created_at", pattern=r"^(name|created_at|eval_volume)$"),
    order: str = Query(default="desc", pattern=r"^(asc|desc)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    include_archived: bool = Query(default=False),
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    where = ["f.org_id = $1::uuid"]
    args: list[object] = [membership.org_id, env]

    if not include_archived:
        where.append("f.archived_at IS NULL")

    if q:
        args.append(f"%{q}%")
        where.append(f"(f.key ILIKE ${len(args)} OR f.name ILIKE ${len(args)})")

    if type_:
        args.append(type_)
        where.append(f"f.type = ${len(args)}")

    if enabled is not None:
        args.append(enabled)
        if enabled:
            where.append(f"fe.enabled = ${len(args)}")
        else:
            where.append(f"(fe.enabled = ${len(args)} OR fe.enabled IS NULL)")

    if has_rules is True:
        where.append("jsonb_array_length(COALESCE(fe.rules, '[]'::jsonb)) > 0")

    if rollout_gt is not None:
        args.append(rollout_gt)
        where.append(f"fe.rollout_pct > ${len(args)}")

    where_sql = " AND ".join(where)

    total = await db.fetchval(
        f"""
        SELECT COUNT(*)::int
        FROM flags f
        LEFT JOIN flag_environments fe
            ON fe.flag_id = f.id AND fe.environment = $2
        WHERE {where_sql}
        """,
        *args,
    )

    order_dir = "ASC" if order == "asc" else "DESC"
    if sort == "name":
        order_sql = f"f.name {order_dir}"
    elif sort == "eval_volume":
        order_sql = f"COALESCE(usage_sum.total, 0) {order_dir}, f.name ASC"
    else:
        order_sql = f"f.created_at {order_dir}"

    usage_join = ""
    if sort == "eval_volume":
        usage_join = """
        LEFT JOIN (
            SELECT flag_id, SUM(eval_count)::int AS total
            FROM flag_usage_daily
            WHERE org_id = $1::uuid
              AND environment = $2
              AND day >= (current_date - 6)
            GROUP BY flag_id
        ) usage_sum ON usage_sum.flag_id = f.id
        """

    rows = await db.fetch(
        f"""
        SELECT f.id::text, f.key, f.name, f.description, f.type,
               f.created_at::text, f.created_by,
               f.archived_at::text,
               cb.name AS creator_name, cb.email AS creator_email,
               fe.enabled, fe.rollout_pct, fe.rules::text
        FROM flags f
        LEFT JOIN flag_environments fe
            ON fe.flag_id = f.id AND fe.environment = $2
        LEFT JOIN org_members cb
            ON cb.org_id = f.org_id AND cb.user_id = f.created_by
        {usage_join}
        WHERE {where_sql}
        ORDER BY {order_sql}
        LIMIT {limit} OFFSET {offset}
        """,
        *args,
    )

    flags = [_flag_response_from_row(r, env) for r in rows]

    return FlagListResponse(flags=flags, total=int(total or 0))


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
        created_by=CreatedByInfo(user_id=membership.user_id),
        environments=env_result,
    )


@router.get("/flags/usage", response_model=FlagUsageSeriesResponse)
async def get_flags_usage(
    env: str = Query("dev"),
    days: int = Query(7, ge=1, le=30),
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    flag_rows = await db.fetch(
        """
        SELECT f.id::text, f.key, f.name
        FROM flags f
        WHERE f.org_id = $1::uuid AND f.archived_at IS NULL
        ORDER BY f.name ASC
        """,
        membership.org_id,
    )
    flags_meta = [
        FlagUsageMeta(id=r["id"], key=r["key"], name=r["name"]) for r in flag_rows
    ]

    day_set = usage_day_range(days)

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

    by_flag: dict[str, dict[str, int]] = {}
    for r in rows:
        fid = r["flag_id"]
        day = r["day"]
        by_flag.setdefault(fid, {})
        by_flag[fid][day] = by_flag[fid].get(day, 0) + int(r["eval_count"])

    pending = await read_pending_flag_eval_counts(membership.org_id, env, days)
    for fid, per_day in pending.items():
        by_flag.setdefault(fid, {})
        for day, count in per_day.items():
            if day in day_set:
                by_flag[fid][day] = by_flag[fid].get(day, 0) + count

    by_flag_id: dict[str, list[int]] = {}
    totals_by_flag_id: dict[str, int] = {}
    for fid, per_day in by_flag.items():
        series = [per_day.get(d, 0) for d in day_set]
        if any(series):
            by_flag_id[fid] = series
            totals_by_flag_id[fid] = sum(series)

    return FlagUsageSeriesResponse(
        days=day_set,
        by_flag_id=by_flag_id,
        totals_by_flag_id=totals_by_flag_id,
        flags=flags_meta,
    )


@router.get("/activity", response_model=ActivityEventListResponse)
async def list_activity(
    user_id: str | None = Query(default=None),
    action: str | None = Query(default=None),
    env: str | None = Query(default=None),
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = Query(default=None),
    before: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    where = ["e.org_id = $1::uuid"]
    args: list[object] = [membership.org_id]

    if user_id:
        args.append(user_id)
        where.append(f"e.user_id = ${len(args)}")

    if action:
        args.append(action)
        where.append(f"e.action = ${len(args)}")

    if env and env != "all":
        args.append(env)
        where.append(f"e.environment = ${len(args)}")

    if from_:
        args.append(_parse_iso_ts(from_))
        where.append(f"e.created_at >= ${len(args)}::timestamptz")
    elif not before:
        where.append("e.created_at >= now() - interval '7 days'")

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
               e.created_at::text,
               f.key AS flag_key,
               f.name AS flag_name
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
        ActivityEventResponse(
            id=r["id"],
            environment=r["environment"],
            user_id=r["user_id"],
            user_name=r["user_name"],
            user_email=r["user_email"],
            action=r["action"],
            old_value=_parse_json_dict(r["old_value"]),
            new_value=_parse_json_dict(r["new_value"]),
            created_at=r["created_at"],
            flag_key=r["flag_key"],
            flag_name=r["flag_name"],
        )
        for r in rows
    ]

    return ActivityEventListResponse(events=events, next_before=next_before)


@router.get("/flags/{key}", response_model=FlagResponse)
async def get_flag(
    key: str,
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    flag = await db.fetchrow(
        """
        SELECT f.id::text, f.key, f.name, f.description, f.type, f.created_at::text,
               f.created_by, f.archived_at::text,
               cb.name AS creator_name, cb.email AS creator_email
        FROM flags f
        LEFT JOIN org_members cb
            ON cb.org_id = f.org_id AND cb.user_id = f.created_by
        WHERE f.org_id = $1::uuid AND f.key = $2
        """,
        membership.org_id,
        key,
    )
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    environments = await _fetch_flag_environments(db, flag["id"])

    return FlagResponse(
        id=flag["id"],
        key=flag["key"],
        name=flag["name"],
        description=flag["description"],
        type=flag["type"],
        created_at=flag["created_at"],
        created_by=_created_by_info(flag),
        archived_at=flag["archived_at"],
        environments=environments,
    )


@router.patch("/flags/{key}", response_model=FlagResponse)
async def update_flag(
    key: str,
    body: UpdateFlagRequest,
    membership: OrgMembership = Depends(require_org_roles("owner", "admin", "developer")),
    db: DB = None,
):
    if body.name is None and body.description is None:
        raise HTTPException(status_code=400, detail="No fields to update")

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

    new_name = body.name if body.name is not None else flag["name"]
    new_description = (
        (body.description.strip() or None)
        if body.description is not None
        else flag["description"]
    )

    old_value = {"name": flag["name"], "description": flag["description"]}
    new_value = {"name": new_name, "description": new_description}

    if old_value == new_value:
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

    await db.execute(
        """
        UPDATE flags
        SET name = $1, description = $2
        WHERE id = $3::uuid
        """,
        new_name,
        new_description,
        flag["id"],
    )

    await db.execute(
        """
        INSERT INTO flag_events
            (org_id, flag_id, environment, user_id, action, old_value, new_value)
        VALUES ($1::uuid, $2::uuid, 'all', $3, 'updated', $4::jsonb, $5::jsonb)
        """,
        membership.org_id,
        flag["id"],
        membership.user_id,
        json.dumps(old_value),
        json.dumps(new_value),
    )

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
        name=new_name,
        description=new_description,
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
    redis: Redis = None,
):
    current_month = date.today().replace(day=1).isoformat()
    current = await db.fetchrow(
        """
        SELECT month::text, eval_count
        FROM usage
        WHERE org_id = $1::uuid
          AND month = date_trunc('month', now())::date
        """,
        membership.org_id,
    )
    current_count = int(current["eval_count"]) if current else 0
    pending = await redis.get(f"evals:{membership.org_id}:{current_month}")
    if pending:
        current_count += int(pending)

    current_point = UsageMonthlyPoint(
        month=(current["month"] if current else current_month),
        eval_count=current_count,
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


@router.post("/flags/{key}/test", response_model=FlagTestResponse)
async def test_flag_evaluation(
    key: str,
    body: TestFlagRequest,
    membership: OrgMembership = Depends(require_org_membership),
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

    asyncio.create_task(track_eval(membership.org_id))
    asyncio.create_task(track_flag_eval(membership.org_id, row["flag_id"], body.env))
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


@router.post("/flags/{key}/clone", response_model=FlagResponse, status_code=201)
async def clone_flag(
    key: str,
    body: CloneFlagRequest,
    membership: OrgMembership = Depends(require_org_roles("owner", "admin", "developer")),
    db: DB = None,
):
    source = await db.fetchrow(
        """
        SELECT id::text, key, name, description, type
        FROM flags
        WHERE org_id = $1::uuid AND key = $2 AND archived_at IS NULL
        """,
        membership.org_id,
        key,
    )
    if not source:
        raise HTTPException(status_code=404, detail="Flag not found")

    existing = await db.fetchrow(
        "SELECT id FROM flags WHERE org_id = $1::uuid AND key = $2",
        membership.org_id,
        body.new_key,
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Flag '{body.new_key}' already exists")

    new_name = body.new_name or f"{source['name']} (copy)"

    row = await db.fetchrow(
        """
        INSERT INTO flags (org_id, key, name, description, type, created_by)
        VALUES ($1::uuid, $2, $3, $4, $5, $6)
        RETURNING id::text, key, name, description, type, created_at::text
        """,
        membership.org_id,
        body.new_key,
        new_name,
        source["description"],
        source["type"],
        membership.user_id,
    )

    env_rows = await db.fetch(
        """
        SELECT environment, enabled, rollout_pct, rules::text
        FROM flag_environments WHERE flag_id = $1::uuid
        """,
        source["id"],
    )

    env_result = {}
    for r in env_rows:
        rules = json.loads(r["rules"]) if r["rules"] else []
        await db.execute(
            """
            INSERT INTO flag_environments
                (flag_id, org_id, environment, enabled, rollout_pct, rules, updated_by)
            VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, $7)
            """,
            row["id"],
            membership.org_id,
            r["environment"],
            r["enabled"],
            r["rollout_pct"],
            json.dumps(rules),
            membership.user_id,
        )
        env_result[r["environment"]] = EnvConfig(
            enabled=r["enabled"],
            rollout_pct=r["rollout_pct"],
            rules=rules,
        )

    await db.execute(
        """
        INSERT INTO flag_events (org_id, flag_id, environment, user_id, action, new_value)
        VALUES ($1::uuid, $2::uuid, 'all', $3, 'cloned', $4::jsonb)
        """,
        membership.org_id,
        row["id"],
        membership.user_id,
        json.dumps({"source_key": key, "new_key": body.new_key}),
    )

    return FlagResponse(
        id=row["id"],
        key=row["key"],
        name=row["name"],
        description=row["description"],
        type=row["type"],
        created_at=row["created_at"],
        created_by=CreatedByInfo(user_id=membership.user_id),
        environments=env_result,
    )


@router.delete("/flags/{key}")
async def delete_flag(
    key: str,
    permanent: bool = Query(default=False),
    membership: OrgMembership = Depends(require_org_roles("owner", "admin")),
    db: DB = None,
    redis: Redis = None,
):
    flag = await db.fetchrow(
        "SELECT id::text, archived_at FROM flags WHERE org_id = $1::uuid AND key = $2",
        membership.org_id,
        key,
    )
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    envs = await db.fetch(
        "SELECT environment FROM flag_environments WHERE flag_id = $1::uuid",
        flag["id"],
    )

    if permanent:
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

    if flag["archived_at"]:
        raise HTTPException(status_code=400, detail="Flag is already archived")

    await db.execute(
        """
        INSERT INTO flag_events (org_id, flag_id, environment, user_id, action)
        VALUES ($1::uuid, $2::uuid, 'all', $3, 'archived')
        """,
        membership.org_id,
        flag["id"],
        membership.user_id,
    )

    await db.execute(
        "UPDATE flags SET archived_at = now() WHERE id = $1::uuid",
        flag["id"],
    )

    for env_row in envs:
        await invalidate_flag(redis, membership.org_id, env_row["environment"], key)

    return {"status": "archived", "flag": key}


@router.get("/onboarding/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    flag_row = await db.fetchrow(
        """
        SELECT key FROM flags
        WHERE org_id = $1::uuid
        ORDER BY created_at ASC
        LIMIT 1
        """,
        membership.org_id,
    )
    flag_count = await db.fetchval(
        "SELECT COUNT(*)::int FROM flags WHERE org_id = $1::uuid",
        membership.org_id,
    )
    dev_key_row = await db.fetchrow(
        """
        SELECT id FROM api_keys
        WHERE org_id = $1::uuid AND environment = 'dev'
        LIMIT 1
        """,
        membership.org_id,
    )
    sdk_connected = await db.fetchval(
        """
        SELECT EXISTS(
            SELECT 1 FROM flag_eval_logs fel
            JOIN flags f ON f.id = fel.flag_id
            WHERE f.org_id = $1::uuid AND fel.source = 'api'
        )
        OR EXISTS(
            SELECT 1 FROM api_keys
            WHERE org_id = $1::uuid AND last_used_at IS NOT NULL
        )
        """,
        membership.org_id,
    )
    test_eval = await db.fetchval(
        """
        SELECT EXISTS(
            SELECT 1 FROM flag_eval_logs fel
            JOIN flags f ON f.id = fel.flag_id
            WHERE f.org_id = $1::uuid AND fel.source IN ('test', 'api')
        )
        """,
        membership.org_id,
    )

    steps = OnboardingSteps(
        create_flag=(flag_count or 0) >= 1,
        dev_api_key=dev_key_row is not None,
        sdk_connected=bool(sdk_connected),
        test_eval=bool(test_eval),
    )
    complete = all(steps.model_dump().values())

    return OnboardingStatusResponse(
        complete=complete,
        first_flag_key=flag_row["key"] if flag_row else None,
        steps=steps,
    )
