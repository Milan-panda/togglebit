ALTER TABLE org_members
    ADD CONSTRAINT org_members_role_check
    CHECK (role IN ('owner', 'admin', 'developer', 'member'));

CREATE TABLE IF NOT EXISTS org_invitations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    email        TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'developer', 'member')),
    token        TEXT NOT NULL UNIQUE,
    invited_by   TEXT NOT NULL,
    accepted_by  TEXT,
    accepted_at  TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON org_invitations(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invitations_org_email_pending
    ON org_invitations(org_id, email)
    WHERE accepted_at IS NULL;
