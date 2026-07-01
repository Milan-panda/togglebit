from pydantic import BaseModel, Field


class EvalResponse(BaseModel):
    flag: str
    enabled: bool
    reason: str
    latency_ms: int


class FlagEventResponse(BaseModel):
    id: str
    environment: str
    user_id: str
    user_name: str | None = None
    user_email: str | None = None
    action: str
    old_value: dict | None = None
    new_value: dict | None = None
    created_at: str


class FlagEventListResponse(BaseModel):
    events: list[FlagEventResponse]
    next_before: str | None = None


class FlagEvalLogResponse(BaseModel):
    id: str
    environment: str
    user_id: str
    context: dict = Field(default_factory=dict)
    enabled: bool
    reason: str
    source: str
    created_at: str


class FlagEvalLogListResponse(BaseModel):
    logs: list[FlagEvalLogResponse]
    next_before: str | None = None


class UsageMonthlyPoint(BaseModel):
    month: str
    eval_count: int


class UsageMonthlyResponse(BaseModel):
    current: UsageMonthlyPoint
    series: list[UsageMonthlyPoint]


class FlagUsageSeriesPoint(BaseModel):
    day: str
    eval_count: int


class FlagUsageSeriesResponse(BaseModel):
    days: list[str]
    by_flag_id: dict[str, list[int]]


class FlagTestResponse(BaseModel):
    flag: str
    environment: str
    enabled: bool
    reason: str
    latency_ms: int
    details: dict = Field(default_factory=dict)


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
