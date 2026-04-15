# Togglebit Dashboard

The dashboard is the monorepo Next.js application for management workflows. It loads its environment from the workspace root so Docker, local development, and deployment use the same variable contract.

## Run locally

From the repository root:

```bash
cp .env.example .env
pnpm install
pnpm dashboard:dev
```

## Run in Docker

From the repository root:

```bash
cp .env.example .env
pnpm docker:dev
```

## Important env vars

- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_TOGGLEBIT_API_URL`
- `NEXT_PUBLIC_TOGGLEBIT_API_KEY`
- `NEXT_PUBLIC_TOGGLEBIT_ENV`
