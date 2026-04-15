CREATE TABLE IF NOT EXISTS usage (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    month      DATE NOT NULL,
    eval_count BIGINT NOT NULL DEFAULT 0,
    UNIQUE(org_id, month)
);
