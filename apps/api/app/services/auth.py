import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass

import jwt
from fastapi import Depends, Header, HTTPException
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError

from app.config import resolved_clerk_jwks_url, settings
from app.dependencies import DB, Redis


@dataclass
class ApiKeyAuth:
    org_id: str
    environment: str


@dataclass
class ClerkAuth:
    user_id: str


def generate_api_key(environment: str) -> tuple[str, str, str]:
    """Generate a new API key. Returns (raw_key, hashed_key, key_prefix)."""
    token = secrets.token_urlsafe(32)
    raw = f"tb_{environment}_{token}"
    hashed = _hash_key(raw)
    prefix = raw[:12]
    return raw, hashed, prefix


def _hash_key(raw: str) -> str:
    return hmac.new(
        settings.hmac_secret.encode(),
        raw.encode(),
        hashlib.sha256,
    ).hexdigest()


async def require_api_key(
    authorization: str = Header(..., alias="Authorization"),
    redis: Redis = None,
    db: DB = None,
) -> ApiKeyAuth:
    """Validate API key from Bearer token. Caches lookup in Redis."""
    if not authorization.startswith("Bearer tb_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    raw = authorization.removeprefix("Bearer ")
    hashed = _hash_key(raw)

    cache_key = f"apikey:{hashed}"
    cached = await redis.get(cache_key)
    if cached:
        data = json.loads(cached)
        return ApiKeyAuth(org_id=data["org_id"], environment=data["environment"])

    row = await db.fetchrow(
        "SELECT org_id::text, environment FROM api_keys WHERE key_hash = $1",
        hashed,
    )
    if not row:
        raise HTTPException(status_code=401, detail="Invalid API key")

    result = {"org_id": row["org_id"], "environment": row["environment"]}
    await redis.set(cache_key, json.dumps(result), ex=300)

    # Update last_used_at (fire-and-forget, don't block response)
    await db.execute(
        "UPDATE api_keys SET last_used_at = now() WHERE key_hash = $1",
        hashed,
    )

    return ApiKeyAuth(**result)


_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        try:
            url = resolved_clerk_jwks_url(settings)
        except ValueError as e:
            raise RuntimeError(str(e)) from e
        _jwks_client = PyJWKClient(url, cache_keys=True)
    return _jwks_client


async def require_clerk(
    authorization: str = Header(..., alias="Authorization"),
) -> ClerkAuth:
    """Validate Clerk JWT from Bearer token."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    token = authorization.removeprefix("Bearer ")

    try:
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no sub claim")
        return ClerkAuth(user_id=user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    except PyJWKClientConnectionError as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "Cannot reach Clerk JWKS. Set CLERK_PUBLISHABLE_KEY (same as "
                f"NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) or CLERK_JWKS_URL. Underlying: {e}"
            ),
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
