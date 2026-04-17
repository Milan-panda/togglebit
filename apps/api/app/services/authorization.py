import uuid as _uuid
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException

from app.dependencies import DB
from app.services.auth import ClerkAuth, require_clerk


@dataclass
class OrgMembership:
    org_id: str
    user_id: str
    role: str


def _is_uuid(value: str) -> bool:
    try:
        _uuid.UUID(value)
        return True
    except ValueError:
        return False


async def require_org_membership(
    auth: ClerkAuth = Depends(require_clerk),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    db: DB = None,
) -> OrgMembership:
    if x_org_id:
        if _is_uuid(x_org_id):
            row = await db.fetchrow(
                """
                SELECT om.org_id::text, om.role
                FROM org_members om
                WHERE om.user_id = $1 AND om.org_id = $2::uuid
                LIMIT 1
                """,
                auth.user_id,
                x_org_id,
            )
        else:
            row = await db.fetchrow(
                """
                SELECT om.org_id::text, om.role
                FROM org_members om
                JOIN orgs o ON o.id = om.org_id
                WHERE om.user_id = $1 AND o.slug = $2
                LIMIT 1
                """,
                auth.user_id,
                x_org_id,
            )
        if not row:
            raise HTTPException(status_code=403, detail="Not a member of selected organization")
    else:
        row = await db.fetchrow(
            """
            SELECT org_id::text, role
            FROM org_members
            WHERE user_id = $1
            ORDER BY created_at ASC
            LIMIT 1
            """,
            auth.user_id,
        )
    if not row:
        raise HTTPException(status_code=403, detail="Not a member of any organization")
    return OrgMembership(org_id=row["org_id"], user_id=auth.user_id, role=row["role"])


def require_org_roles(*roles: str):
    allowed = set(roles)

    async def _require_role(
        membership: OrgMembership = Depends(require_org_membership),
    ) -> OrgMembership:
        if membership.role not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient organization role")
        return membership

    return _require_role
