'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { AuditEventRow } from '@/components/flags/audit-event-row'
import { EnvSwitcher } from '@/components/layout/env-switcher'
import { api, type ActivityEvent, type OrgMember } from '@/lib/api'
import { ENVIRONMENTS } from '@/lib/constants'

interface Props {
  orgId?: string
  members: OrgMember[]
}

function rangeToIso(range: 'today' | '7d' | '30d' | 'custom', fromDate: string, toDate: string) {
  const now = new Date()
  const to = now.toISOString()
  if (range === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return { from: start.toISOString(), to }
  }
  if (range === '7d') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return { from: start.toISOString(), to }
  }
  if (range === '30d') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return { from: start.toISOString(), to }
  }
  if (fromDate) {
    return {
      from: new Date(fromDate + 'T00:00:00').toISOString(),
      to: toDate ? new Date(toDate + 'T23:59:59').toISOString() : to,
    }
  }
  return {}
}

export function ActivityClient({ orgId, members }: Props) {
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const env = searchParams.get('env') || 'dev'

  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [userId, setUserId] = useState('all')
  const [action, setAction] = useState('all')
  const [envFilter, setEnvFilter] = useState('all')
  const [range, setRange] = useState<'today' | '7d' | '30d' | 'custom'>('7d')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const rangeParams = useMemo(
    () => rangeToIso(range, fromDate, toDate),
    [range, fromDate, toDate],
  )

  const loadPage = useCallback(
    async (opts?: { before?: string; append?: boolean }) => {
      const isAppend = opts?.append ?? false
      if (isAppend) setLoadingMore(true)
      else setLoading(true)
      setError(null)

      try {
        const token = await getToken()
        if (!token) return

        const res = await api.activity.list(
          token,
          {
            user_id: userId !== 'all' ? userId : undefined,
            action: action !== 'all' ? action : undefined,
            env: envFilter !== 'all' ? envFilter : undefined,
            from: rangeParams.from,
            to: rangeParams.to,
            before: opts?.before,
            limit: 50,
          },
          orgId,
        )

        setEvents((prev) => (isAppend ? [...prev, ...res.events] : res.events))
        setNextBefore(res.next_before)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [getToken, orgId, userId, action, envFilter, rangeParams],
  )

  useEffect(() => {
    loadPage()
  }, [loadPage])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <EnvSwitcher />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Org audit log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={userId} onValueChange={(v) => setUserId(v ?? 'all')}>
              <SelectTrigger size="sm" className="min-w-36">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">All users</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.name || m.email || m.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={action} onValueChange={(v) => setAction(v ?? 'all')}>
              <SelectTrigger size="sm" className="min-w-32">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="created">created</SelectItem>
                <SelectItem value="updated">updated</SelectItem>
                <SelectItem value="enabled">enabled</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
                <SelectItem value="archived">archived</SelectItem>
                <SelectItem value="deleted">deleted</SelectItem>
                <SelectItem value="cloned">cloned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={envFilter} onValueChange={(v) => setEnvFilter(v ?? 'all')}>
              <SelectTrigger size="sm" className="min-w-28">
                <SelectValue placeholder="Env" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">All envs</SelectItem>
                {ENVIRONMENTS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={range} onValueChange={(v) => setRange((v ?? '7d') as typeof range)}>
              <SelectTrigger size="sm" className="min-w-28">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {range === 'custom' && (
              <>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 w-[150px]"
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 w-[150px]"
                />
              </>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}

          {!loading && events.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No activity in this range.
            </p>
          )}

          <div className="space-y-2">
            {events.map((e) => (
              <AuditEventRow
                key={e.id}
                event={e}
                showFlag
                orgId={orgId}
                env={env}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => loadPage()} disabled={loading}>
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPage({ before: nextBefore ?? undefined, append: true })}
              disabled={loadingMore || !nextBefore}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
