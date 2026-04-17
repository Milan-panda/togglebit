import secrets

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import DB
from app.models.org import (
    AcceptInvitationRequest,
    CreateOrgRequest,
    InviteMemberRequest,
    OrgInvitationResponse,
    OrgMembershipResponse,
    OrgMemberResponse,
    OrgResponse,
    UpdateMemberRoleRequest,
    UserPendingInvitationResponse,
)
from app.services.auth import ClerkAuth, require_clerk
from app.services.authorization import OrgMembership, require_org_membership, require_org_roles

router = APIRouter(tags=["orgs"])


@router.post("/orgs", response_model=OrgResponse, status_code=201)
async def create_org(
    body: CreateOrgRequest,
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
):
    existing = await db.fetchrow("SELECT id FROM orgs WHERE slug = $1", body.slug)
    if existing:
        raise HTTPException(status_code=409, detail=f"Slug '{body.slug}' is taken")

    row = await db.fetchrow(
        """
        INSERT INTO orgs (name, slug)
        VALUES ($1, $2)
        RETURNING id::text, name, slug, plan, created_at::text
        """,
        body.name,
        body.slug,
    )

    await db.execute(
        """
        INSERT INTO org_members (org_id, user_id, role, email)
        VALUES ($1::uuid, $2, 'owner', $3)
        """,
        row["id"],
        auth.user_id,
        auth.email or body.email,
    )

    return OrgResponse(
        id=row["id"],
        name=row["name"],
        slug=row["slug"],
        plan=row["plan"],
        created_at=row["created_at"],
        role="owner",
    )


@router.get("/orgs", response_model=list[OrgMembershipResponse])
async def list_my_orgs(
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
):
    rows = await db.fetch(
        """
        SELECT o.id::text, o.name, o.slug, o.plan, o.created_at::text, om.role
        FROM orgs o
        JOIN org_members om ON om.org_id = o.id
        WHERE om.user_id = $1
        ORDER BY om.created_at ASC
        """,
        auth.user_id,
    )
    return [
        OrgMembershipResponse(
            id=row["id"],
            name=row["name"],
            slug=row["slug"],
            plan=row["plan"],
            created_at=row["created_at"],
            role=row["role"],
        )
        for row in rows
    ]


