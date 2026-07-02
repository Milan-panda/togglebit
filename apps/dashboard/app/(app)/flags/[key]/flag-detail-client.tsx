'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Trash2, ArrowRight, Copy } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AuditEventRow } from '@/components/flags/audit-event-row'
import { EvalVolumeSection } from '@/components/flags/eval-volume-section'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { pushRecentFlag } from '@/components/flags/flag-row-menu'
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
import { EnvPromoteDialog } from '@/components/flags/env-promote-dialog'
import { EvalReasonChain } from '@/components/flags/eval-reason-chain'
import { FlagUseInCodeTab } from '@/components/flags/flag-use-in-code-tab'
import { EnvSwitcher } from '@/components/layout/env-switcher'
import { refreshOnboardingStatus } from '@/components/onboarding/getting-started-checklist'
import { api, type Flag, type FlagEvalLog, type FlagEvent, type FlagTestResponse, type Rule } from '@/lib/api'
import { ENVIRONMENTS } from '@/lib/constants'
import { envConfigsEqual } from '@/lib/env-diff'
import {
  confirmLeave,
  isEnvDirty,
  isMetadataDirty,
  isSameOriginNavigation,
  snapshotEnvConfig,
  snapshotMetadata,
  type EnvConfigSnapshot,
  type MetadataSnapshot,
} from '@/lib/unsaved-changes'

interface Props {
  flag: Flag
  orgId?: string
  env: string
  activeTab: 'config' | 'code'
  openTest?: boolean
  usageHighlight?: boolean
  apiKeyPlaceholder: string
  canManage: boolean
  canDelete: boolean
}

