# Togglebit — Feature Inventory & Technical Pitch

> Feature flags built natively for Next.js. Ship safely, roll out gradually, kill instantly.

This document is a snapshot of every feature currently implemented in the Togglebit codebase, organized by surface area (SDK, API/backend, Dashboard/frontend) and complemented by a user-journey view of what a user can actually *do* today.

---

## 1. Product at a Glance

Togglebit is a three-tier feature flag platform:

| Tier | Package / Path | Runtime | Purpose |
|---|---|---|---|
| SDK | `packages/sdk` (`togglebit` on npm, v0.1.2) | Browser + Node (Next.js App Router first) | Evaluate flags from customer apps |
| API | `apps/api` | FastAPI on Python 3 | Eval hot path + management CRUD + auth |
| Dashboard | `apps/dashboard` | Next.js 14 App Router | Self-serve management UI for humans |

Storage is Postgres 16 (source of truth) + Redis 7 (eval cache + API-key cache + usage counters). Auth is Clerk (users) and HMAC-hashed API keys (SDK). Everything ships as a single-port nginx-fronted Docker stack.

---

## 2. What a User Can Do Today (End-to-End Journey)

A brand-new user can go from zero to a shipped feature flag in ~60 seconds:

1. **Land on marketing site** — animated conversion landing page (hero, social proof, problem, preview, benefits, how-it-works, testimonials, pricing with monthly/annual toggle, final CTA).
2. **Sign up / sign in** — Clerk-hosted flows at `/sign-in` and `/sign-up`.
3. **Get redirected to onboarding** — the `OrgGate` middleware catches users without an org and sends them to `/onboarding`.
4. **Create an organization** — pick a name, auto-suggested slug, become the `owner`. Or **accept a pending invitation** to an existing org (surfaced automatically by email match).
5. **Invite teammates** — four-role RBAC (owner / admin / developer / member), copyable invite link, 7-day expiry, revoke, change role, remove member.
6. **Switch between organizations** — top-of-sidebar org switcher, persisted in URL via `?org=slug`.
7. **Generate an API key** — name + environment (`dev` / `staging` / `prod`), raw key shown exactly once with copy affordance, HMAC-hashed server-side.
8. **Create a feature flag** — four types supported:
   - `boolean` — simple on/off
   - `percentage` — deterministic hash-bucketed rollout 0–100%
   - `segment` — targeting rules (AND) on arbitrary context attributes
   - `combined` — segment gate + percentage rollout stacked
