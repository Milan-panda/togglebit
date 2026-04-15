import base64

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://togglebit:togglebit@localhost:5432/togglebit"
    redis_url: str = "redis://localhost:6379"
    hmac_secret: str = "change-me-in-production"
    clerk_secret_key: str = ""
    # Explicit JWKS URL (optional). If unset, derived from clerk_publishable_key.
    # Must NOT use https://api.clerk.com/v1/jwks — that returns 403 without Clerk's auth flow.
    clerk_jwks_url: str = ""
    # Same value as NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (pk_test_... / pk_live_...).
    # Used to build https://<frontend-api>/.well-known/jwks.json when clerk_jwks_url is empty.
    clerk_publishable_key: str = ""
    dashboard_url: str = "http://localhost:3000"
    environment: str = "development"

    model_config = {"env_file": ".env", "extra": "ignore"}


def _frontend_api_host_from_publishable_key(pk: str) -> str:
    """Decode Clerk publishable key (pk_*_*_<b64>) to Frontend API hostname."""
    pk = pk.strip()
    parts = pk.split("_", 2)
    if len(parts) < 3 or parts[0] != "pk":
        raise ValueError(
            "Set CLERK_JWKS_URL or CLERK_PUBLISHABLE_KEY (pk_test_... / pk_live_...)"
        )
    b64 = parts[2].rstrip("$")
    pad = "=" * ((4 - len(b64) % 4) % 4)
    raw = base64.urlsafe_b64decode(b64 + pad).decode("utf-8")
    host = raw.rstrip("$").strip()
    if not host or "." not in host:
        raise ValueError("Could not decode Frontend API host from CLERK_PUBLISHABLE_KEY")
    return host


def resolved_clerk_jwks_url(s: Settings) -> str:
    if s.clerk_jwks_url.strip():
        return s.clerk_jwks_url.rstrip("/")
    host = _frontend_api_host_from_publishable_key(s.clerk_publishable_key)
    return f"https://{host}/.well-known/jwks.json"


settings = Settings()
