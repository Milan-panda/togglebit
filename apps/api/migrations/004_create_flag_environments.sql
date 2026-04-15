CREATE TABLE IF NOT EXISTS flag_environments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_id     UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    environment TEXT NOT NULL,
    enabled     BOOLEAN NOT NULL DEFAULT false,
    rollout_pct INTEGER NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
    rules       JSONB NOT NULL DEFAULT '[]',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  TEXT NOT NULL,
    UNIQUE(flag_id, environment)
);

CREATE INDEX IF NOT EXISTS idx_flag_envs_flag_env ON flag_environments(flag_id, environment);
CREATE INDEX IF NOT EXISTS idx_flag_envs_org_env  ON flag_environments(org_id, environment);
