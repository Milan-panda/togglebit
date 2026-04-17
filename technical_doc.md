# Togglebit — Technical Product Document

> Note: this planning document predates the final product rename in a few sections. Runtime setup and developer workflows should follow `README.md` and `.env.example`.

> Feature flags built for Next.js teams. Ship safely, roll out gradually, kill instantly.

---

## Table of Contents

1. [Product Positioning](#1-product-positioning)
2. [Market & Competitive Landscape](#2-market--competitive-landscape)
3. [System Architecture](#3-system-architecture)
4. [Database Models](#4-database-models)
5. [Redis Caching Strategy](#5-redis-caching-strategy)
6. [Flag Evaluation Algorithm](#6-flag-evaluation-algorithm)
7. [API Reference](#7-api-reference)
8. [SDK Design](#8-sdk-design)
9. [Billing & Pricing](#9-billing--pricing)
10. [10-Week Build Plan](#10-10-week-build-plan)
11. [Key Metrics](#11-key-metrics)
12. [Risk Register](#12-risk-register)

---

## 1. Product Positioning

### The problem

Teams need to ship features safely — toggle them on/off without redeploying, roll out to a percentage of users, or enable only for specific segments. Existing tools (LaunchDarkly, Split.io) are expensive and built for enterprise procurement cycles, not individual developers.

Free open-source alternatives (Unleash, Flagsmith) exist but require self-hosting, ops overhead, and were built before Next.js App Router existed.

### The positioning

**Not** "cheap LaunchDarkly." That's a race to the bottom against free open-source tools.

**Yes** — "the feature flag SDK that Next.js developers actually finish integrating."

The moat is developer experience, not features. Specifically:

- Native Next.js App Router support (server components, edge runtime, streaming SSR)
- TypeScript-first — flag keys as typed unions, not raw strings
- Under 3kb browser bundle
- Zero-to-working-flag in under 5 minutes
- Same-day GitHub issue responses

### Why incumbents can't fix this

| Problem | LaunchDarkly | You |
|---|---|---|
| Legacy API surface | SDK written in 2014, can't break existing integrations | Greenfield — no legacy |
| Wrong incentive | VP signs the contract, not the dev using it daily | You are the target user |
| Too many SDKs | 20+ SDKs = mediocre at all of them | Go deep on one (Next.js) |
| SDK is a cost centre | Low priority vs sales + compliance teams | It's your entire product |
| App Router is new | Rethinking takes 6–12 months they won't prioritise | Build for it from day one |

---

## 2. Market & Competitive Landscape

### Direct competitors

| Tool | Pricing | SDKs | Self-hosted | App Router support |
|---|---|---|---|---|
| LaunchDarkly | $10–20/seat/mo | 20+ | No | Partial |
| Split.io | ~$33/seat/mo | 15+ | No | Partial |
| Unleash | Free (self-host) / $80/mo cloud | 14 | Yes | None |
| Flagsmith | Free (self-host) / $45/mo cloud | 12+ | Yes | None |
| PostHog Flags | Free tier / $450/mo | 10+ | Yes | Partial |
| **FlagPilot** | **$0 / $29 / $79/mo** | **JS/TS + Python v1** | **Roadmap** | **Native** |

### The real competitive threat

Unleash and Flagsmith are free. Price alone is not a differentiator. The differentiator is:

1. No self-hosting required — cloud-native from day one
2. App Router native SDK — the thing none of them have
3. DX quality — typed, lean, fast

---

## 3. System Architecture

### High-level overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Customer's Next.js App                                         │
│                                                                 │
│  import { useFlag, getFlag } from 'flagpilot'                   │
│  const darkMode = useFlag('dark-mode', { userId })              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP GET /api/v1/flags/:key
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  FlagPilot Cloud                                                │
│                                                                 │
│  ┌────────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │  Next.js App   │    │  FastAPI     │    │  PostgreSQL    │  │
│  │  (Dashboard)   │───▶│  (Eval API)  │───▶│  (Source of   │  │
│  │                │    │              │    │   truth)       │  │
│  └────────────────┘    └──────┬───────┘    └────────────────┘  │
│                               │                                 │
│                        ┌──────▼───────┐                        │
│                        │    Redis     │                        │
│                        │  (Flag cache │                        │
│                        │   <2ms reads)│                        │
│                        └──────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Tech stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind + shadcn/ui | Dogfood your own stack |
| Backend | FastAPI (Python) | Fast to build, async-native, great for REST APIs |
| Database | PostgreSQL (via Supabase or RDS) | Relational, auditable, battle-tested |
| Cache | Redis (Upstash for serverless-friendly) | Sub-2ms flag reads |
| Auth | Clerk | Skip building auth — saves 3 weeks |
| Payments | Stripe | Checkout + webhooks + billing portal |
| Deployment | Railway (v1) → AWS ECS (v2) | Start simple, migrate when revenue justifies it |
| SDK bundler | tsup | Produces ESM + CJS + .d.ts from one config |

---

## 4. Database Models

### `orgs` table

```sql
CREATE TABLE orgs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,         -- used in SDK API key
  plan        TEXT NOT NULL DEFAULT 'free', -- 'free' | 'starter' | 'pro'
  stripe_customer_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `org_members` table

```sql
CREATE TABLE org_members (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id   UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id  TEXT NOT NULL,                  -- Clerk user ID
  role     TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'admin' | 'member'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);
```

### `flags` table

```sql
CREATE TABLE flags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  key          TEXT NOT NULL,              -- e.g. 'dark-mode' (URL-safe slug)
  name         TEXT NOT NULL,              -- Human readable
  description  TEXT,
  type         TEXT NOT NULL DEFAULT 'boolean', -- 'boolean' | 'percentage' | 'segment'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   TEXT NOT NULL,             -- Clerk user ID
  UNIQUE(org_id, key)
);
```

### `flag_environments` table

```sql
-- One row per flag per environment. Environments are 'dev' | 'staging' | 'prod'.
CREATE TABLE flag_environments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id      UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  environment  TEXT NOT NULL,             -- 'dev' | 'staging' | 'prod'
  enabled      BOOLEAN NOT NULL DEFAULT false,
  rollout_pct  INTEGER NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  -- Segment rules (JSON array, evaluated left-to-right, first match wins)
  -- Example: [{"attribute": "plan", "operator": "eq", "value": "pro"}]
  rules        JSONB NOT NULL DEFAULT '[]',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   TEXT NOT NULL,             -- Clerk user ID
  UNIQUE(flag_id, environment)
);
```

### `flag_events` (audit log — never delete rows)

```sql
CREATE TABLE flag_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  flag_id     UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  environment TEXT NOT NULL,
  user_id     TEXT NOT NULL,              -- who made the change
  action      TEXT NOT NULL,             -- 'created' | 'enabled' | 'disabled' | 'updated' | 'deleted'
  old_value   JSONB,                     -- snapshot before change
  new_value   JSONB,                     -- snapshot after change
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_flag_events_flag_id ON flag_events(flag_id);
CREATE INDEX idx_flag_events_org_id  ON flag_events(org_id);
```

### `api_keys` table

```sql
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  environment TEXT NOT NULL,             -- key is scoped to one environment
  key_hash    TEXT NOT NULL UNIQUE,      -- bcrypt hash of the actual key
  key_prefix  TEXT NOT NULL,            -- first 8 chars shown in UI (e.g. 'fp_prod_')
  name        TEXT NOT NULL,            -- 'Production key', 'CI key', etc.
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  TEXT NOT NULL
);
```

### `usage` table

```sql
-- Tracks eval counts per org per month for billing enforcement
CREATE TABLE usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  month       DATE NOT NULL,             -- First day of month (e.g. 2024-01-01)
  eval_count  BIGINT NOT NULL DEFAULT 0,
  UNIQUE(org_id, month)
);

-- Increment on each eval (use Redis counter + periodic flush to avoid DB hammering)
```

### Key indexes

```sql
CREATE INDEX idx_flags_org_key         ON flags(org_id, key);
CREATE INDEX idx_flag_envs_flag_env    ON flag_environments(flag_id, environment);
CREATE INDEX idx_flag_envs_org_env     ON flag_environments(org_id, environment);
CREATE INDEX idx_api_keys_key_hash     ON api_keys(key_hash);
```

---

## 5. Redis Caching Strategy

### Cache key structure

```
flag:{org_id}:{environment}:{flag_key}

# Example
flag:org_abc123:prod:dark-mode
```

### Cache value (JSON string)

```json
{
  "type": "percentage",
  "enabled": true,
  "rollout_pct": 30,
  "rules": []
}
```

### TTL

- Default TTL: **300 seconds (5 minutes)**
- On flag toggle/update: **immediate `DEL`** — do not wait for TTL expiry
- After cache miss: re-warm from Postgres with fresh 300s TTL

### Cache lifecycle

```python
# On flag evaluation
async def get_flag_config(org_id, env, key):
    cache_key = f"flag:{org_id}:{env}:{key}"

    # 1. Try Redis first
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # 2. Cache miss — read Postgres
    flag = await db.fetchrow("""
        SELECT fe.enabled, fe.rollout_pct, fe.rules, f.type
        FROM flag_environments fe
        JOIN flags f ON f.id = fe.flag_id
        JOIN api_keys ak ON ak.org_id = f.org_id
        WHERE f.org_id = $1 AND fe.environment = $2 AND f.key = $3
    """, org_id, env, key)

    if not flag:
        return None

    # 3. Write to Redis, re-warm cache
    value = json.dumps(dict(flag))
    await redis.set(cache_key, value, ex=300)

    return flag

# On flag update (dashboard toggle)
async def invalidate_flag(org_id, env, key):
    cache_key = f"flag:{org_id}:{env}:{key}"
    await redis.delete(cache_key)
    # Next eval request will be a cache miss → re-warms automatically
```

### Eval count tracking (avoid DB write per request)

```python
# Increment a Redis counter, flush to Postgres every 60 seconds
async def track_eval(org_id: str):
    month = date.today().replace(day=1).isoformat()
    await redis.incr(f"evals:{org_id}:{month}")

# Background job — runs every 60s
async def flush_eval_counts():
    async for key in redis.scan_iter("evals:*"):
        count = await redis.getdel(key)
        _, org_id, month = key.split(":")
        await db.execute("""
            INSERT INTO usage (org_id, month, eval_count)
            VALUES ($1, $2, $3)
            ON CONFLICT (org_id, month)
            DO UPDATE SET eval_count = usage.eval_count + EXCLUDED.eval_count
        """, org_id, month, int(count))
```

---

## 6. Flag Evaluation Algorithm

### Boolean flag

```python
def evaluate_boolean(flag_env) -> bool:
    return flag_env["enabled"]
```

### Percentage rollout (consistent hashing)

The key insight: use a hash, not `random()`. The same user must always land in the same bucket, every request, forever — otherwise they'd see features flickering on and off.

```python
import hashlib

def evaluate_percentage(flag_env, flag_key: str, user_id: str) -> bool:
    if not flag_env["enabled"]:
        return False

    # Seed combines flag key + user ID
    # The flag key is included so the same user doesn't always get
    # the same 30% of flags — each flag has an independent distribution
    seed = f"{flag_key}:{user_id}"

    # MD5 is fine here — this is not security, it's distribution
    h = hashlib.md5(seed.encode()).hexdigest()

    # Convert first 8 hex chars to int, map to 0–99
    bucket = int(h[:8], 16) % 100

    return bucket < flag_env["rollout_pct"]

# Example
# flag_key = "dark-mode", user_id = "user_123"
# seed     = "dark-mode:user_123"
# md5      = "5d41402abc4b2a76b9719d911017c592"
# int      = 1565909538
# bucket   = 1565909538 % 100 = 38
# 38 < 30? → False → flag is OFF for this user
```

### Segment targeting

```python
def evaluate_segment(flag_env, user_context: dict) -> bool:
    if not flag_env["enabled"]:
        return False

    rules = flag_env.get("rules", [])

    # If no rules, flag is enabled for all users
    if not rules:
        return True

    # Rules are AND'd together (all must match)
    for rule in rules:
        attribute = rule["attribute"]          # e.g. "plan"
        operator  = rule["operator"]           # e.g. "eq", "neq", "in", "contains"
        value     = rule["value"]              # e.g. "pro"
        user_val  = user_context.get(attribute)

        if not match_rule(operator, user_val, value):
            return False

    return True

def match_rule(operator: str, user_val, rule_val) -> bool:
    match operator:
        case "eq":       return user_val == rule_val
        case "neq":      return user_val != rule_val
        case "in":       return user_val in rule_val         # rule_val is a list
        case "not_in":   return user_val not in rule_val
        case "contains": return rule_val in str(user_val)
        case "gt":       return float(user_val) > float(rule_val)
        case "lt":       return float(user_val) < float(rule_val)
        case _:          return False
```

### Evaluation order (combined flags)

```python
async def evaluate_flag(flag_key: str, user_id: str, user_context: dict,
                         org_id: str, env: str) -> bool:
    config = await get_flag_config(org_id, env, flag_key)

    if not config:
        return False  # Flag doesn't exist → default OFF

    match config["type"]:
        case "boolean":    return evaluate_boolean(config)
        case "percentage": return evaluate_percentage(config, flag_key, user_id)
        case "segment":    return evaluate_segment(config, user_context)
        case _:            return False
```

---

## 7. API Reference

### Authentication

All API requests require an `Authorization` header:

```
Authorization: Bearer fp_prod_your_api_key_here
```

Keys are scoped to one environment (`dev`, `staging`, `prod`).

---

### Flag evaluation endpoint

This is the hot path. Every SDK call hits this. Optimise relentlessly.

```
GET /api/v1/flags/:key
```

**Query parameters**

| Parameter | Required | Description |
|---|---|---|
| `userId` | Yes (for percentage/segment) | The end user's ID |
| `context` | No | JSON-encoded user attributes for segment targeting |

**Example request**

```bash
curl https://api.flagpilot.dev/api/v1/flags/dark-mode \
  -H "Authorization: Bearer fp_prod_abc123" \
  -G \
  -d "userId=user_456" \
  -d 'context={"plan":"pro","country":"US"}'
```

**Response**

```json
{
  "flag":        "dark-mode",
  "enabled":     true,
  "reason":      "percentage_rollout",
  "latency_ms":  3
}
```

**Reason values:** `"boolean"` | `"percentage_rollout"` | `"segment_match"` | `"flag_disabled"` | `"flag_not_found"`

**Latency targets**

| Path | Target |
|---|---|
| Redis hit | < 5ms p99 |
| Redis miss (Postgres read) | < 20ms p99 |
| Full round trip (SDK in browser) | < 50ms p99 |

---

### Flag management endpoints (dashboard use)

```
GET    /api/v1/flags                  # List all flags for org+env
POST   /api/v1/flags                  # Create a flag
GET    /api/v1/flags/:key             # Get one flag (all envs)
PATCH  /api/v1/flags/:key/environments/:env   # Update flag in one env
DELETE /api/v1/flags/:key             # Delete flag (all envs)
```

**Create flag body**

```json
{
  "key":         "dark-mode",
  "name":        "Dark mode",
  "description": "Enable dark mode UI for users",
  "type":        "percentage",
  "environments": {
    "dev":     { "enabled": true,  "rollout_pct": 100 },
    "staging": { "enabled": true,  "rollout_pct": 50  },
    "prod":    { "enabled": false, "rollout_pct": 0   }
  }
}
```

**Update environment body**

```json
{
  "enabled":     true,
  "rollout_pct": 30,
  "rules":       [{ "attribute": "plan", "operator": "eq", "value": "pro" }]
}
```

Every `PATCH` and `DELETE` automatically:
1. Writes a row to `flag_events` (audit log)
2. Calls `redis.delete(cache_key)` to invalidate cache

---

## 8. SDK Design

### Package structure

```
flagpilot/
├── src/
│   ├── client.ts          # FlagPilot client class (singleton)
│   ├── hooks.tsx          # React hooks (useFlag, useFlagVariant)
│   ├── server.ts          # Server-side eval (getFlag, getFlagVariant)
│   ├── cache.ts           # In-memory LRU cache
│   ├── types.ts           # All TypeScript types
│   └── index.ts           # Public exports
├── tsconfig.json
├── tsup.config.ts         # Builds ESM + CJS + .d.ts
└── package.json
```

### tsup config (produces ESM + CJS + types)

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry:  ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts:    true,
  splitting:   false,
  sourcemap:   true,
  clean:       true,
  treeshake:   true,
  minify:      true,
  external:    ['react'],
  esbuildOptions(options) {
    options.banner = { js: '"use client"' }
  }
})
```

### TypeScript-first: typed flag keys

The biggest DX upgrade over every competitor. Flag keys are a typed union — no typos, full autocomplete.

```typescript
// types.ts — generated from your flag list (or defined manually)
export type FlagKey =
  | 'dark-mode'
  | 'new-checkout'
  | 'ai-assistant'
  | 'beta-dashboard'

export interface FlagContext {
  userId:  string
  plan?:   'free' | 'starter' | 'pro'
  country?: string
  email?:  string
  [key: string]: string | undefined
}

export interface FlagPilotConfig {
  apiKey:      string
  environment: 'dev' | 'staging' | 'prod'
  cacheTtl?:   number   // seconds, default 30
  baseUrl?:    string   // override for self-hosted
  defaultValue?: boolean // returned on eval error, default false
}
```

### Client class

```typescript
// client.ts
import { FlagKey, FlagContext, FlagPilotConfig } from './types'
import { LRUCache } from './cache'

class FlagPilotClient {
  private config:  FlagPilotConfig
  private cache:   LRUCache<string, boolean>

  constructor(config: FlagPilotConfig) {
    this.config = config
    this.cache  = new LRUCache({ max: 500, ttl: (config.cacheTtl ?? 30) * 1000 })
  }

  async evaluate(key: FlagKey, context: FlagContext): Promise<boolean> {
    const cacheKey = `${key}:${context.userId}`

    // 1. In-memory cache hit
    const cached = this.cache.get(cacheKey)
    if (cached !== undefined) return cached

    // 2. Fetch from eval API
    try {
      const params = new URLSearchParams({
        userId:  context.userId,
        context: JSON.stringify(context),
      })

      const res = await fetch(
        `${this.config.baseUrl ?? 'https://api.flagpilot.dev'}/api/v1/flags/${key}?${params}`,
        {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
          next:    { revalidate: 30 },  // Next.js fetch cache
        }
      )

      if (!res.ok) return this.config.defaultValue ?? false

      const { enabled } = await res.json()
      this.cache.set(cacheKey, enabled)
      return enabled
    } catch {
      // Fail open — never break the customer's app
      return this.config.defaultValue ?? false
    }
  }
}

// Singleton — one instance per process
let instance: FlagPilotClient | null = null

export function getClient(config: FlagPilotConfig): FlagPilotClient {
  if (!instance) instance = new FlagPilotClient(config)
  return instance
}
```

### React hooks (client components)

```typescript
// hooks.tsx
'use client'

import { useState, useEffect } from 'react'
import { FlagKey, FlagContext } from './types'
import { getClient } from './client'

export function useFlag(key: FlagKey, context: FlagContext): boolean {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    getClient(/* config from context */)
      .evaluate(key, context)
      .then(setEnabled)
  }, [key, context.userId])

  return enabled
}
```

### Server-side evaluation (server components + edge)

```typescript
// server.ts
// No 'use client' — this runs on server and edge

import { FlagKey, FlagContext, FlagPilotConfig } from './types'

export async function getFlag(
  key:     FlagKey,
  context: FlagContext,
  config:  FlagPilotConfig
): Promise<boolean> {
  const params = new URLSearchParams({
    userId:  context.userId,
    context: JSON.stringify(context),
  })

  try {
    const res = await fetch(
      `${config.baseUrl ?? 'https://api.flagpilot.dev'}/api/v1/flags/${key}?${params}`,
      {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        next:    { revalidate: 30 },
      }
    )

    if (!res.ok) return false
    const { enabled } = await res.json()
    return enabled
  } catch {
    return false
  }
}
```

### Usage in Next.js App Router

```typescript
// app/layout.tsx — Server Component
import { getFlag } from 'flagpilot/server'

export default async function Layout({ children }) {
  const darkMode = await getFlag('dark-mode', {
    userId: session.userId,
    plan:   session.plan,
  }, {
    apiKey:      process.env.FLAGPILOT_API_KEY!,
    environment: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
  })

  return (
    <html className={darkMode ? 'dark' : ''}>
      <body>{children}</body>
    </html>
  )
}

// app/checkout/page.tsx — Client Component
'use client'
import { useFlag } from 'flagpilot'

export default function CheckoutPage() {
  const newCheckout = useFlag('new-checkout', { userId: user.id })

  return newCheckout ? <NewCheckout /> : <LegacyCheckout />
}
```

### Provider setup (one-time in root layout)

```typescript
// app/providers.tsx
'use client'
import { FlagPilotProvider } from 'flagpilot'

export function Providers({ children }) {
  return (
    <FlagPilotProvider
      apiKey={process.env.NEXT_PUBLIC_FLAGPILOT_KEY!}
      environment="prod"
      cacheTtl={30}
    >
      {children}
    </FlagPilotProvider>
  )
}
```

---

## 9. Billing & Pricing

### Tiers

| | Free | Starter | Pro |
|---|---|---|---|
| **Price** | $0 | $29/mo | $79/mo |
| **Flags** | 5 | 50 | Unlimited |
| **Environments** | 1 (dev only) | 3 | Unlimited |
| **Evaluations/mo** | 100,000 | 5,000,000 | Unlimited |
| **Team seats** | 1 | 5 | Unlimited |
| **Audit log** | 7 days | 90 days | 1 year |
| **Support** | Community | Email | Priority |

**Key pricing decisions:**
- Flat pricing, not per-seat — developers hate per-seat pricing
- Starter at $29 = 40 customers → $1,160 MRR (first meaningful milestone)
- No usage overage charges on Pro — teams don't want surprise bills

### Stripe integration

```python
# Stripe events to handle
WEBHOOK_EVENTS = [
  'checkout.session.completed',    # → upgrade org plan
  'customer.subscription.updated', # → plan change
  'customer.subscription.deleted', # → downgrade to free
  'invoice.payment_failed',        # → email warning, grace period
]
```

### Free tier enforcement

```python
async def check_usage_limit(org_id: str) -> bool:
    org = await db.fetchrow("SELECT plan FROM orgs WHERE id = $1", org_id)
    if org["plan"] != "free":
        return True  # Paid plans not limited

    month = date.today().replace(day=1)
    usage = await db.fetchrow(
        "SELECT eval_count FROM usage WHERE org_id = $1 AND month = $2",
        org_id, month
    )

    return (usage["eval_count"] if usage else 0) < 100_000
```

---

## 10. 10-Week Build Plan

> Full-time execution. One developer. Target: working, chargeable product in 5 weeks, first 50 users by week 8.

### Phase 1 — Build (Weeks 1–5)

#### Week 1–2: SDK first

The SDK is the product. Build it before the dashboard exists.

- [ ] Create npm package with TypeScript + tsup
- [ ] `useFlag(key, context)` — client component hook
- [ ] `getFlag(key, context, config)` — server component / edge function
- [ ] In-memory LRU cache with configurable TTL
- [ ] Graceful fallback — API down → return default, never throw
- [ ] Works on Vercel edge runtime (no Node-only APIs)
- [ ] Publish to npm (`npm publish`)

**Milestone:** `npm install flagpilot` works. Hardcoded flags return correct values. Zero crashes.

#### Week 3: Eval API + Redis

- [ ] PostgreSQL schema (all tables from Section 4)
- [ ] FastAPI project scaffold + Dockerfile
- [ ] `GET /api/v1/flags/:key` — the eval endpoint
- [ ] API key validation (hash comparison, not plaintext)
- [ ] Redis caching layer (hit < 2ms, miss < 15ms)
- [ ] Percentage rollout eval logic (consistent hash)
- [ ] Deploy to Railway (not AWS yet — too much config)

**Milestone:** Full round trip. SDK in a Next.js app hits real API, gets real value. No dashboard yet.

#### Week 4: Minimal dashboard

- [ ] Clerk auth (sign up, sign in, org creation)
- [ ] Flag list page (see all flags, toggle on/off, env status chips)
- [ ] Create flag form (key, name, type, rollout %)
- [ ] Toggle → immediate Redis invalidation
- [ ] API key management page (generate, copy, revoke)
- [ ] Quickstart page (code snippet pre-filled with their key)

**Milestone:** Full user journey works end-to-end. Sign up → create flag → get key → integrate SDK → see flag.

#### Week 5: Stripe + audit log

- [ ] Stripe Checkout (free auto, paid upgrade flow)
- [ ] Stripe webhook handler (plan sync)
- [ ] Free tier enforcement (eval count check before processing)
- [ ] Audit log page (flag_events, filterable by flag + environment)
- [ ] Usage counter (Redis incr → periodic flush to Postgres)
- [ ] Billing portal link (Stripe customer portal)

**Milestone:** Real money can flow. User can upgrade with a credit card.

---

### Gate: Private beta test

> Before any public launch — give the SDK to 5 Next.js developers. Watch them integrate without your help. Fix everything they get confused by. Target: zero-to-working-flag in under 10 minutes.

---

### Phase 2 — Launch (Weeks 6–8)

#### Week 6–7: Earn your first 50 users

- [ ] Write "I built a Next.js-native feature flag SDK" — dev.to + Hashnode
- [ ] Post in Next.js Discord, Theo's T3 community, Vercel community
- [ ] Show HN: "Ask HN: Feature flags that work natively with Next.js App Router"
- [ ] Product Hunt launch (prepare Tuesday 12am PST, have hunter lined up)
- [ ] DM 20 people who starred Unleash / Flagsmith on GitHub — personal outreach
- [ ] Record 4-minute demo video: zero to working flag in Next.js

**Success metric:** 50 signups. 10+ have evaluated a real flag in production.

#### Week 8: Talk to every user

- [ ] Email every user who evaluated a flag — offer 20-min call
- [ ] Watch 3 people integrate on Loom (silent observation, no help)
- [ ] Ask: what made you sign up? what almost stopped you? what's missing?
- [ ] Find the one feature 7/10 people ask for — build only that

**What you're looking for:** One sentence that explains why someone chose FlagPilot over Unleash (free). If you can't find it, the product needs work.

---

### Phase 3 — Learn & Decide (Weeks 9–10)

By week 9, you'll have real data. Choose:

| Signal | Path |
|---|---|
| People love it, some paying | Indie SaaS — push for 10 paid customers, raise prices |
| Companies (not solo devs) want it | Fundable — write market thesis, talk to YC |
| It's a great portfolio piece | Job at Vercel, PostHog, Linear — this is your best application |

---

## 11. Key Metrics

### Product metrics (track from day one)

| Metric | Target | Why |
|---|---|---|
| Time to first flag evaluation | < 10 min | If they don't eval a flag quickly, they churn |
| Week-1 retention | > 60% | Came back after signup |
| Flag eval p99 latency | < 5ms | Your technical marketing claim |
| Monthly churn (once PMF) | < 2% | Sticky = good product |

### Revenue milestones

| Month | MRR target | How |
|---|---|---|
| 3 | $1,000 | ~35 Starter customers |
| 6 | $5,000 | Mix of Starter + Pro |
| 9 | $10,000 | First enterprise conversations |
| 12 | $20,000 | Start of scale |

### North star

> Number of orgs that evaluated at least one flag in production in the last 7 days.

This is the only metric that proves the product is genuinely being used. Signups are vanity. Active flag evaluations in prod are signal.

---

## 12. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Unleash/Flagsmith undercut on price (free) | High | Compete on DX, not price. Make onboarding so smooth they never bother self-hosting |
| SDK adoption lag | High | Ship JS + Python SDKs before public launch. REST API alone won't drive signups |
| Flag eval in critical path — any outage breaks customer apps | High | Redis + SDK local cache = two layers of defence. Target 99.9% uptime from month 1 |
| LaunchDarkly launches App Router SDK | Medium | Ship now — first-mover advantage in this niche matters |
| Redis invalidation race condition | Medium | Test flag-update → eval timing carefully. Use Redis `DEL` not TTL expiry for instant propagation |
| Consistent hash distribution imbalance | Low | Run distribution tests with 10,000 synthetic user IDs — verify ~30% actually land in the rollout bucket for a 30% flag |
| API key leak in customer codebase | Low | Separate server-side keys (full access) from client-side keys (eval only). Never put server keys in browser bundles |

---
