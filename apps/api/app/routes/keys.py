from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.dependencies import DB, Redis
from app.models.response import ApiKeyCreatedResponse, ApiKeyResponse
from app.services.auth import ClerkAuth, generate_api_key, require_clerk

router = APIRouter(tags=["keys"])


class CreateKeyRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    environment: str = Field(pattern=r"^(dev|staging|prod)$")


async def _get_org_id(db, user_id: str) -> str:
    row = await db.fetchrow(
        "SELECT org_id::text FROM org_members WHERE user_id = $1 LIMIT 1",
        user_id,
    )
    if not row:
        raise HTTPException(status_code=403, detail="Not a member of any organization")
    return row["org_id"]


@router.post("/keys", response_model=ApiKeyCreatedResponse, status_code=201)
async def create_key(
    body: CreateKeyRequest,
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
):
    org_id = await _get_org_id(db, auth.user_id)
    raw, hashed, prefix = generate_api_key(body.environment)

    row = await db.fetchrow(
        """
        INSERT INTO api_keys (org_id, environment, key_hash, key_prefix, name, created_by)
        VALUES ($1::uuid, $2, $3, $4, $5, $6)
        RETURNING id::text, environment, key_prefix, name, last_used_at::text, created_at::text
        """,
        org_id,
        body.environment,
        hashed,
        prefix,
        body.name,
        auth.user_id,
    )

    return ApiKeyCreatedResponse(
        id=row["id"],
        environment=row["environment"],
        key_prefix=row["key_prefix"],
        name=row["name"],
        last_used_at=row["last_used_at"],
        created_at=row["created_at"],
        raw_key=raw,
    )


@router.get("/keys", response_model=list[ApiKeyResponse])
async def list_keys(
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
):
    org_id = await _get_org_id(db, auth.user_id)

    rows = await db.fetch(
        """
        SELECT id::text, environment, key_prefix, name,
               last_used_at::text, created_at::text
        FROM api_keys
        WHERE org_id = $1::uuid
        ORDER BY created_at DESC
        """,
        org_id,
    )

    return [
        ApiKeyResponse(
            id=r["id"],
            environment=r["environment"],
            key_prefix=r["key_prefix"],
            name=r["name"],
            last_used_at=r["last_used_at"],
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.delete("/keys/{key_id}")
async def revoke_key(
    key_id: str,
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
    redis: Redis = None,
):
    org_id = await _get_org_id(db, auth.user_id)

    row = await db.fetchrow(
        "SELECT key_hash FROM api_keys WHERE id = $1::uuid AND org_id = $2::uuid",
        key_id,
        org_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="API key not found")

    await redis.delete(f"apikey:{row['key_hash']}")
    await db.execute("DELETE FROM api_keys WHERE id = $1::uuid", key_id)

    return {"status": "revoked"}
