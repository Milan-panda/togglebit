'use client'

import { TogglebitProvider } from 'togglebit'
import { isTogglebitPublicConfigured } from '@/lib/togglebit-public'

/** Eval API base URL: explicit env, else local Docker in dev, else SDK default (hosted). */
function evalBaseUrlForDashboard(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_TOGGLEBIT_API_URL?.trim()
  if (explicit) {
    const normalized = explicit.replace(/\/$/, '')
    // The SDK appends `/api/v1/...` to baseUrl. If baseUrl is `/api`, we'd end up with `/api/api/v1/...`.
    if (normalized === '/api') return ''
    return normalized
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000'
  }
  return undefined
}

/** 
 * Wraps the app when NEXT_PUBLIC_TOGGLEBIT_API_KEY is set.
 *
 * Required for customers: only the key (and environment). The SDK defaults to the
 * hosted API at https://api.togglebit.dev — no base URL needed.
 *
 * Optional NEXT_PUBLIC_TOGGLEBIT_API_URL: override eval host (self-hosted, custom domain).
 * In `next dev`, if unset, defaults to http://localhost:8000 so dogfooding hits Docker.
 * Production uses the SDK default (https://api.togglebit.dev) unless you set this.
 */
export function TogglebitAppProvider({
  children,
}: {
  children: React.ReactNode
}) {
  if (!isTogglebitPublicConfigured()) {
    return <>{children}</>
  }

  const apiKey = process.env.NEXT_PUBLIC_TOGGLEBIT_API_KEY!.trim()
  const env = (process.env.NEXT_PUBLIC_TOGGLEBIT_ENV ||
    'dev') as 'dev' | 'staging' | 'prod'
  const baseUrl = evalBaseUrlForDashboard()

  return (
    <TogglebitProvider
      apiKey={apiKey}
      environment={env}
      baseUrl={baseUrl}
      cacheTtl={30}
    >
      {children}
    </TogglebitProvider>
  )
}