@router.get("/orgs/me", response_model=OrgResponse)
async def get_my_org(
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    row = await db.fetchrow(
        """
        SELECT o.id::text, o.name, o.slug, o.plan, o.created_at::text, om.role
        FROM orgs o
        JOIN org_members om ON om.org_id = o.id
        WHERE om.org_id = $1::uuid AND om.user_id = $2
        LIMIT 1
        """,
        membership.org_id,
        membership.user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="No organization found")

    return OrgResponse(
        id=row["id"],
        name=row["name"],
        slug=row["slug"],
        plan=row["plan"],
        created_at=row["created_at"],
        role=row["role"],
    )


@router.get("/orgs/me/members", response_model=list[OrgMemberResponse])
async def list_members(
    membership: OrgMembership = Depends(require_org_membership),
    db: DB = None,
):
    rows = await db.fetch(
        """
        SELECT user_id, email, role, created_at::text
        FROM org_members
        WHERE org_id = $1::uuid
        ORDER BY created_at ASC
        """,
        membership.org_id,
    )
    return [
        OrgMemberResponse(
            user_id=row["user_id"],
            email=row["email"],
            role=row["role"],
            created_at=row["created_at"],
        )
        for row in rows
    ]


@router.post("/orgs/me/invitations", response_model=OrgInvitationResponse, status_code=201)
async def invite_member(
    body: InviteMemberRequest,
    membership: OrgMembership = Depends(require_org_roles("owner", "admin")),
    db: DB = None,
):
    role = body.role
    if membership.role == "admin" and role == "owner":
        raise HTTPException(status_code=403, detail="Only owners can invite owners")

    email = body.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    existing_member = await db.fetchrow(
        """
        SELECT user_id FROM org_members
        WHERE org_id = $1::uuid AND lower(email) = $2
        LIMIT 1
        """,
        membership.org_id,
        email,
    )
    if existing_member:
        raise HTTPException(status_code=409, detail=f"{email} is already a member of this organization")

    token = secrets.token_urlsafe(24)
    row = await db.fetchrow(
        """
        INSERT INTO org_invitations (org_id, email, role, token, invited_by)
        VALUES ($1::uuid, $2, $3, $4, $5)
        ON CONFLICT (org_id, email) WHERE accepted_at IS NULL
        DO UPDATE SET role = EXCLUDED.role, token = EXCLUDED.token, invited_by = EXCLUDED.invited_by,
                      expires_at = now() + interval '7 days', created_at = now()
        RETURNING id::text, email, role, token, invited_by, created_at::text,
                  expires_at::text, accepted_at::text
        """,
        membership.org_id,
        email,
        role,
        token,
        membership.user_id,
    )

    return OrgInvitationResponse(
        id=row["id"],
        email=row["email"],
        role=row["role"],
        token=row["token"],
        invited_by=row["invited_by"],
        created_at=row["created_at"],
        expires_at=row["expires_at"],
        accepted_at=row["accepted_at"],
    )


@router.get("/orgs/me/invitations", response_model=list[OrgInvitationResponse])
async def list_invitations(
    membership: OrgMembership = Depends(require_org_roles("owner", "admin")),
    db: DB = None,
):
    rows = await db.fetch(
        """
        SELECT id::text, email, role, token, invited_by, created_at::text,
               expires_at::text, accepted_at::text
        FROM org_invitations
        WHERE org_id = $1::uuid
        ORDER BY created_at DESC
        """,
        membership.org_id,
    )

    return [
        OrgInvitationResponse(
            id=row["id"],
            email=row["email"],
            role=row["role"],
            token=row["token"],
            invited_by=row["invited_by"],
            created_at=row["created_at"],
            expires_at=row["expires_at"],
            accepted_at=row["accepted_at"],
        )
        for row in rows
    ]


@router.post("/orgs/me/invitations/accept")
async def accept_invitation(
    body: AcceptInvitationRequest,
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
):
    invitation = await db.fetchrow(
        """
        SELECT id::text, org_id::text, email, role, accepted_at::text, expires_at
        FROM org_invitations
        WHERE token = $1
        LIMIT 1
        """,
        body.token.strip(),
    )
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invitation["accepted_at"] is not None:
        raise HTTPException(status_code=409, detail="Invitation already accepted")
    if invitation["expires_at"] is not None:
        now_row = await db.fetchrow("SELECT now()::timestamptz AS now")
        if invitation["expires_at"] < now_row["now"]:
            raise HTTPException(status_code=410, detail="Invitation expired")

    existing = await db.fetchrow(
        """
        SELECT role
        FROM org_members
        WHERE org_id = $1::uuid AND user_id = $2
        LIMIT 1
        """,
        invitation["org_id"],
        auth.user_id,
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already a member of this organization")

    await db.execute(
        """
        INSERT INTO org_members (org_id, user_id, role, email)
        VALUES ($1::uuid, $2, $3, $4)
        """,
        invitation["org_id"],
        auth.user_id,
        invitation["role"],
        invitation["email"],
    )
    await db.execute(
        """
        UPDATE org_invitations
        SET accepted_by = $1, accepted_at = now()
        WHERE id = $2::uuid
        """,
        auth.user_id,
        invitation["id"],
    )

    return {"status": "accepted"}


@router.get("/orgs/invitations/pending", response_model=list[UserPendingInvitationResponse])
async def list_my_pending_invitations(
    email: str | None = None,
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
):
    lookup_email = auth.email or (email.strip().lower() if email else None)
    if not lookup_email:
        return []

    rows = await db.fetch(
        """
        SELECT i.id::text, i.org_id::text, o.name AS org_name, o.slug AS org_slug,
               i.email, i.role, i.token, i.invited_by, i.created_at::text, i.expires_at::text
        FROM org_invitations i
        JOIN orgs o ON o.id = i.org_id
        WHERE lower(i.email) = lower($1)
          AND i.accepted_at IS NULL
          AND i.expires_at > now()
        ORDER BY i.created_at DESC
        """,
        lookup_email,
    )

    return [
        UserPendingInvitationResponse(
            id=row["id"],
            org_id=row["org_id"],
            org_name=row["org_name"],
            org_slug=row["org_slug"],
            email=row["email"],
            role=row["role"],
            token=row["token"],
            invited_by=row["invited_by"],
            created_at=row["created_at"],
            expires_at=row["expires_at"],
        )
        for row in rows
    ]


@router.delete("/orgs/me/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: str,
    membership: OrgMembership = Depends(require_org_roles("owner", "admin")),
    db: DB = None,
):
    invitation = await db.fetchrow(
        """
        SELECT role
        FROM org_invitations
        WHERE id = $1::uuid AND org_id = $2::uuid
        LIMIT 1
        """,
        invitation_id,
        membership.org_id,
    )
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if membership.role == "admin" and invitation["role"] in {"admin", "owner"}:
        raise HTTPException(status_code=403, detail="Admins cannot revoke this invitation")

    await db.execute(
        "DELETE FROM org_invitations WHERE id = $1::uuid",
        invitation_id,
    )
    return {"status": "revoked"}


@router.patch("/orgs/me/members/{user_id}/role")
async def update_member_role(
    user_id: str,
    body: UpdateMemberRoleRequest,
    membership: OrgMembership = Depends(require_org_roles("owner", "admin")),
    db: DB = None,
):
    next_role = body.role
    target = await db.fetchrow(
        """
        SELECT role
        FROM org_members
        WHERE org_id = $1::uuid AND user_id = $2
        LIMIT 1
        """,
        membership.org_id,
        user_id,
    )
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    if target["role"] == "owner":
        raise HTTPException(status_code=400, detail="Owner role cannot be changed")
    if membership.role == "admin" and next_role in {"owner", "admin"}:
        raise HTTPException(status_code=403, detail="Admins cannot promote to this role")

    await db.execute(
        """
        UPDATE org_members
        SET role = $1
        WHERE org_id = $2::uuid AND user_id = $3
        """,
        next_role,
        membership.org_id,
        user_id,
    )
    return {"status": "updated", "user_id": user_id, "role": next_role}


@router.delete("/orgs/me/members/{user_id}")
async def remove_member(
    user_id: str,
    membership: OrgMembership = Depends(require_org_roles("owner", "admin")),
    db: DB = None,
):
    target = await db.fetchrow(
        """
        SELECT role
        FROM org_members
        WHERE org_id = $1::uuid AND user_id = $2
        LIMIT 1
        """,
        membership.org_id,
        user_id,
    )
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    if target["role"] == "owner":
        raise HTTPException(status_code=400, detail="Owner cannot be removed")
    if membership.role == "admin" and target["role"] == "admin":
        raise HTTPException(status_code=403, detail="Admins cannot remove other admins")

    await db.execute(
        "DELETE FROM org_members WHERE org_id = $1::uuid AND user_id = $2",
        membership.org_id,
        user_id,
    )
    return {"status": "removed"}


@router.delete("/orgs/me")
async def delete_org(
    membership: OrgMembership = Depends(require_org_roles("owner")),
    db: DB = None,
):
    await db.execute("DELETE FROM orgs WHERE id = $1::uuid", membership.org_id)
    return {"status": "deleted"}
