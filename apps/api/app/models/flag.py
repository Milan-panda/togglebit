from pydantic import BaseModel, Field


class CreateFlagRequest(BaseModel):
    key: str = Field(pattern=r"^[a-z0-9][a-z0-9\-]{0,62}[a-z0-9]$")
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    type: str = Field(default="boolean", pattern=r"^(boolean|percentage|segment|combined)$")
    environments: dict[str, "EnvConfig"] | None = None


class EnvConfig(BaseModel):
    enabled: bool = False
    rollout_pct: int = Field(default=0, ge=0, le=100)
    rules: list[dict] = Field(default_factory=list)


class UpdateEnvRequest(BaseModel):
    enabled: bool | None = None
    rollout_pct: int | None = Field(default=None, ge=0, le=100)
    rules: list[dict] | None = None


class FlagResponse(BaseModel):
    id: str
    key: str
    name: str
    description: str | None
    type: str
    created_at: str
    environments: dict[str, EnvConfig] | None = None


class FlagListResponse(BaseModel):
    flags: list[FlagResponse]
    total: int
