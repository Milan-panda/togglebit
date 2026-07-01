'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { FlagToggle } from './flag-toggle'
import { type Flag } from '@/lib/api'

interface FlagTableProps {
  flags: Flag[]
  env: string
  orgId?: string
  canEdit?: boolean
}

export function FlagTable({ flags, env, orgId, canEdit = false }: FlagTableProps) {
  if (flags.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="font-medium">No flags yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create one to wrap a feature behind a toggle, or adjust your filters.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
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
            className="flex items-start gap-4 p-4 transition-colors hover:bg-muted/40 sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/flags/${flag.key}?env=${env}${orgId ? `&org=${encodeURIComponent(orgId)}` : ''}`}
                  className="truncate font-medium hover:underline"
                >
                  {flag.name}
                </Link>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {flag.type}
                </Badge>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <code className="rounded bg-code-bg px-1.5 py-0.5 font-mono text-code-foreground">
                  {flag.key}
                </code>
                <span>·</span>
                <span className={enabled ? 'text-foreground' : undefined}>
                  {enabled ? 'On' : 'Off'}
                </span>
                {rollout !== null && (
                  <>
                    <span>·</span>
                    <span>{rollout}% rollout</span>
                  </>
                )}
                {rulesCount !== null && rulesCount > 0 && (
                  <>
                    <span>·</span>
                    <span>
                      {rulesCount} rule{rulesCount === 1 ? '' : 's'}
                    </span>
                  </>
                )}
              </div>

              {rollout !== null && (
                <div className="mt-2.5 flex max-w-xs items-center gap-2.5">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--progress-track)]">
                    <div
                      className="h-full rounded-full bg-[var(--progress-fill)] transition-[width] duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, rollout))}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {rollout}%
                  </span>
                </div>
              )}
            </div>

            <div className="shrink-0 pt-0.5 sm:pt-0">
              <FlagToggle
                flagKey={flag.key}
                env={env}
                enabled={enabled}
                orgId={orgId}
                canEdit={canEdit}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
