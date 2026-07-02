export const SETUP_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'prerequisites', label: 'Prerequisites' },
  { id: 'sdk-setup', label: 'SDK setup' },
  { id: 'flag-types', label: 'Flag types' },
  { id: 'context', label: 'Flag context' },
  { id: 'environments', label: 'Environments' },
  { id: 'failsafe', label: 'Fail-safe behavior' },
] as const

export type SetupSectionId = (typeof SETUP_SECTIONS)[number]['id']

export const FLAG_TYPES = [
  {
    id: 'boolean',
    name: 'Boolean',
    tagline: 'On for everyone, or off for everyone',
    description:
      'The simplest flag. When enabled in an environment, every evaluation returns true. When disabled, everyone gets false. No user attributes or rollout percentage involved.',
    useCases: [
      'Kill switches for risky features',
      'Internal-only features toggled per environment',
      'Maintenance banners or read-only modes',
    ],
    contextNote: 'Pass an empty context {} or omit userId entirely.',
    sdkExample: `await togglebit.getFlag('maintenance-mode', {})`,
  },
  {
    id: 'percentage',
    name: 'Percentage',
    tagline: 'Gradual rollout with stable bucketing',
    description:
      'Roll out to a fraction of users. Togglebit hashes flag key + userId into a bucket from 0–99. Users below the rollout percentage see the feature; everyone else does not. The same user always lands in the same bucket.',
    useCases: [
      'Canary releases starting at 5% or 10%',
      'A/B experiments with a controlled exposure window',
      'Slow ramp-ups before a full launch',
    ],
    contextNote: 'userId is required. Use a stable identifier (database id, auth subject), not a session token.',
    sdkExample: `await togglebit.getFlag('new-checkout', {
  userId: user.id,
})`,
  },
  {
    id: 'segment',
    name: 'Segment',
    tagline: 'Target users by attributes',
    description:
      'Define rules on context attributes like plan, country, or email domain. All rules must match for the flag to be on. With no rules configured, everyone matches.',
    useCases: [
      'Pro-only features (plan equals pro)',
      'Geo-specific rollouts (country in US, CA)',
      'Internal dogfooding (email contains @yourcompany.com)',
    ],
    contextNote: 'Pass the attributes your dashboard rules reference. userId is optional.',
    sdkExample: `await togglebit.getFlag('pro-analytics', {
  plan: user.plan,
  country: user.country,
})`,
  },
  {
    id: 'combined',
    name: 'Combined',
    tagline: 'Segment gate, then percentage rollout',
    description:
      'First, segment rules filter who is eligible. Among eligible users, percentage bucketing decides who actually sees the feature. Users who fail a rule never reach the rollout step.',
    useCases: [
      'Roll out a pro feature to 25% of pro users first',
      'Beta a feature for US enterprise customers at 10%',
      'Limit exposure within a targeted cohort before going wide',
    ],
    contextNote: 'Both segment attributes and userId are required.',
    sdkExample: `await togglebit.getFlag('enterprise-beta', {
  userId: user.id,
  plan: user.plan,
  tier: 'enterprise',
})`,
  },
] as const

export function serverSetupSnippets(
  apiKeyPlaceholder: string,
  opts?: { flagKey?: string; environment?: string },
) {
  const flagKey = opts?.flagKey ?? 'dashboard-v2'
  const environment = opts?.environment ?? 'dev'
  return {
    install: 'npm install togglebit',
    client: `// lib/togglebit.ts
import { createTogglebit } from 'togglebit/server'

export const togglebit = createTogglebit({
  apiKey: process.env.TOGGLEBIT_API_KEY!,
  environment: '${environment}',
  cacheTtl: 30,
  defaultValue: false,
})`,
    env: `# .env.local
TOGGLEBIT_API_KEY=${apiKeyPlaceholder}`,
    page: `// app/dashboard/page.tsx
import { togglebit } from '@/lib/togglebit'

export default async function DashboardPage() {
  const user = await getUser()
  const showV2 = await togglebit.getFlag('${flagKey}', {
    userId: user.id,
    plan: user.plan,
  })

  return showV2 ? <DashboardV2 /> : <DashboardV1 />
}`,
    routeHandler: `// app/api/beta/route.ts
import { togglebit } from '@/lib/togglebit'
import { NextResponse } from 'next/server'

export async function GET() {
  const enabled = await togglebit.getFlag('${flagKey}', {
    userId: 'anon',
  })
  if (!enabled) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }
  return NextResponse.json({ data: '...' })
}`,
    passToClient: `// app/page.tsx — evaluate on server, pass boolean down
import { togglebit } from '@/lib/togglebit'
import { CheckoutButton } from './checkout-button'

export default async function Page() {
  const user = await getUser()
  const useV2 = await togglebit.getFlag('${flagKey}', { userId: user.id })
  return <CheckoutButton variant={useV2 ? 'v2' : 'v1'} />
}`,
    passToClientChild: `// checkout-button.tsx
'use client'

export function CheckoutButton({ variant }: { variant: 'v1' | 'v2' }) {
  return variant === 'v2' ? <NewButton /> : <OldButton />
}`,
  }
}

export function clientSetupSnippets(
  apiKeyPlaceholder: string,
  opts?: { flagKey?: string; environment?: string },
) {
  const flagKey = opts?.flagKey ?? 'checkout-v2'
  const environment = opts?.environment ?? 'dev'
  return {
    install: 'npm install togglebit',
    provider: `// app/providers.tsx
'use client'

import { TogglebitProvider } from 'togglebit'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TogglebitProvider
      apiKey={process.env.NEXT_PUBLIC_TOGGLEBIT_API_KEY!}
      environment="${environment}"
    >
      {children}
    </TogglebitProvider>
  )
}`,
    layout: `// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}`,
    env: `# .env.local — visible in the browser bundle
NEXT_PUBLIC_TOGGLEBIT_API_KEY=${apiKeyPlaceholder.replace('your_full_key_here', 'your_public_key_here')}`,
    hook: `'use client'

import { useFlag } from 'togglebit'

export function Checkout() {
  const v2 = useFlag('${flagKey}', {
    userId: user.id,
    plan: user.plan,
  })

  return v2 ? <NewCheckout /> : <LegacyCheckout />
}`,
  }
}

export const SERVER_VS_CLIENT = [
  { label: 'API key', server: 'Stays secret on the server', client: 'Public via NEXT_PUBLIC_' },
  { label: 'When to use', server: 'Default: pages, layouts, API routes', client: 'Interactive UI after mount' },
  { label: 'Rendering', server: 'Resolved before HTML is sent', client: 'Starts default, updates client-side' },
  { label: 'Setup', server: 'createTogglebit in lib/togglebit.ts', client: 'TogglebitProvider in app root' },
] as const

export const CONTEXT_FIELDS = [
  { field: 'userId', required: 'Percentage & combined', description: 'Stable id for rollout bucketing. Same user, same bucket every time.' },
  { field: 'plan', required: 'Optional', description: 'Subscription tier or plan name for segment rules.' },
  { field: 'country', required: 'Optional', description: 'ISO country code for geo targeting.' },
  { field: 'email', required: 'Optional', description: 'Full address or domain matching in rules.' },
  { field: 'custom', required: 'Optional', description: 'Any string key/value your dashboard rules reference.' },
] as const
