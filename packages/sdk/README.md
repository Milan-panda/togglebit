# Togglebit

Feature flags built for Next.js and React. Ship new code behind a flag, roll out gradually, and turn features off instantly without redeploying.

The `togglebit` npm package lets you evaluate flags in your app with a few lines of code. It works in Server Components, route handlers, and client components.

---

## Install

```bash
npm install togglebit
# or: pnpm add togglebit
# or: yarn add togglebit
```

**Requirements:** Node.js 18+, React 18+ (for client hooks)

---

## Before you write code

You'll need two things from the [Togglebit dashboard](http://xuno.duckdns.org:8765/):

1. **A flag** - create one and configure it for your environment (`dev`, `staging`, or `prod`)
2. **An API key** - generate a key scoped to the environment your app runs in

Keep your API key on the server. Never commit it to git or expose it in client-side code unless you understand the tradeoffs.

---

## Quick start (recommended)

The best default for Next.js App Router apps is **server-side evaluation**. Your API key stays secret, flags are resolved before the page renders, and you avoid extra client-side requests.

### 1. Create a shared client

Put your config in one place — the server-side equivalent of wrapping your app in a provider:

```ts
// lib/togglebit.ts
import { createTogglebit } from 'togglebit/server'

export const togglebit = createTogglebit({
  apiKey: process.env.TOGGLEBIT_API_KEY!,
  environment: 'prod',
})
```

### 2. Set your API key

```bash
# .env.local
TOGGLEBIT_API_KEY=tb_prod_xxxxxxxx
```

### 3. Evaluate a flag

```tsx
// app/checkout/page.tsx
import { togglebit } from '@/lib/togglebit'

export default async function CheckoutPage() {
  const user = await getUser()
  const useNewCheckout = await togglebit.getFlag('new-checkout', {
    userId: user.id,
    plan: user.plan,
  })

  return useNewCheckout ? <NewCheckout /> : <LegacyCheckout />
}
```

That's it. Import `togglebit` anywhere on the server and call `getFlag` with a flag key and user context.

---

## Server-side usage

Import from `togglebit/server` in Server Components, Server Actions, and Route Handlers.

### `createTogglebit(config)`

Init once, use everywhere. Returns an object with a bound `getFlag` method.

```ts
import { createTogglebit } from 'togglebit/server'

export const togglebit = createTogglebit({
  apiKey: process.env.TOGGLEBIT_API_KEY!,
  environment: 'prod',
  cacheTtl: 30,       // optional — seconds to cache results (default: 30)
  defaultValue: false, // optional — return value when eval fails (default: false)
})
```

### `getFlag(key, context)`

One-off evaluation when you don't need a shared client:

```ts
import { getFlag } from 'togglebit/server'

const enabled = await getFlag(
  'dark-mode',
  { userId: user.id },
  {
    apiKey: process.env.TOGGLEBIT_API_KEY!,
    environment: 'prod',
  },
)
```

### Route handler example

```ts
// app/api/feature/route.ts
import { togglebit } from '@/lib/togglebit'
import { NextResponse } from 'next/server'

export async function GET() {
  const enabled = await togglebit.getFlag('beta-api', { userId: 'anon' })
  if (!enabled) return NextResponse.json({ error: 'Not available' }, { status: 404 })
  return NextResponse.json({ data: '...' })
}
```

### Passing results to client components

Evaluate on the server, pass the boolean down as a prop. No API key in the browser.

```tsx
// app/page.tsx
import { togglebit } from '@/lib/togglebit'
import { CheckoutButton } from './checkout-button'

export default async function Page() {
  const showV2 = await togglebit.getFlag('checkout-v2', { userId: user.id })
  return <CheckoutButton variant={showV2 ? 'v2' : 'v1'} />
}
```

```tsx
// checkout-button.tsx
'use client'

export function CheckoutButton({ variant }: { variant: 'v1' | 'v2' }) {
  return variant === 'v2' ? <NewButton /> : <OldButton />
}
```

---

## Client-side usage

For interactive UI that needs to react to flags after mount, use the React hook.

### 1. Wrap your app

```tsx
// app/providers.tsx
'use client'

import { TogglebitProvider } from 'togglebit'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TogglebitProvider
      apiKey={process.env.NEXT_PUBLIC_TOGGLEBIT_API_KEY!}
      environment="prod"
    >
      {children}
    </TogglebitProvider>
  )
}
```

```tsx
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### 2. Use the hook

```tsx
'use client'

import { useFlag } from 'togglebit'

export function Checkout() {
  const v2 = useFlag('checkout-v2', { userId: user.id, plan: user.plan })
  return v2 ? <NewCheckout /> : <LegacyCheckout />
}
```

`useFlag` returns a boolean. It starts with your `defaultValue` (off by default), then updates once the flag is evaluated.

---

## Flag context

Pass attributes that describe the current user or request. Togglebit uses them for segment targeting and percentage rollouts.

```ts
// Boolean flag — no userId needed
await togglebit.getFlag('maintenance-banner', {})

