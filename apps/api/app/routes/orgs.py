from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import DB
from app.models.org import CreateOrgRequest, OrgResponse
from app.services.auth import ClerkAuth, require_clerk

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
        INSERT INTO org_members (org_id, user_id, role)
        VALUES ($1::uuid, $2, 'owner')
        """,
        row["id"],
        auth.user_id,
    )

    return OrgResponse(
        id=row["id"],
        name=row["name"],
        slug=row["slug"],
        plan=row["plan"],
        created_at=row["created_at"],
    )


@router.get("/orgs/me", response_model=OrgResponse)
async def get_my_org(
    auth: ClerkAuth = Depends(require_clerk),
    db: DB = None,
):
    row = await db.fetchrow(
        """
        SELECT o.id::text, o.name, o.slug, o.plan, o.created_at::text
        FROM orgs o
        JOIN org_members om ON om.org_id = o.id
        WHERE om.user_id = $1
        LIMIT 1
        """,
        auth.user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="No organization found")

    return OrgResponse(
        id=row["id"],
        name=row["name"],
        slug=row["slug"],
        plan=row["plan"],
        created_at=row["created_at"],
    )
