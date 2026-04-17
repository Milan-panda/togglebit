'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { FlagToggle } from './flag-toggle'
import type { Flag } from '@/lib/api'

interface FlagTableProps {
  flags: Flag[]
  env: string
  orgId?: string
  canEdit?: boolean
}

export function FlagTable({ flags, env, orgId, canEdit = false }: FlagTableProps) {
  const typeBadgeClass: Record<string, string> = {
    boolean: 'bg-muted text-foreground ring-1 ring-border',
    percentage: 'bg-muted text-foreground ring-1 ring-border',
    segment: 'bg-muted text-foreground ring-1 ring-border',
    combined: 'bg-muted text-foreground ring-1 ring-border',
  }

  if (flags.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-card">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(80%_60%_at_50%_0%,hsl(var(--foreground)/0.10),transparent_60%),radial-gradient(60%_40%_at_10%_100%,hsl(var(--foreground)/0.06),transparent_60%)]" />
        <div className="relative flex flex-col items-center justify-center p-12 text-center">
          <svg
            aria-hidden="true"
            viewBox="0 0 180 80"
            className="mb-5 h-20 w-44 text-muted-foreground/60"
            fill="none"
          >
            <rect x="8" y="22" width="44" height="36" rx="8" className="fill-current opacity-25" />
            <rect x="66" y="10" width="44" height="48" rx="8" className="fill-current opacity-40" />
            <rect x="124" y="28" width="44" height="30" rx="8" className="fill-current opacity-20" />
            <path d="M24 39h12M82 34h18M140 43h10" className="stroke-current opacity-80" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <p className="text-lg font-semibold tracking-tight">Your first flag is one click away</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create a feature flag, pick rollout rules, and ship with confidence.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {flags.map((flag) => {
        const envConfig = flag.environments?.[env]
        const enabled = envConfig?.enabled ?? false
        const rollout =
          flag.type === 'percentage' || flag.type === 'combined'
            ? envConfig?.rollout_pct ?? 0
            : null
        const rulesCount =
          flag.type === 'segment' || flag.type === 'combined'
            ? envConfig?.rules?.length ?? 0
            : null

        return (
          <div
            key={flag.id}
            className="hover-lift group relative overflow-hidden rounded-lg border border-border/80 bg-card transition-all hover:border-border hover:bg-accent/20"
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 [background:radial-gradient(70%_60%_at_20%_0%,hsl(var(--foreground)/0.10),transparent_60%)]" />
            <div className="relative grid grid-cols-12 items-center gap-4 p-4 md:p-5">
              <div className="col-span-12 md:col-span-5">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/flags/${flag.key}?env=${env}${orgId ? `&org=${encodeURIComponent(orgId)}` : ''}`}
                    className="truncate text-base font-semibold tracking-tight underline-offset-4 hover:underline"
                  >
                    {flag.name}
                  </Link>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 rounded-full px-2.5 ${typeBadgeClass[flag.type] ?? 'bg-muted text-foreground'}`}
                  >
                    {flag.type}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="truncate rounded-md bg-code-bg px-2 py-0.5 font-mono text-xs text-code-foreground">
                    {flag.key}
                  </code>
                  <span
                    className={[
                      'text-xs font-medium',
                      enabled ? 'text-foreground' : 'text-muted-foreground',
                    ].join(' ')}
                  >
                    {enabled ? 'Enabled' : 'Disabled'} in {env}
                  </span>
                </div>
              </div>

              <div className="col-span-12 md:col-span-5">
                <div className="grid gap-2">
                  {rollout !== null ? (
                    <div className="grid gap-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Rollout</span>
                        <span className="font-medium tabular-nums text-foreground">
                          {rollout}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--progress-track)]">
                        <div
                          className="h-full rounded-full bg-[var(--progress-fill)] transition-[width] duration-300"
                          style={{ width: `${Math.max(0, Math.min(100, rollout))}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Rollout <span className="text-foreground/70">—</span>
                    </div>
                  )}

                  {rulesCount !== null ? (
                    <div className="text-xs text-muted-foreground">
                      Segment rules{' '}
                      <span className="ml-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 font-medium tabular-nums text-foreground">
                        {rulesCount}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Segment rules <span className="text-foreground/70">—</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-12 flex items-center justify-between md:col-span-2 md:justify-end">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground md:hidden">
                    Toggle
                  </span>
                  <FlagToggle
                    flagKey={flag.key}
                    env={env}
                    enabled={enabled}
                    orgId={orgId}
                    canEdit={canEdit}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
