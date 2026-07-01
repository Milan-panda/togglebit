CREATE TABLE IF NOT EXISTS flag_usage_daily (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    flag_id     UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
    environment TEXT NOT NULL,
    day         DATE NOT NULL,
    eval_count  BIGINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, flag_id, environment, day)
);

CREATE INDEX IF NOT EXISTS idx_flag_usage_daily_org_flag_env_day
    ON flag_usage_daily (org_id, flag_id, environment, day);

