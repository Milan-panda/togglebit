from pydantic import BaseModel, Field

ORG_ROLES = ("owner", "admin", "developer", "member")


class CreateOrgRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(pattern=r"^[a-z0-9][a-z0-9\-]{0,62}[a-z0-9]$")
    email: str | None = None


class OrgResponse(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    created_at: str
    role: str


class OrgMembershipResponse(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    created_at: str
    role: str


class OrgMemberResponse(BaseModel):
    user_id: str
    email: str | None = None
    role: str
    created_at: str


class InviteMemberRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    role: str = Field(pattern=r"^(owner|admin|developer|member)$")


class UpdateMemberRoleRequest(BaseModel):
    role: str = Field(pattern=r"^(owner|admin|developer|member)$")


class OrgInvitationResponse(BaseModel):
    id: str
    email: str
    role: str
    token: str
    invited_by: str
    created_at: str
    expires_at: str
    accepted_at: str | None


class AcceptInvitationRequest(BaseModel):
    token: str = Field(min_length=16, max_length=128)


class UserPendingInvitationResponse(BaseModel):
    id: str
    org_id: str
    org_name: str
    org_slug: str
    email: str
    role: str
    token: str
    invited_by: str
    created_at: str
    expires_at: str