9. **Tune per environment** — each flag has independent `enabled`, `rollout_pct`, and `rules` for dev / staging / prod, edited on the flag-detail page with a live range slider and rule builder.
10. **Quick-toggle from the flags list** — one-click switch to enable/disable in the selected environment.
11. **Follow the Quickstart** — copy-paste `npm install togglebit`, a Provider snippet, a client-side `useFlag` snippet, and a server-side `getFlag` snippet (API key prefix is pre-filled from the user's real keys).
12. **Switch environments** — sidebar env switcher, synced to `?env=` across routes.
13. **Integrate in their Next.js app** — use the SDK (details in §3). The Togglebit dashboard itself dogfoods the SDK via a badge that only renders when the `nav-refresh` flag is enabled.
14. **Delete or revoke** — revoke API keys, delete flags, delete the org (owner-only danger zone).
15. **Theme & shell polish** — light/dark toggle, collapsible sidebar with `Ctrl/Cmd+B` shortcut, localStorage persistence, mobile drawer with backdrop, responsive layouts throughout.

---

## 3. SDK — `togglebit` (package `packages/sdk`)

### 3.1 Public Surface

| Export | Entry | Description |
|---|---|---|
| `TogglebitProvider` | `togglebit` | React context provider that captures config and eagerly constructs the client |
| `useFlag(key, context)` | `togglebit` | Client-side React hook returning `boolean` |
| `TogglebitClient` | `togglebit` | Imperative, framework-agnostic client class |
| `getClient(config)` | `togglebit` | Singleton-with-signature accessor (avoids reinstantiation per render) |
| `getFlag(key, context, config)` | `togglebit/server` | Zero-dependency server-side helper for RSC/Route Handlers |
| Types | both entries | `FlagKey`, `FlagContext`, `TogglebitConfig`, `EvalResponse` |

Package is published as dual ESM/CJS with TypeScript declarations, React is an *optional peer dependency* (the `/server` entry has zero runtime deps beyond `fetch`).

### 3.2 Features

- **Dual entry points**: `togglebit` for client, `togglebit/server` for RSC — no React in the server path.
- **Hosted-by-default**: `baseUrl` is optional; defaults to the hosted Togglebit origin. Users only need `apiKey` + `environment`.
- **Base URL normalization**: trailing slashes and `/api` collisions (which would double-prefix to `/api/api/v1/...`) are defensively handled.
- **Bearer-token auth**: `Authorization: Bearer tb_<env>_<token>` format.
- **Context propagation**: `userId` (required) + arbitrary string attributes (`plan`, `country`, `email`, …) serialized as a JSON query param.
- **Client-side LRU cache**: hand-rolled `LRUCache` (no npm dep) with configurable `max` (500) and `ttl` (default 30s), keyed on `flagKey + JSON(context)`.
- **Server-side Next.js fetch-cache integration**: on the server, `fetch` is called with `{ next: { revalidate: cacheTtl } }`; on the browser, `{ cache: 'no-store' }` to prevent false positives.
- **Failure-safe defaults**: any network error, non-2xx response, or missing flag falls back to `config.defaultValue ?? false` — the product degrades to "feature off" which is the safe choice.
- **Singleton with config-signature**: `getClient` hashes apiKey + environment + baseUrl + cacheTtl + defaultValue; config changes transparently rebuild the client, preserving cache locality otherwise.
- **React 18/19 compatible**: uses `'use client'` directives and the modern `useState`/`useEffect` cancellation pattern.
- **Small surface, tiny footprint**: `< 2 kb gzipped` (README claim), plain `fetch`, no axios/zod/etc.

### 3.3 Example usage (lifted from the codebase)

```typescript
// Client component
import { useFlag } from 'togglebit'
const darkMode = useFlag('dark-mode', { userId: user.id })

// Server component
import { getFlag } from 'togglebit/server'
const enabled = await getFlag('dark-mode', { userId }, {
  apiKey: process.env.TOGGLEBIT_API_KEY!,
  environment: 'prod',
})
```

---

## 4. Backend / API — `apps/api` (FastAPI)

Mounted under `/api/v1/*` behind nginx. Three logical surfaces: **eval** (hot path), **manage** (CRUD), **orgs** (tenancy). Plus **health**.

### 4.1 Hot Path — Flag Evaluation

`GET /api/v1/eval/flags/{key}?userId=...&context={...}` — authenticated with an API key.

Pipeline:

1. **API-key auth** (`require_api_key`): extract Bearer token, HMAC-SHA256 it with `HMAC_SECRET`, look up in `api_keys` table. **Redis cache of the lookup** with 5-min TTL (`apikey:<hash>` → `{org_id, environment}`). `last_used_at` is updated on miss.
2. **Config cache**: `get_cached_flag(redis, org_id, env, key)` — 5-minute Redis TTL; on miss, joins `flags` + `flag_environments` in a single query.
3. **Evaluation** (`services/eval.py`): branches by flag `type`:
   - `boolean` → returns `enabled`.
   - `percentage` → deterministic bucketing: `md5(flagKey + ":" + userId)[:8]` as int mod 100, compared to `rollout_pct`. Same user always gets the same bucket — sticky rollouts.
   - `segment` → AND-combined rule evaluation over supplied context.
   - `combined` → rule gate first, then percentage bucket.
4. **Rule operators** supported out of the box: `eq`, `neq`, `in`, `not_in`, `contains`, `gt`, `lt`.
5. **Reason codes** returned to the caller: `flag_disabled`, `flag_not_found`, `boolean`, `percentage_rollout`, `segment_match`, `segment_no_match`, `segment_and_percentage`, `unknown_type` — useful for client-side debugging and audits.
6. **Latency header**: every response includes `latency_ms` measured server-side.
7. **Fire-and-forget usage tracking**: `asyncio.create_task(track_eval(org_id))` increments a Redis key `evals:<org_id>:<YYYY-MM-01>` without blocking the response.
8. **Background flush**: a lifespan task runs `flush_eval_counts` every 60s, scanning Redis counters with `SCAN` + `GETDEL` and upserting into the `usage` table (monthly rollups with `ON CONFLICT DO UPDATE`).

### 4.2 Management API — Flags

All routes require a Clerk JWT + `X-Org-Id` header (slug or UUID), and are wrapped in role-based authorization:

| Route | Method | Roles |
|---|---|---|
| `/api/v1/manage/flags?env=...` | GET | any member |
| `/api/v1/manage/flags` | POST | owner / admin / developer |
| `/api/v1/manage/flags/{key}` | GET | any member |
| `/api/v1/manage/flags/{key}/environments/{env}` | PATCH | owner / admin / developer |
| `/api/v1/manage/flags/{key}` | DELETE | owner / admin |

Behaviors:

- **Flag creation** auto-seeds all three default environments (`dev`, `staging`, `prod`) with `enabled=false` and zero rollout.
- **Slug validation** on key: `^[a-z0-9][a-z0-9\-]{0,62}[a-z0-9]$`.
- **Type whitelist** enforced via Pydantic: `boolean | percentage | segment | combined`.
- **Duplicate detection**: returns `409` with human error.
- **Per-environment patch** is field-by-field — passing only `enabled` leaves `rollout_pct` and `rules` intact.
- **Audit log**: every create / update / delete writes to `flag_events` with old and new JSONB values, action label (`created` / `enabled` / `disabled` / `updated` / `deleted`), user id, and environment.
- **Cache invalidation**: on PATCH and DELETE, the Redis entry `flag:<org>:<env>:<key>` is dropped so the next eval recomputes.

### 4.3 Management API — API Keys

| Route | Method | Roles |
|---|---|---|
| `/api/v1/manage/keys` | GET | any member |
| `/api/v1/manage/keys` | POST | owner / admin |
| `/api/v1/manage/keys/{id}` | DELETE | owner / admin |

Behaviors:

- **Key format**: `tb_<environment>_<32-byte urlsafe token>`; the raw key is returned exactly once on creation.
- **Secure at rest**: only the HMAC-SHA256 hash and a 12-character prefix are stored. No way to recover a key once dismissed.
- **Revocation**: deletes the DB row *and* evicts the Redis auth cache entry immediately — no grace period.

### 4.4 Management API — Organizations (multi-tenancy)

| Route | Method | Purpose |
|---|---|---|
| `POST /orgs` | Create an org (caller becomes `owner`) |
| `GET /orgs` | List all orgs the caller is a member of |
| `GET /orgs/me` | Current org details (honors `X-Org-Id`) |
| `GET /orgs/me/members` | List members |
| `POST /orgs/me/invitations` | Create invite (owner/admin; admins can't invite owners) |
| `GET /orgs/me/invitations` | List invitations |
| `POST /orgs/me/invitations/accept` | Accept by token |
| `GET /orgs/invitations/pending` | List pending invites for the signed-in email |
| `DELETE /orgs/me/invitations/{id}` | Revoke invitation |
| `PATCH /orgs/me/members/{user_id}/role` | Change role (guarded against owner-demotion and admin self-promotion) |
| `DELETE /orgs/me/members/{user_id}` | Remove member |
| `DELETE /orgs/me` | Delete org (owner-only, cascades via FK) |

Invitation flow specifics:

- Token is `secrets.token_urlsafe(24)`, stored unique.
- Unique partial index prevents duplicate pending invites per email per org; resending an invite upserts and resets the 7-day expiry.
- Email is normalized lowercase; basic `@` validation.
- On accept, membership row is inserted and the invitation marked `accepted_at`/`accepted_by`.
- Back-fill migration (`009`) copies the invite email onto `org_members.email` so teammates show real addresses in the UI even if Clerk doesn't surface them.

### 4.5 Authentication & Authorization layers

- **`require_clerk`** — verifies Clerk JWT via JWKS (cached), extracts `sub` (user id). Resolves the user's primary email from the JWT; falls back to a live `https://api.clerk.com/v1/users/{id}` lookup using the Clerk secret if the JWT doesn't include it. JWKS URL is derived from the Clerk publishable key or overridden via `CLERK_JWKS_URL`. Returns clear `401` / `503` errors.
- **`require_api_key`** — HMAC compare + Redis cache (described above).
- **`require_org_membership`** — resolves the org from `X-Org-Id` header (accepts UUID or slug) and joins to `org_members`. Without the header, picks the user's oldest org. Returns `403` on non-membership.
- **`require_org_roles(*roles)`** — composes on top of membership; returns `403` with `Insufficient organization role`.

### 4.6 Persistence & Schema

Nine SQL migrations in `apps/api/migrations`:

1. `orgs` — tenant root, `slug` unique, `plan` (default `free`), optional `stripe_customer_id` already hooked for future billing.
2. `org_members` — user_id + role, unique per org.
3. `flags` — per-org `key` uniqueness, `type` default boolean, `created_by` audit field.
4. `flag_environments` — (flag_id, environment) uniqueness, `rollout_pct CHECK 0–100`, `rules JSONB`.
5. `flag_events` — append-only audit log with old/new JSONB.
6. `api_keys` — hashed + prefix + `last_used_at`.
7. `usage` — monthly eval counts per org.
8. Role CHECK constraint (`owner / admin / developer / member`) + `org_invitations` table with partial unique index on pending invites.
9. `org_members.email` column + backfill from accepted invitations.

Indexes are added where they matter: `flags(org_id, key)`, `flag_environments(flag_id, environment)`, `flag_environments(org_id, environment)`, `flag_events(flag_id)`, `flag_events(org_id)`, `api_keys(key_hash)`, `org_invitations(org_id)`.

### 4.7 Runtime & Infra

- **Async Postgres** via `asyncpg` connection pool created on FastAPI lifespan startup, closed on shutdown.
- **Async Redis** via `redis.asyncio` with matching lifespan hooks.
- **Background task**: usage flusher started inside lifespan, cancelled cleanly on shutdown.
- **CORS** locked to `DASHBOARD_URL`, methods `GET/POST/PATCH/DELETE/OPTIONS`, headers `Authorization / Content-Type / X-Org-Id`.
- **Health**: `GET /health` returns `{status, environment}`.
- **Containerized**: own Dockerfile, hot-reload in dev via bind-mount + `uvicorn --reload`.

---

## 5. Frontend — Dashboard (`apps/dashboard`, Next.js 14 App Router)

Stack: **Next.js 14** · **React 19** · **Tailwind CSS** with custom tokens · **shadcn/ui** primitives · **Radix-backed components** · **Clerk** · **Sonner** for toasts · **Lucide icons** · **Geist Sans** font · **Framer Motion** on the landing page.

### 5.1 Route map

- Public: `/` (landing page)
- Auth (Clerk): `/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`
- App group `(app)` — gated by Clerk middleware **and** by `OrgGate` (auto-redirect to onboarding if the user has no org):
  - `/dashboard` — flags list for the active env + create dialog
  - `/flags/[key]` — per-flag detail with three env cards
  - `/flags/new` — reserved route stub
  - `/keys` — API keys list + generation dialog
  - `/quickstart` — personalized copy-paste integration guide
  - `/onboarding` — org creation, invitation acceptance, member/role management, org deletion

Middleware (`middleware.ts`) protects `/dashboard`, `/flags`, `/keys`, `/quickstart`, `/onboarding` with Clerk.

### 5.2 App shell & navigation

- **Collapsible sidebar** with icon-only collapsed mode on desktop; drawer with dark backdrop on mobile.
- `Ctrl/Cmd+B` toggle, `Escape` closes mobile drawer; body scroll locked when drawer is open.
- Collapsed state persisted in `localStorage` under `togglebit.sidebar.collapsed`.
- `OrgSwitcher` fetches orgs via Clerk JWT, reflects current org in `?org=slug`, listens for a custom `orgs-changed` event so newly created orgs appear immediately.
- `EnvSwitcher` mirrors env selection into `?env=` on the current pathname — server components re-render off the URL.
- Header hosts: sidebar toggle, Togglebit dogfood badge, theme toggle (light/dark via `next-themes` style provider), Clerk `<UserButton />`.

### 5.3 Flags UI

- **Flag list** (`FlagTable`): per-row name + key + type badge + "Enabled/Disabled in {env}" label + rollout progress bar (for percentage/combined flags) + segment rule count + inline enable/disable switch. Empty state with custom illustration and copy ("Your first flag is one click away").
- **Create flag dialog**: name → auto-slug → type selector (boolean / percentage / segment / combined) → conditional Initial rollout % input → conditional rule builder for segment flags. All three environments pre-seeded with the chosen config.
- **Flag detail page**: shows name, key, type badge, description, and three side-by-side `EnvCard`s for `dev`, `staging`, `prod` — each with its own enable switch, rollout range slider (with custom gradient track), rule builder, and independent Save button.
- **Rule builder**: add/remove condition rows; each row is `attribute + operator + value`. Seven operators (`equals`, `not equals`, `in`, `not in`, `contains`, `greater than`, `less than`). Responsive: stacked layout on mobile, three-column grid on desktop. Fully disabled when the user lacks manage permission.
- **Flag toggle** from the list performs an optimistic `PATCH /environments/{env}` with toast feedback on success/failure.
- **Delete flag**: destructive action on the detail page with a confirm dialog; returns to dashboard on success.

### 5.4 API Keys UI

- **Keys list** with name, masked prefix, env badge, created-at, and a hover-revealed revoke button with confirm.
- **Generate key dialog**: name + environment → shows the raw key exactly once in a copy-able input, with an amber warning that it won't be shown again. Calls `router.refresh()` after generation to repopulate the list.

### 5.5 Quickstart page

Server-renders the user's highest-privilege API key *prefix* (never the raw key) and injects it into the code snippets so copy-paste is maximally accurate. Three numbered steps, each with a syntax-tagged copy block: `npm install togglebit` → `TogglebitProvider` wrapper → `useFlag` (client) and `getFlag` (server) examples. If no keys exist, shows an amber banner with a CTA to generate one.

### 5.6 Onboarding page — organization hub

- **First-time flow**: if the signed-in email has pending invites, they appear as "Accept" cards at the top. If the user also lands with `?invite=<token>`, a fallback card offers to try the literal token. Otherwise an org-creation form (name → auto-slug) lets them become an owner.
- **Existing-org flow**: shows org meta (name, slug, role badge), invite form (email + role selector constrained by the caller's role — admins cannot invite owners), copyable invite URLs, member list with role select / remove / "you" marker / avatar seeded by email hash, danger-zone delete-org (owner-only).
- **Multi-org**: "Create another organization" collapsible card; firing an `orgs-changed` event refreshes the switcher.

### 5.7 Landing page

A full conversion-optimized landing page (`components/landing/landing-page.tsx`, 666 lines) with motion-animated sections:

- Sticky navbar that compacts on scroll, CTA switches to "Dashboard" for signed-in users.
- Hero, social proof, problem, preview, benefits, how-it-works, testimonials.
- Pricing section with monthly/annual toggle and computed annual-savings label.
- Final CTA.

### 5.8 Client <> API wiring

- `lib/api.ts` centralizes every fetch (flags, keys, orgs, members, invitations) as a typed `api.*` object. Adds `Authorization: Bearer <clerk jwt>` and optional `X-Org-Id`.
- `lib/constants.ts` picks `API_URL` differently per environment: SSR-side it prefers `INTERNAL_API_URL` (Docker network), browser-side it uses `NEXT_PUBLIC_TOGGLEBIT_API_URL` / `NEXT_PUBLIC_API_URL`. Guards against the `/api` double-prefix trap.
- Server components call the API directly via `await auth()` + `getToken()` (RSC data fetching); client components call `useAuth()`.

### 5.9 Dogfooding

The dashboard itself uses the Togglebit SDK. `TogglebitAppProvider` wraps the app when `NEXT_PUBLIC_TOGGLEBIT_API_KEY` is configured, and `TogglebitDogfoodBadge` uses `useFlag` to conditionally render a small UI badge in the header — a built-in demo of the product controlling itself.

### 5.10 Theming & polish

- Dark / light themes with CSS custom properties (`--nav-active-bg`, `--progress-track`, `--progress-fill`, `--code-bg`, `--row-separator`, etc.).
- Subtle radial-gradient background washes on hero cards, flag detail header, sidebar, and empty states.
- Hover lift, focus rings, keyboard shortcuts hint ("Ctrl/Cmd + B") pinned in the sidebar footer.
- Toast feedback for every mutation via `sonner`.

---

## 6. Cross-Cutting Features

| Capability | Where it lives |
|---|---|
| Multi-tenancy | `orgs`, `org_members`, `X-Org-Id` header, slug routing |
| RBAC (4 roles) | `authorization.py` dependencies + conditional UI renders |
| Environment separation | `flag_environments` + scoped API keys + env switcher |
| Audit trail | `flag_events` table, write on every create/update/delete |
| Usage metering | Redis counter + 60s flush job → `usage` table |
| Caching | Redis: API-key (5 min), flag config (5 min); SDK: LRU 30s; Next fetch cache (server) |
| Security | HMAC-hashed API keys, Clerk JWKS JWT verification, CORS lockdown, role checks on every mutation, confirm-on-delete everywhere |
| DX | Hosted-default SDK, dual ESM/CJS, React-optional, Next.js App Router aware, sub-2kb gzipped |

---

## 7. Deployment Story

- **Single entry port** — everything is fronted by an nginx container: `/` → dashboard, `/api/*` → API. One open port (configurable `APP_PORT`) is enough to host on any VPS.
- **Dev stack** (`docker-compose.yml`): API with `--reload`, dashboard dev server with bind-mount + volume-cached `node_modules`, Postgres 16, Redis 7 with password + AOF.
- **Prod stack** (`docker-compose-prod.yml`) mirrors the same layout with production-tuned settings.
- **Healthchecks** on Postgres (`pg_isready`) and Redis (`redis-cli ping`) gate startup.
- **One-command deploy**: `pnpm docker:dev` or `pnpm docker:prod`. Dashboard can also be hosted on Vercel with the API talking via the `INTERNAL_API_URL` / public `NEXT_PUBLIC_API_URL` split.

---

## 8. Pitch Summary

**What it is.** A cloud-native feature flag service purpose-built for Next.js: a tiny React-optional SDK, a Postgres-backed management API with a Redis hot-path cache, and a production-quality multi-tenant dashboard.

**Why it's defensible.**
- *Next.js-first ergonomics*: hosted default, `useFlag` for client components, `getFlag` for RSC — zero boilerplate, no `baseUrl` required.
- *Correct by default*: fail-closed to `defaultValue ?? false`, HMAC-hashed keys, one-shot key display, audit log on every mutation, cache invalidated on every write.
- *Operationally honest*: `latency_ms` in every response, deterministic sticky percentage rollouts, per-env isolation, full RBAC out of the box.
- *Portable*: one nginx port, Docker Compose, Postgres + Redis — runs on a $5 VPS just as well as Fly/Railway/Vercel.

**What a user gets in their first hour.** Sign up → create org → invite team → generate keys → create a `boolean`, `percentage`, `segment`, or `combined` flag → target users via 7 rule operators across arbitrary context attributes → toggle per environment → ship with the SDK → every change is audited, cached, and observable.

**What's on the rails but not yet exposed.** Billing (`stripe_customer_id` column + monthly usage rollups already writing), analytics dashboards (events + usage data are captured), and a public `/flags/new` route stub.
