'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  formatEventAction,
  formatEventActor,
  formatTimestamp,
} from '@/lib/audit-format'
import type { ActivityEvent, FlagEvent } from '@/lib/api'

type AuditEvent = FlagEvent | ActivityEvent

interface AuditEventRowProps {
  event: AuditEvent
  showFlag?: boolean
  orgId?: string
  env?: string
}

export function AuditEventRow({ event, showFlag = false, orgId, env }: AuditEventRowProps) {
  const flagKey = 'flag_key' in event ? event.flag_key : null
  const flagName = 'flag_name' in event ? event.flag_name : null

  return (
    <div className="grid gap-1 rounded-xl border border-border/70 bg-background/40 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            {formatEventAction(event.action)}
          </Badge>
          <span className="text-xs text-muted-foreground">{event.environment}</span>
          {showFlag && flagKey && (
            <Link
              href={`/flags/${flagKey}?${new URLSearchParams({
                ...(orgId ? { org: orgId } : {}),
                ...(env ? { env } : {}),
              }).toString()}`}
              className="text-xs font-medium hover:underline"
            >
              {flagName || flagKey}
            </Link>
          )}
          <span className="text-xs text-muted-foreground">
            by <span className="font-medium text-foreground">{formatEventActor(event)}</span>
          </span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatTimestamp(event.created_at)}
        </span>
      </div>

      {(event.old_value || event.new_value) && (
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            View details
          </summary>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-code-bg p-2">
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">Old</div>
              <pre className="overflow-auto text-xs text-code-foreground">
                {JSON.stringify(event.old_value, null, 2) || '—'}
              </pre>
            </div>
            <div className="rounded-lg border border-border bg-code-bg p-2">
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">New</div>
              <pre className="overflow-auto text-xs text-code-foreground">
                {JSON.stringify(event.new_value, null, 2) || '—'}
              </pre>
            </div>
          </div>
        </details>
      )}
    </div>
  )
}
