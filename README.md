# Togglebit

Feature flags built natively for Next.js. Ship safely, roll out gradually, kill instantly.

## Architecture

- **SDK** (`packages/sdk`) — npm package `togglebit`, TypeScript-first, < 2kb gzipped
- **API** (`apps/api`) — FastAPI eval + management API, Redis-cached, Postgres-backed
- **Dashboard** (`apps/dashboard`) — Next.js 14 App Router, shadcn/ui, Clerk auth

## Quick Start

### Prerequisites

- Node.js 20+, pnpm
- Docker & Docker Compose

### Development

```bash
# Install monorepo dependencies
pnpm install

# Configure the root env contract once
cp .env.example .env

# Start the full dev stack behind nginx on APP_PORT
pnpm docker:dev
```

### Environment Variables

All environment variables are managed from the workspace root `.env`.

See `.env.example` for the full list. Key variables:

| Variable | Description |
|---|---|
| `APP_PORT` | Public port exposed by nginx for both dashboard and API |
| `API_ADDRESS` | Internal API upstream used by nginx |
| `DASHBOARD_ADDRESS` | Internal dashboard upstream used by nginx |
| `DATABASE_URL` | API database connection string used by Dockerized API |
| `REDIS_URL` | API Redis connection string used by Dockerized API |
| `POSTGRES_PASSWORD` | Postgres password |
| `REDIS_PASSWORD` | Redis password |
| `HMAC_SECRET` | Secret for API key hashing (generate with `openssl rand -hex 32`) |
| `CLERK_SECRET_KEY` | Clerk secret key for JWT verification |
| `INTERNAL_API_URL` | Optional server-side dashboard-to-API URL for Docker networking |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for the dashboard |
| `NEXT_PUBLIC_TOGGLEBIT_API_URL` | Public API base URL used by dashboard and SDK dogfooding |
| `NEXT_PUBLIC_TOGGLEBIT_API_KEY` | Optional dogfooding API key for the dashboard |

### Docker Layout

- `docker-compose.yml` is the development stack.
- `docker-compose-prod.yml` is the production stack.
- Both stacks expose a single public app port through nginx.
- Dashboard is served at `/`.
- API is served at `/api/*`.

### Deploy

**Development**
```bash
pnpm docker:dev
```

**Production**
```bash
pnpm docker:prod
```

Suggested `.env` values for an IP-only VPS deployment:
```env
APP_PORT=8765
DASHBOARD_URL=http://138.10.10.1:8765
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_TOGGLEBIT_API_URL=/api
```

This gives you:
- `http://138.10.10.1:8765/` -> dashboard
- `http://138.10.10.1:8765/api/*` -> API

**Dashboard on Vercel**:
Still possible if you prefer it, but the current Docker setup assumes same-origin `/api` via nginx.

## SDK Usage

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

## API Endpoints

| Route | Auth | Description |
|---|---|---|
| `GET /api/v1/eval/flags/:key` | API key | Evaluate a flag (hot path) |
| `GET /api/v1/manage/flags` | Clerk JWT | List flags |
| `POST /api/v1/manage/flags` | Clerk JWT | Create a flag |
| `PATCH /api/v1/manage/flags/:key/environments/:env` | Clerk JWT | Update flag config |
| `DELETE /api/v1/manage/flags/:key` | Clerk JWT | Delete a flag |
| `POST /api/v1/manage/keys` | Clerk JWT | Generate API key |
| `GET /api/v1/manage/keys` | Clerk JWT | List API keys |
| `DELETE /api/v1/manage/keys/:id` | Clerk JWT | Revoke API key |
