from pydantic import BaseModel, Field


class CreateOrgRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(pattern=r"^[a-z0-9][a-z0-9\-]{0,62}[a-z0-9]$")


class OrgResponse(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    created_at: str
