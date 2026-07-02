'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { Check, Circle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api, type OnboardingStatus } from '@/lib/api'
import {
  hasCopiedSdkSnippet,
  ONBOARDING_REFRESH_EVENT,
  refreshOnboardingStatus,
} from '@/lib/onboarding-copy'
import { cn } from '@/lib/utils'

export { refreshOnboardingStatus } from '@/lib/onboarding-copy'

interface Props {
  orgId?: string
}

const STEP_DEFS = [
  {
    key: 'create_flag' as const,
    label: 'Create your first flag',
    href: (orgId?: string, flagKey?: string | null) => {
      const params = new URLSearchParams({ create: '1' })
      if (orgId) params.set('org', orgId)
      return `/dashboard?${params.toString()}`
    },
  },
  {
    key: 'dev_api_key' as const,
    label: 'Generate a dev API key',
    href: (orgId?: string) => {
      const params = new URLSearchParams()
      if (orgId) params.set('org', orgId)
      const qs = params.toString()
      return qs ? `/keys?${qs}` : '/keys'
    },
  },
  {
    key: 'sdk_connected' as const,
    label: 'Copy SDK snippet',
    href: (orgId?: string, flagKey?: string | null) => {
      const key = flagKey || 'your-flag-key'
      const params = new URLSearchParams({ tab: 'code', env: 'dev' })
      if (orgId) params.set('org', orgId)
      return `/flags/${encodeURIComponent(key)}?${params.toString()}`
    },
  },
  {
    key: 'test_eval' as const,
    label: 'Run a test eval',
    href: (orgId?: string, flagKey?: string | null) => {
      const key = flagKey || 'your-flag-key'
      const params = new URLSearchParams({ env: 'dev', test: '1' })
      if (orgId) params.set('org', orgId)
      return `/flags/${encodeURIComponent(key)}?${params.toString()}`
    },
  },
]

export function GettingStartedChecklist({ orgId }: Props) {
  const { getToken } = useAuth()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [snippetCopied, setSnippetCopied] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return
      const data = await api.onboarding.status(token, orgId)
      setStatus(data)
      setSnippetCopied(hasCopiedSdkSnippet(orgId))
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [getToken, orgId])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    function handleRefresh() {
      loadStatus()
    }
    function handleFocus() {
      loadStatus()
    }
    window.addEventListener(ONBOARDING_REFRESH_EVENT, handleRefresh)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener(ONBOARDING_REFRESH_EVENT, handleRefresh)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadStatus])

  if (loading || !status) return null

  const effectiveSteps = {
    ...status.steps,
    sdk_connected: status.steps.sdk_connected || snippetCopied,
  }
  const allComplete = STEP_DEFS.every((s) => effectiveSteps[s.key])
  if (allComplete) return null

  const completedCount = STEP_DEFS.filter((s) => effectiveSteps[s.key]).length
  const progressPct = Math.round((completedCount / STEP_DEFS.length) * 100)

  return (
    <Card className="border border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Getting started</CardTitle>
        <CardDescription>
          Complete these steps to evaluate your first flag — usually under five minutes.
        </CardDescription>
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedCount} of {STEP_DEFS.length} complete</span>
            <span>{progressPct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {STEP_DEFS.map((step) => {
            const done = effectiveSteps[step.key]
            const href = step.href(orgId, status.first_flag_key)
            const needsFlag = (step.key === 'sdk_connected' || step.key === 'test_eval') && !status.first_flag_key

            return (
              <li key={step.key}>
                {done ? (
                  <div className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-muted-foreground line-through">{step.label}</span>
                  </div>
                ) : needsFlag ? (
                  <div className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground">
                    <Circle className="h-4 w-4 shrink-0" />
                    <span>{step.label}</span>
                    <span className="text-xs">(create a flag first)</span>
                  </div>
                ) : (
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors',
                      'hover:bg-muted/60',
                    )}
                  >
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{step.label}</span>
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