export function FlagDetailClient({
  flag,
  orgId,
  env,
  activeTab,
  openTest,
  usageHighlight = false,
  apiKeyPlaceholder,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken } = useAuth()
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [promoteSource, setPromoteSource] = useState<'dev' | 'staging'>('dev')
  const [promoteTarget, setPromoteTarget] = useState<'staging' | 'prod'>('staging')
  const [dirtyEnvs, setDirtyEnvs] = useState<Set<string>>(new Set())
  const [metadataDirty, setMetadataDirty] = useState(false)
  const [name, setName] = useState(flag.name)
  const [description, setDescription] = useState(flag.description ?? '')
  const [savingMetadata, setSavingMetadata] = useState(false)
  const savedMetadataRef = useRef<MetadataSnapshot>(snapshotMetadata(flag.name, flag.description))

  function tabHref(tab: 'config' | 'code') {
    const params = new URLSearchParams(searchParams.toString())
    params.set('env', env)
    if (tab === 'code') params.set('tab', 'code')
    else params.delete('tab')
    if (tab === 'config') params.delete('test')
    return `/flags/${encodeURIComponent(flag.key)}?${params.toString()}`
  }

  function openPromote(source: 'dev' | 'staging', target: 'staging' | 'prod') {
    setPromoteSource(source)
    setPromoteTarget(target)
    setPromoteOpen(true)
  }

  const devConfig = flag.environments?.dev
  const stagingConfig = flag.environments?.staging
  const prodConfig = flag.environments?.prod
  const canCopyDevToStaging = devConfig && stagingConfig && !envConfigsEqual(devConfig, stagingConfig)
  const canCopyStagingToProd = stagingConfig && prodConfig && !envConfigsEqual(stagingConfig, prodConfig)

  const hasUnsavedChanges = metadataDirty || dirtyEnvs.size > 0

  const handleEnvDirtyChange = useCallback((envName: string, isDirty: boolean) => {
    setDirtyEnvs((prev) => {
      const next = new Set(prev)
      if (isDirty) next.add(envName)
      else next.delete(envName)
      return next
    })
  }, [])

  useEffect(() => {
    const saved = savedMetadataRef.current
    setMetadataDirty(isMetadataDirty(snapshotMetadata(name, description), saved))
  }, [name, description])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor?.href) return
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return
      if (!isSameOriginNavigation(anchor.href)) return
      if (!confirmLeave(true)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [hasUnsavedChanges])

  async function handleSaveMetadata() {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    setSavingMetadata(true)
    try {
      const token = await getToken()
      if (!token) return
      await api.flags.update(
        token,
        flag.key,
        { name: name.trim(), description: description.trim() || null },
        orgId,
      )
      savedMetadataRef.current = snapshotMetadata(name.trim(), description.trim() || null)
      setMetadataDirty(false)
      toast.success('Flag details updated')
    } catch {
      toast.error('Failed to update flag details')
    } finally {
      setSavingMetadata(false)
    }
  }

  useEffect(() => {
    pushRecentFlag(flag.key)
  }, [flag.key])

  useEffect(() => {
    if (!usageHighlight) return
    document.getElementById('eval-volume')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [usageHighlight])

  async function handleArchive() {
    if (!confirm(`Archive flag "${flag.key}"? It will be hidden from the flags list.`)) return
    const token = await getToken()
    if (!token) return
    try {
      await api.flags.delete(token, flag.key, orgId, false)
      toast.success(`Flag "${flag.key}" archived`)
      router.push(`/dashboard?org=${encodeURIComponent(orgId || '')}&env=${env}`)
    } catch {
      toast.error('Failed to archive flag')
    }
  }

  async function handlePermanentDelete() {
    if (!confirm(`Permanently delete "${flag.key}"? This cannot be undone.`)) return
    const token = await getToken()
    if (!token) return
    try {
      await api.flags.delete(token, flag.key, orgId, true)
      toast.success(`Flag "${flag.key}" deleted`)
      router.push(`/dashboard?org=${encodeURIComponent(orgId || '')}&env=${env}`)
    } catch {
      toast.error('Failed to delete flag')
    }
  }

  async function handleClone() {
    const newKey = `${flag.key}-copy`
    if (!confirm(`Clone as "${newKey}"?`)) return
    const token = await getToken()
    if (!token) return
    try {
      const created = await api.flags.clone(token, flag.key, { new_key: newKey }, orgId)
      toast.success('Flag cloned')
      router.push(`/flags/${created.key}?org=${encodeURIComponent(orgId || '')}&env=${env}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clone flag')
    }
  }

  const dirtyEnvList = ENVIRONMENTS.filter((e) => dirtyEnvs.has(e))

  return (
    <div className={cn('space-y-6', hasUnsavedChanges && 'pb-20')}>
      <Breadcrumbs
        orgId={orgId}
        env={env}
        crumbs={[
          { label: 'Flags', href: '/dashboard' },
          { label: flag.name },
        ]}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        {canManage && (
          <Button variant="outline" size="sm" onClick={handleClone}>
            <Copy className="mr-2 h-4 w-4" />
            Clone
          </Button>
        )}
        {canDelete && (
          <>
            <Button variant="outline" size="sm" onClick={handleArchive}>
              <Trash2 className="mr-2 h-4 w-4" />
              Archive
            </Button>
            <Button variant="destructive" size="sm" onClick={handlePermanentDelete}>
              Delete permanently
            </Button>
          </>
        )}
      </div>

      {!canManage && (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Read-only — you can test evaluations and view logs, but cannot save changes.
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
          <Link
            href={tabHref('config')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === 'config'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Configuration
          </Link>
          <Link
            href={tabHref('code')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === 'code'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Use in code
          </Link>
        </div>
        <EnvSwitcher />
      </div>

      {activeTab === 'code' ? (
        <FlagUseInCodeTab
          flagKey={flag.key}
          flagType={flag.type}
          environment={env}
          apiKeyPlaceholder={apiKeyPlaceholder}
          orgId={orgId}
        />
      ) : (
        <>
      {canManage ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-code-bg px-2 py-0.5 font-mono text-xs text-code-foreground">
              {flag.key}
            </code>
            <Badge variant="secondary">{flag.type}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Created {new Date(flag.created_at).toLocaleDateString()}
            {flag.created_by && (
              <>
                {' '}
                by {flag.created_by.name || flag.created_by.email || flag.created_by.user_id}
              </>
            )}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="flag-name">Name</Label>
              <Input
                id="flag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flag-description">Description</Label>
            <textarea
              id="flag-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional — what this flag controls"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSaveMetadata}
              disabled={!metadataDirty || savingMetadata || !name.trim()}
            >
              {savingMetadata ? 'Saving…' : 'Save details'}
            </Button>
            {metadataDirty && (
              <span className="text-xs text-muted-foreground">Unsaved details</span>
            )}
          </div>
        </div>
      ) : (
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
          <p className="mt-2 text-xs text-muted-foreground">
            Created {new Date(flag.created_at).toLocaleDateString()}
            {flag.created_by && (
              <>
                {' '}
                by {flag.created_by.name || flag.created_by.email || flag.created_by.user_id}
              </>
            )}
          </p>
        </div>
      )}

      <Separator />

      {canManage && (canCopyDevToStaging || canCopyStagingToProd) && (
        <div className="flex flex-wrap items-center gap-2">
          {canCopyDevToStaging && devConfig && stagingConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPromote('dev', 'staging')}
            >
              Copy dev
              <ArrowRight className="mx-1.5 h-3.5 w-3.5" />
              staging
            </Button>
          )}
          {canCopyStagingToProd && stagingConfig && prodConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPromote('staging', 'prod')}
            >
              Copy staging
              <ArrowRight className="mx-1.5 h-3.5 w-3.5" />
              prod
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {ENVIRONMENTS.map((envName) => (
          <EnvCard
            key={envName}
            flagKey={flag.key}
            flagType={flag.type}
            env={envName}
            enabled={flag.environments?.[envName]?.enabled ?? false}
            rolloutPct={flag.environments?.[envName]?.rollout_pct ?? 0}
            rules={flag.environments?.[envName]?.rules ?? []}
            orgId={orgId}
            canManage={canManage}
            onDirtyChange={handleEnvDirtyChange}
            isActive={envName === env}
          />
        ))}
      </div>

      <FlagTesterSection
        flagKey={flag.key}
        flagType={flag.type}
        orgId={orgId}
        initialEnv={env}
        openTest={openTest}
        canManage={canManage}
      />

      <EvalVolumeSection
        flagId={flag.id}
        env={env}
        orgId={orgId}
        defaultDays={usageHighlight ? 30 : 7}
      />

      <UsageLogSection flagKey={flag.key} orgId={orgId} initialEnv={env} />

      <AuditLogSection flagKey={flag.key} orgId={orgId} initialEnv={env} />
        </>
      )}

      {devConfig && stagingConfig && prodConfig && (
        <EnvPromoteDialog
          open={promoteOpen}
          onOpenChange={setPromoteOpen}
          flagKey={flag.key}
          sourceEnv={promoteSource}
          targetEnv={promoteTarget}
          sourceConfig={
            promoteSource === 'dev' ? devConfig : stagingConfig
          }
          targetConfig={
            promoteTarget === 'staging' ? stagingConfig : prodConfig
          }
          orgId={orgId}
          onApplied={() => router.refresh()}
        />
      )}

      {hasUnsavedChanges && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-5xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">
              Unsaved changes
              {dirtyEnvList.length > 0 && (
                <span className="font-normal text-muted-foreground">
                  {' '}
                  in {dirtyEnvList.join(', ')}
                </span>
              )}
              {metadataDirty && dirtyEnvList.length > 0 && (
                <span className="font-normal text-muted-foreground"> and flag details</span>
              )}
              {metadataDirty && dirtyEnvList.length === 0 && (
                <span className="font-normal text-muted-foreground"> to flag details</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">Save each section before leaving</p>
          </div>
        </div>
      )}
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

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.valueOf())) return ts
  return d.toLocaleString()
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

  useEffect(() => {
    setEnv(initialEnv || 'dev')
  }, [initialEnv])

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

  useEffect(() => {
    setEnv(initialEnv || 'dev')
  }, [initialEnv])

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
              <AuditEventRow key={e.id} event={e} />
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
  openTest,
  canManage,
}: {
  flagKey: string
  flagType: string
  orgId?: string
  initialEnv: string
  openTest?: boolean
  canManage: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken } = useAuth()
  const testPanelRef = useRef<HTMLDivElement>(null)
  const [env, setEnv] = useState(initialEnv || 'dev')
  const [userId, setUserId] = useState('')
  const [contextText, setContextText] = useState('{\n  \n}')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<FlagTestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEnv(initialEnv || 'dev')
  }, [initialEnv])

  useEffect(() => {
    if (openTest && testPanelRef.current) {
      testPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [openTest])

  function updateEnvInUrl(nextEnv: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('env', nextEnv)
    router.replace(`/flags/${encodeURIComponent(flagKey)}?${params.toString()}`, {
      scroll: false,
    })
  }

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
      refreshOnboardingStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to test evaluation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card
      id="test-evaluation"
      ref={testPanelRef}
      className="border border-border bg-card scroll-mt-6"
    >
      <CardHeader className="flex flex-col gap-3 space-y-0 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold tracking-tight">
            Test evaluation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Debug why this flag is on/off for a specific user and context.
          </p>
        </div>

        <Select
          value={env}
          onValueChange={(v) => {
            const next = v ?? 'dev'
            setEnv(next)
            updateEnvInUrl(next)
          }}
        >
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
        {!canManage && (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Read-only — you can run tests but cannot save flag changes.
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

        {result && result.details?.chain && (
          <EvalReasonChain chain={result.details.chain} enabled={result.enabled} />
        )}

        <div className="space-y-2">
          <Label>Context (JSON)</Label>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            className="min-h-28 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs text-foreground outline-none"
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
            disabled={submitting}
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
  onDirtyChange,
  isActive = false,
}: {
  flagKey: string
  flagType: string
  env: string
  enabled: boolean
  rolloutPct: number
  rules: Rule[]
  orgId?: string
  canManage: boolean
  onDirtyChange: (env: string, isDirty: boolean) => void
  isActive?: boolean
}) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [rolloutPct, setRolloutPct] = useState(initialPct)
  const [rules, setRules] = useState(initialRules)
  const [saving, setSaving] = useState(false)
  const savedRef = useRef<EnvConfigSnapshot>(
    snapshotEnvConfig(initialEnabled, initialPct, initialRules),
  )

  const isDirty = isEnvDirty(
    snapshotEnvConfig(enabled, rolloutPct, rules),
    savedRef.current,
  )

  useEffect(() => {
    onDirtyChange(env, isDirty)
    return () => onDirtyChange(env, false)
  }, [env, isDirty, onDirtyChange])

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
      savedRef.current = snapshotEnvConfig(enabled, rolloutPct, rules)
      onDirtyChange(env, false)
      toast.success(`Updated ${env}`)
      router.refresh()
    } catch {
      toast.error(`Failed to update ${env}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      className={cn(
        'border border-border bg-card',
        isDirty && 'ring-1 ring-primary/30',
        isActive && 'ring-2 ring-primary border-primary/40',
      )}
    >
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold tracking-tight">
            {env}
          </CardTitle>
          {isDirty && (
            <span className="text-xs font-medium text-primary">Unsaved</span>
          )}
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
          disabled={saving || !canManage || !isDirty}
          className="w-full"
          size="sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}
