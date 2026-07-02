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


class UpdateFlagRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None


class TestFlagRequest(BaseModel):
    env: str = Field(default="dev", pattern=r"^(dev|staging|prod)$")
    userId: str | None = Field(default=None, max_length=200)
    context: dict = Field(default_factory=dict)


class CloneFlagRequest(BaseModel):
    new_key: str = Field(pattern=r"^[a-z0-9][a-z0-9\-]{0,62}[a-z0-9]$")
    new_name: str | None = Field(default=None, min_length=1, max_length=200)


class CreatedByInfo(BaseModel):
    user_id: str
    name: str | None = None
    email: str | None = None


class FlagResponse(BaseModel):
    id: str
    key: str
    name: str
    description: str | None
    type: str
    created_at: str
    created_by: CreatedByInfo | None = None
    archived_at: str | None = None
    environments: dict[str, EnvConfig] | None = None


class FlagListResponse(BaseModel):
    flags: list[FlagResponse]
    total: int
