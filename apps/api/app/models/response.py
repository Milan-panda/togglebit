from pydantic import BaseModel


class EvalResponse(BaseModel):
    flag: str
    enabled: bool
    reason: str
    latency_ms: int


class ApiKeyResponse(BaseModel):
    id: str
    environment: str
    key_prefix: str
    name: str
    last_used_at: str | None
    created_at: str


class ApiKeyCreatedResponse(ApiKeyResponse):
    raw_key: str


class HealthResponse(BaseModel):
    status: str
    environment: str
