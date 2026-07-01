CREATE TABLE IF NOT EXISTS flag_eval_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    flag_id     UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    environment TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    context     JSONB NOT NULL DEFAULT '{}',
    enabled     BOOLEAN NOT NULL,
    reason      TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT 'api',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flag_eval_logs_flag_created
    ON flag_eval_logs (org_id, flag_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flag_eval_logs_flag_env_created
    ON flag_eval_logs (org_id, flag_id, environment, created_at DESC);
