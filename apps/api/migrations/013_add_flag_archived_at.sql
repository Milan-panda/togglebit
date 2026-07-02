ALTER TABLE flags ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_flags_org_archived
    ON flags (org_id, archived_at)
    WHERE archived_at IS NULL;
