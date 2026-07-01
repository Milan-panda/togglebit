'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Trash2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RuleBuilder } from '@/components/flags/rule-builder'
import { api, type Flag, type FlagEvalLog, type FlagEvent, type FlagTestResponse, type Rule } from '@/lib/api'
import { ENVIRONMENTS } from '@/lib/constants'

interface Props {
  flag: Flag
  orgId?: string
  env: string
  canManage: boolean
  canDelete: boolean
}

export function FlagDetailClient({ flag, orgId, env, canManage, canDelete }: Props) {
  const router = useRouter()
  const { getToken } = useAuth()

  async function handleDelete() {
    if (!confirm(`Delete flag "${flag.key}"? This cannot be undone.`)) return
    const token = await getToken()
    if (!token) return
    try {
      await api.flags.delete(token, flag.key, orgId)
      toast.success(`Flag "${flag.key}" deleted`)
      router.push('/dashboard')
    } catch {
      toast.error('Failed to delete flag')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={
            orgId
              ? `/dashboard?org=${encodeURIComponent(orgId)}&env=${env}`
              : `/dashboard?env=${env}`
          }
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5')}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to flags
        </Link>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={!canDelete}
          title={canDelete ? undefined : 'Your role cannot delete flags'}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      {!canManage && (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          View only. Ask an owner, admin, or developer to edit this flag.
        </p>
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{flag.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded bg-code-bg px-2 py-0.5 font-mono text-xs text-code-foreground">
            {flag.key}
          </code>
          <Badge variant="secondary">{flag.type}</Badge>
        </div>
        {flag.description && (
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{flag.description}</p>
        )}
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-3">
        {ENVIRONMENTS.map((env) => (
          <EnvCard
            key={env}
            flagKey={flag.key}
            flagType={flag.type}
            env={env}
            enabled={flag.environments?.[env]?.enabled ?? false}
            rolloutPct={flag.environments?.[env]?.rollout_pct ?? 0}
            rules={flag.environments?.[env]?.rules ?? []}
            orgId={orgId}
            canManage={canManage}
          />
        ))}
      </div>

      <FlagTesterSection
        flagKey={flag.key}
        flagType={flag.type}
        orgId={orgId}
        initialEnv={env}
        disabled={!canManage}
      />

      <UsageLogSection flagKey={flag.key} orgId={orgId} initialEnv={env} />

      <AuditLogSection flagKey={flag.key} orgId={orgId} initialEnv={env} />
    </div>
  )
}

function isoDateStartUtc(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString()
}

function isoDateEndUtcExclusive(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString()
}

function formatEventAction(action: string): string {
  return action.replaceAll('_', ' ')
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.valueOf())) return ts
  return d.toLocaleString()
}

function formatEventActor(event: FlagEvent): string {
  if (event.user_name && event.user_email) {
    return `${event.user_name} · ${event.user_email}`
  }
  return event.user_name || event.user_email || event.user_id
}

function formatEvalRequest(log: FlagEvalLog): string {
  return JSON.stringify({ userId: log.user_id, context: log.context }, null, 2)
}

function formatEvalResult(log: FlagEvalLog): string {
  return JSON.stringify({ enabled: log.enabled, reason: log.reason }, null, 2)
}

function UsageLogSection({
  flagKey,
  orgId,
  initialEnv,
}: {
  flagKey: string
  orgId?: string
  initialEnv: string
}) {
  const { getToken } = useAuth()
  const [env, setEnv] = useState(initialEnv || 'dev')
  const [range, setRange] = useState<'7d' | '30d' | 'custom'>('7d')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [logs, setLogs] = useState<FlagEvalLog[]>([])
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const computedFromTo = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    if (range === '7d') start.setDate(now.getDate() - 7)
    if (range === '30d') start.setDate(now.getDate() - 30)
    if (range !== 'custom') {
      return { from: start.toISOString(), to: now.toISOString() }
    }
    const from = fromDate ? isoDateStartUtc(fromDate) : undefined
    const to = toDate ? isoDateEndUtcExclusive(toDate) : undefined
    return { from, to }
  }, [fromDate, range, toDate])

  async function loadPage(opts: { before?: string; append?: boolean } = {}) {
    const token = await getToken()
    if (!token) return
    setError(null)

    const isAppend = Boolean(opts.append)
    isAppend ? setLoadingMore(true) : setLoading(true)

    try {
      const res = await api.flags.evalLogs.list(
        token,
        flagKey,
        {
          env,
          from: computedFromTo.from,
          to: computedFromTo.to,
          before: opts.before,
          limit: 50,
        },
        orgId,
      )

      setLogs((prev) => (isAppend ? [...prev, ...res.logs] : res.logs))
      setNextBefore(res.next_before)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load usage log')
    } finally {
      isAppend ? setLoadingMore(false) : setLoading(false)
    }
  }

  useEffect(() => {
    void loadPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, computedFromTo.from, computedFromTo.to, flagKey, orgId])

  const isEmpty = !loading && logs.length === 0 && !error

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="flex flex-col gap-3 space-y-0 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold tracking-tight">Usage log</CardTitle>
          <p className="text-sm text-muted-foreground">
            Recent evaluations with request context and results.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={env} onValueChange={(v) => setEnv(v ?? 'all')}>
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

          <Select value={range} onValueChange={(v) => setRange((v ?? '7d') as '7d' | '30d' | 'custom')}>
            <SelectTrigger size="sm" className="min-w-28">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 w-[150px] rounded-xl"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 w-[150px] rounded-xl"
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
            Loading…
          </div>
        )}

        {isEmpty && (
          <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No evaluations in this range. SDK calls and dashboard tests appear here.
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="grid gap-1 rounded-xl border border-border/70 bg-background/40 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'rounded-full',
                        log.enabled ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {log.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{log.environment}</span>
                    <Badge variant="outline" className="rounded-full text-[10px] uppercase">
                      {log.source}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatTimestamp(log.created_at)}
                  </span>
                </div>

                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    View request & result
                  </summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-code-bg p-2">
                      <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                        Request
                      </div>
                      <pre className="overflow-auto text-xs text-code-foreground">
                        {formatEvalRequest(log)}
                      </pre>
                    </div>
                    <div className="rounded-lg border border-border bg-code-bg p-2">
                      <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                        Result
                      </div>
                      <pre className="overflow-auto text-xs text-code-foreground">
                        {formatEvalResult(log)}
                      </pre>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => loadPage()}
            disabled={loading || loadingMore}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => loadPage({ before: nextBefore ?? undefined, append: true })}
            disabled={loading || loadingMore || !nextBefore}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AuditLogSection({
  flagKey,
  orgId,
  initialEnv,
}: {
  flagKey: string
  orgId?: string
  initialEnv: string
}) {
  const { getToken } = useAuth()
  const [env, setEnv] = useState(initialEnv || 'dev')
  const [range, setRange] = useState<'7d' | '30d' | 'custom'>('7d')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [events, setEvents] = useState<FlagEvent[]>([])
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const computedFromTo = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    if (range === '7d') start.setDate(now.getDate() - 7)
    if (range === '30d') start.setDate(now.getDate() - 30)
    if (range !== 'custom') {
      return { from: start.toISOString(), to: now.toISOString() }
    }
    const from = fromDate ? isoDateStartUtc(fromDate) : undefined
    const to = toDate ? isoDateEndUtcExclusive(toDate) : undefined
    return { from, to }
  }, [fromDate, range, toDate])

  async function loadPage(opts: { before?: string; append?: boolean } = {}) {
    const token = await getToken()
    if (!token) return
    setError(null)

    const isAppend = Boolean(opts.append)
    isAppend ? setLoadingMore(true) : setLoading(true)

    try {
      const res = await api.flags.events.list(
        token,
        flagKey,
        {
          env,
          from: computedFromTo.from,
          to: computedFromTo.to,
          before: opts.before,
          limit: 50,
        },
        orgId,
      )

      setEvents((prev) => (isAppend ? [...prev, ...res.events] : res.events))
      setNextBefore(res.next_before)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit log')
    } finally {
      isAppend ? setLoadingMore(false) : setLoading(false)
    }
  }

  useEffect(() => {
    void loadPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, computedFromTo.from, computedFromTo.to, flagKey, orgId])

  const isEmpty = !loading && events.length === 0 && !error

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="flex flex-col gap-3 space-y-0 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold tracking-tight">Audit log</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track who changed this flag, when, and what changed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={env} onValueChange={(v) => setEnv(v ?? 'all')}>
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

          <Select value={range} onValueChange={(v) => setRange((v ?? '7d') as any)}>
            <SelectTrigger size="sm" className="min-w-28">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 w-[150px] rounded-xl"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 w-[150px] rounded-xl"
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
            Loading…
          </div>
        )}

        {isEmpty && (
          <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No audit events in this range.
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="space-y-2">
            {events.map((e) => (
              <div
                key={e.id}
                className="grid gap-1 rounded-xl border border-border/70 bg-background/40 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      {formatEventAction(e.action)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {e.environment}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      by <span className="font-medium text-foreground">{formatEventActor(e)}</span>
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatTimestamp(e.created_at)}
                  </span>
                </div>

                {(e.old_value || e.new_value) && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      View details
                    </summary>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div className="rounded-lg border border-border bg-code-bg p-2">
                        <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                          Old
                        </div>
                        <pre className="overflow-auto text-xs text-code-foreground">
                          {JSON.stringify(e.old_value, null, 2) || '—'}
                        </pre>
                      </div>
                      <div className="rounded-lg border border-border bg-code-bg p-2">
                        <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                          New
                        </div>
                        <pre className="overflow-auto text-xs text-code-foreground">
                          {JSON.stringify(e.new_value, null, 2) || '—'}
                        </pre>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => loadPage()}
            disabled={loading || loadingMore}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => loadPage({ before: nextBefore ?? undefined, append: true })}
            disabled={loading || loadingMore || !nextBefore}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function flagRequiresUserId(flagType: string): boolean {
  return flagType === 'percentage' || flagType === 'combined'
}

function FlagTesterSection({
  flagKey,
  flagType,
  orgId,
  initialEnv,
  disabled,
}: {
  flagKey: string
  flagType: string
  orgId?: string
  initialEnv: string
  disabled: boolean
}) {
  const { getToken } = useAuth()
  const [env, setEnv] = useState(initialEnv || 'dev')
  const [userId, setUserId] = useState('')
  const [contextText, setContextText] = useState('{\n  \n}')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<FlagTestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runTest() {
    setError(null)
    setResult(null)

    let context: Record<string, unknown> = {}
    try {
      context = contextText.trim() ? (JSON.parse(contextText) as Record<string, unknown>) : {}
    } catch {
      setError('Context must be valid JSON.')
      return
    }

    if (flagRequiresUserId(flagType) && !userId.trim()) {
      setError('User ID is required for percentage and combined flags.')
      return
    }

    const token = await getToken()
    if (!token) return

    setSubmitting(true)
    try {
      const res = await api.flags.test(
        token,
        flagKey,
        {
          env,
          ...(userId.trim() ? { userId: userId.trim() } : {}),
          context,
        },
        orgId,
      )
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to test evaluation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="flex flex-col gap-3 space-y-0 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold tracking-tight">
            Test evaluation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Debug why this flag is on/off for a specific user and context.
          </p>
        </div>

        <Select value={env} onValueChange={(v) => setEnv(v ?? 'dev')} disabled={disabled}>
          <SelectTrigger size="sm" className="min-w-28">
            <SelectValue placeholder="Env" />
          </SelectTrigger>
          <SelectContent align="end">
            {ENVIRONMENTS.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="space-y-3">
        {disabled && (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Your role is read-only, so you can’t run tests.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>
              User ID
              {!flagRequiresUserId(flagType) && (
                <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
              )}
            </Label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder={
                flagRequiresUserId(flagType)
                  ? 'user_123 — required for rollout bucketing'
                  : 'user_123 — optional for boolean and segment flags'
              }
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Result</Label>
            <div className="flex h-9 items-center justify-between rounded-xl border border-border bg-background px-3">
              {result ? (
                <>
                  <span className={cn('text-sm font-medium', result.enabled ? 'text-foreground' : 'text-muted-foreground')}>
                    {result.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {result.latency_ms}ms
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Run a test to see the outcome</span>
              )}
            </div>
          </div>
        </div>

        {result?.details?.summary && (
          <div className="rounded-xl border border-border bg-muted/20 px-3 py-3 text-sm">
            <p className="text-foreground">{result.details.summary}</p>
            {result.details.rules && result.details.rules.length > 0 && (
              <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
                {result.details.rules.map((rule) => (
                  <li key={rule.label} className={rule.matched ? 'text-foreground' : 'text-destructive'}>
                    {rule.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Context (JSON)</Label>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            disabled={disabled}
            className="min-h-28 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs text-foreground outline-none disabled:pointer-events-none disabled:opacity-50"
            spellCheck={false}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end">
          <Button
            size="sm"
            className="rounded-full"
            onClick={runTest}
            disabled={disabled || submitting}
          >
            {submitting ? 'Testing…' : 'Test'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EnvCard({
  flagKey,
  flagType,
  env,
  enabled: initialEnabled,
  rolloutPct: initialPct,
  rules: initialRules,
  orgId,
  canManage,
}: {
  flagKey: string
  flagType: string
  env: string
  enabled: boolean
  rolloutPct: number
  rules: Rule[]
  orgId?: string
  canManage: boolean
}) {
  const { getToken } = useAuth()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [rolloutPct, setRolloutPct] = useState(initialPct)
  const [rules, setRules] = useState(initialRules)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) return
      await api.flags.updateEnv(token, flagKey, env, {
        enabled,
        rollout_pct: rolloutPct,
        rules,
      }, orgId)
      toast.success(`Updated ${env}`)
    } catch {
      toast.error(`Failed to update ${env}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold tracking-tight">
            {env}
          </CardTitle>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('h-1.5 w-1.5 rounded-full', enabled ? 'bg-foreground/70' : 'bg-muted-foreground')} />
            {enabled ? 'enabled' : 'disabled'}
          </span>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!canManage} />
      </CardHeader>
      <CardContent className="relative space-y-4">
        {(flagType === 'percentage' || flagType === 'combined') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rollout</Label>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {rolloutPct}%
              </span>
            </div>
            <input
              className="tb-range h-5 w-full cursor-pointer appearance-none rounded-full bg-[var(--progress-track)]"
              type="range"
              min={0}
              max={100}
              value={rolloutPct}
              style={{
                background: `linear-gradient(to right, var(--progress-fill) 0%, var(--progress-fill) ${Math.max(0, Math.min(100, rolloutPct))}%, var(--progress-track) ${Math.max(0, Math.min(100, rolloutPct))}%, var(--progress-track) 100%)`,
              }}
              onChange={(e) => setRolloutPct(Number(e.target.value))}
              disabled={!canManage}
            />
          </div>
        )}
        {(flagType === 'segment' || flagType === 'combined') && (
          <RuleBuilder rules={rules} onChange={setRules} disabled={!canManage} />
        )}
        <Button
          onClick={handleSave}
          disabled={saving || !canManage}
          className="w-full"
          size="sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}