// Segment flag — pass the attributes your rules reference
await togglebit.getFlag('pro-feature', { plan: 'pro', country: 'US' })

// Percentage or combined flag — userId required for consistent bucketing
await togglebit.getFlag('new-checkout', {
  userId: user.id,
  plan: user.plan,
})
```

| Field | Required | Description |
|---|---|---|
| `userId` | Only for percentage and combined flags | Stable user identifier for rollout bucketing. Same user always gets the same result. |
| `plan` | No | Target by subscription tier or plan name. |
| `country` | No | Target by country code. |
| `email` | No | Target by email domain or address. |
| *(custom)* | No | Any string key/value pair your dashboard rules reference. |

For percentage and combined flags, omitting `userId` returns the flag as off (`user_id_required`). For boolean and segment flags, you can evaluate with an empty context `{}` or only the attributes your rules need.

When you do pass `userId`, keep it stable across page loads — otherwise users can flip in and out of a percentage rollout.

---

## Environments

Togglebit flags are configured per environment. Set `environment` in your SDK config to match where your app runs:


| Value       | Typical use               |
| ----------- | ------------------------- |
| `'dev'`     | Local development         |
| `'staging'` | Preview / staging deploys |
| `'prod'`    | Production                |


Each environment has its own flag config and API keys. A flag can be at 100% in `dev` and 0% in `prod` until you're ready to roll out.

---

## Configuration


| Option         | Type      | Default   | Description                                                     |
| -------------- | --------- | --------- | --------------------------------------------------------------- |
| `apiKey`       | `string`  | —         | Your Togglebit API key for this environment.                    |
| `environment`  | `'dev'    | 'staging' | 'prod'`                                                         |
| `cacheTtl`     | `number`  | `30`      | How long to cache flag results, in seconds.                     |
| `defaultValue` | `boolean` | `false`   | Value returned when evaluation fails or the flag doesn't exist. |


---

## Caching

The SDK caches flag evaluations to keep your app fast and reduce API calls.

- **Server:** Results are cached via Next.js fetch revalidation (default 30 seconds). Multiple components requesting the same flag in one request share the cache.
- **Client:** An in-memory LRU cache (500 entries, same TTL) prevents duplicate requests during a session.

Change `cacheTtl` if you need fresher results or want to cache longer:

```ts
createTogglebit({
  apiKey: process.env.TOGGLEBIT_API_KEY!,
  environment: 'prod',
  cacheTtl: 60, // re-check every 60 seconds
})
```

---

## Fail-safe behavior

If Togglebit is unreachable, your API key is invalid, or a flag doesn't exist, the SDK returns `defaultValue` (off by default). Your app keeps running — features just stay disabled until the next successful evaluation.

This is intentional. A flag system should never take your app down.

---

## Server vs client: which to use?


|                 | Server (`togglebit/server`)                 | Client (`togglebit`)                     |
| --------------- | ------------------------------------------- | ---------------------------------------- |
| **API key**     | Stays secret on the server                  | Must be public (`NEXT_PUBLIC_`*)         |
| **When to use** | Default choice — pages, layouts, API routes | Interactive UI that reacts after mount   |
| **Rendering**   | Flag resolved before HTML is sent           | Starts with default, updates client-side |
| **Setup**       | `createTogglebit` in `lib/togglebit.ts`     | `TogglebitProvider` in your app root     |


**Recommendation:** Use server-side evaluation by default. Pass the result to client components as props. Reach for `useFlag` only when you need client-side reactivity and accept the public API key tradeoff.

---

## Security

- **Keep `TOGGLEBIT_API_KEY` server-only.** Use a `NEXT_PUBLIC_` prefix only if you deliberately want client-side evaluation.
- **Client-side keys are visible** to anyone who opens your app's JavaScript. Treat them as read-only eval keys, not secrets.
- **Use separate keys per environment.** Generate a `dev` key for local work and a `prod` key for production.
- **Rotate keys** from the dashboard if a key is ever exposed.

---

## TypeScript

The SDK is written in TypeScript and ships with full type definitions. No `@types` package needed.

```ts
import type { FlagContext, TogglebitConfig } from 'togglebit/server'
```

---

## Package exports


| Import             | Use in                                                                           |
| ------------------ | -------------------------------------------------------------------------------- |
| `togglebit`        | Client components — `TogglebitProvider`, `useFlag`                               |
| `togglebit/server` | Server Components, route handlers, Server Actions — `createTogglebit`, `getFlag` |


The server entry has zero React dependency, so it works in any server runtime.

---

## Links

- [Togglebit dashboard](http://xuno.duckdns.org:8765/) — create flags, manage rollouts, generate API keys

