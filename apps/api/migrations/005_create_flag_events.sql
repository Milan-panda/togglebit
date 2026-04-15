CREATE TABLE IF NOT EXISTS flag_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    flag_id     UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    environment TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    action      TEXT NOT NULL,
    old_value   JSONB,
    new_value   JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flag_events_flag_id ON flag_events(flag_id);
CREATE INDEX IF NOT EXISTS idx_flag_events_org_id  ON flag_events(org_id);
