import json

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import DB, Redis
from app.models.flag import (
    CreateFlagRequest,
    EnvConfig,
    FlagListResponse,
    FlagResponse,
    UpdateEnvRequest,
)
from app.services.auth import ClerkAuth, require_clerk
from app.services.cache import invalidate_flag

router = APIRouter(tags=["manage"])

DEFAULT_ENVS = ["dev", "staging", "prod"]


async def _get_org_id(db, user_id: str) -> str:
    row = await db.fetchrow(
        "SELECT org_id::text FROM org_members WHERE user_id = $1 LIMIT 1",
        user_id,
    )
    if not row:
        raise HTTPException(status_code=403, detail="Not a member of any organization")
    return row["org_id"]


@router.get("/flags", response_model=FlagListResponse)
async def list_flags(
    env: str = Query("dev"),
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
):
    org_id = await _get_org_id(db, auth.user_id)

    rows = await db.fetch(
        """
        SELECT f.id::text, f.key, f.name, f.description, f.type,
               f.created_at::text,
               fe.enabled, fe.rollout_pct, fe.rules::text
        FROM flags f
        LEFT JOIN flag_environments fe
            ON fe.flag_id = f.id AND fe.environment = $2
        WHERE f.org_id = $1::uuid
        ORDER BY f.created_at DESC
        """,
        org_id,
        env,
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
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
):
    org_id = await _get_org_id(db, auth.user_id)

    existing = await db.fetchrow(
        "SELECT id FROM flags WHERE org_id = $1::uuid AND key = $2",
        org_id,
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
        org_id,
        body.key,
        body.name,
        body.description,
        body.type,
        auth.user_id,
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
            org_id,
            env_name,
            env_config.enabled,
            env_config.rollout_pct,
            json.dumps(env_config.rules),
            auth.user_id,
        )
        env_result[env_name] = env_config

    await db.execute(
        """
        INSERT INTO flag_events (org_id, flag_id, environment, user_id, action, new_value)
        VALUES ($1::uuid, $2::uuid, 'all', $3, 'created', $4::jsonb)
        """,
        org_id,
        row["id"],
        auth.user_id,
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
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
):
    org_id = await _get_org_id(db, auth.user_id)

    flag = await db.fetchrow(
        """
        SELECT id::text, key, name, description, type, created_at::text
        FROM flags WHERE org_id = $1::uuid AND key = $2
        """,
        org_id,
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


@router.patch("/flags/{key}/environments/{env}")
async def update_flag_env(
    key: str,
    env: str,
    body: UpdateEnvRequest,
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
    redis: Redis = None,
):
    org_id = await _get_org_id(db, auth.user_id)

    flag = await db.fetchrow(
        "SELECT id::text FROM flags WHERE org_id = $1::uuid AND key = $2",
        org_id,
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
        auth.user_id,
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
        org_id,
        flag["id"],
        env,
        auth.user_id,
        action,
        json.dumps(old_value),
        json.dumps(new_value),
    )

    await invalidate_flag(redis, org_id, env, key)

    return {"status": "updated", "flag": key, "environment": env}


@router.delete("/flags/{key}")
async def delete_flag(
    key: str,
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
    redis: Redis = None,
):
    org_id = await _get_org_id(db, auth.user_id)

    flag = await db.fetchrow(
        "SELECT id::text FROM flags WHERE org_id = $1::uuid AND key = $2",
        org_id,
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
        org_id,
        flag["id"],
        auth.user_id,
    )

    await db.execute("DELETE FROM flags WHERE id = $1::uuid", flag["id"])

    for env_row in envs:
        await invalidate_flag(redis, org_id, env_row["environment"], key)

    return {"status": "deleted", "flag": key}
