# Togglebit SDK (`togglebit`)

Feature flags built for Next.js and React.

- **Dashboard**: create flags, set rollouts/rules, generate API keys  
  `http://xuno.duckdns.org:8765/`
- **SDK**: evaluate flags in your app (server and client)

---

## Install

```bash
pnpm add togglebit
# or: npm i togglebit
# or: yarn add togglebit
```

---

## 1) Create an API key

1. Open the Togglebit dashboard: `http://xuno.duckdns.org:8765/`
2. Create an org
3. Create one or more flags
4. Generate an **API key** for your environment (`dev`, `staging`, `prod`)

You’ll use that key in the SDK config as `apiKey`.

---

## Recommended: Evaluate flags on the server (keeps the API key secret)

In a Next.js Server Component (or route handler), use `togglebit/server`:

```ts
import { getFlag } from 'togglebit/server'

const enabled = await getFlag(
  'new-checkout',
  { userId: user.id, plan: user.plan, country: user.country },
  {
    apiKey: process.env.TOGGLEBIT_API_KEY!,
    environment: 'prod',
    // Optional:
    // cacheTtl: 30,
    // defaultValue: false,
  },
)
```

### Environment variables

Set your API key in your app’s server environment:

```bash
TOGGLEBIT_API_KEY=tb_prod_...
```

---

## Client-side usage (React)

If you want client components to react to flags, wrap your app with the provider and use the hook.

```tsx
'use client'

import { TogglebitProvider, useFlag } from 'togglebit'

function Example() {
  const enabled = useFlag('new-checkout', { userId: 'user_123' })
  return enabled ? <NewCheckout /> : <OldCheckout />
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TogglebitProvider apiKey={process.env.NEXT_PUBLIC_TOGGLEBIT_API_KEY!} environment="prod">
      {children}
    </TogglebitProvider>
  )
}
```

### Important (security)

If you put an API key in the browser (e.g. `NEXT_PUBLIC_*`), it is **public**.  
For most apps, prefer server-side evaluation and pass only the result to the client.

---

## How the SDK reaches Togglebit

By default, the SDK evaluates flags using the hosted Togglebit API (no `baseUrl` needed).

For local testing or advanced routing, you can override:

```ts
{
  baseUrl: 'http://localhost:8765', // optional override
}
```

---

## API (what gets called)

The SDK evaluates flags via:

- `GET /api/v1/eval/flags/:key`

Management endpoints (creating flags, keys, orgs) are handled by the dashboard, not the SDK.

