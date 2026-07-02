'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClearFiltersButton } from './clear-filters-button'
import { FlagRowMenu } from './flag-row-menu'
import { FlagToggle } from './flag-toggle'
import { UsageSparkline } from '@/components/usage/usage-sparkline'
import { type Flag } from '@/lib/api'
import { withOrgAndEnv } from '@/lib/env-url'
import { FLAGS_PAGE_SIZE } from '@/lib/flags-url'

interface FlagTableProps {
  flags: Flag[]
  env: string
  orgId?: string
  canEdit?: boolean
  canDelete?: boolean
  hasActiveFilters?: boolean
  usageByFlagId?: Record<string, number[]>
  usageTotalsByFlagId?: Record<string, number>
  total?: number
  page?: number
  onPageChange?: (page: number) => void
}

export function FlagTable({
  flags,
  env,
  orgId,
  canEdit = false,
  canDelete = false,
  hasActiveFilters = false,
  usageByFlagId = {},
  usageTotalsByFlagId = {},
  total = 0,
  page = 1,
  onPageChange,
}: FlagTableProps) {
  const router = useRouter()
  const totalPages = Math.max(1, Math.ceil(total / FLAGS_PAGE_SIZE))

  if (flags.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="font-medium">No matches</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try different search or filters.
          </p>
          <ClearFiltersButton env={env} orgId={orgId} />
        </div>
      )
    }

    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="font-medium">No flags yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first flag to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
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
          const usageTotal = usageTotalsByFlagId[flag.id] ?? 0
          const neverEvaluated = usageTotal === 0

          return (
            <div
              key={flag.id}
              className="flex items-start gap-4 p-4 transition-colors hover:bg-muted/40 sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={withOrgAndEnv(`/flags/${flag.key}`, orgId, env)}
                    className="truncate font-medium hover:underline"
                  >
                    {flag.name}
                  </Link>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {flag.type}
                  </Badge>
                  {neverEvaluated && (
                    <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
                      Never evaluated
                    </Badge>
                  )}
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

              <div className="hidden w-20 sm:block">
                <UsageSparkline data={usageByFlagId[flag.id] ?? []} className="h-5 w-20" />
              </div>

              <div className="flex shrink-0 items-center gap-1 pt-0.5 sm:pt-0">
                <FlagToggle
                  flagKey={flag.key}
                  env={env}
                  enabled={enabled}
                  orgId={orgId}
                  canEdit={canEdit}
                />
                <FlagRowMenu
                  flag={flag}
                  env={env}
                  orgId={orgId}
                  canManage={canEdit}
                  canDelete={canDelete}
                  onDuplicated={() => router.refresh()}
                />
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} · {total} flags
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
