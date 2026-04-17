'use client'

import { useState } from 'react'
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
import { RuleBuilder } from '@/components/flags/rule-builder'
import { api, type Flag, type Rule } from '@/lib/api'
import { ENVIRONMENTS } from '@/lib/constants'

interface Props {
  flag: Flag
  orgId?: string
  canManage: boolean
  canDelete: boolean
}

export function FlagDetailClient({ flag, orgId, canManage, canDelete }: Props) {
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href={orgId ? `/dashboard?org=${encodeURIComponent(orgId)}` : '/dashboard'}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-2 rounded-full border border-border bg-background/60')}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
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
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Your role is read-only for flag edits. Ask an owner, admin, or developer to update
          rollout, targeting rules, or toggle state.
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 md:p-6">
        <div className="relative">
          <h1 className="text-2xl font-semibold tracking-tight">{flag.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-muted px-2 py-1 text-xs">
              {flag.key}
            </code>
            <Badge variant="secondary">{flag.type}</Badge>
          </div>
          {flag.description && (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              {flag.description}
            </p>
          )}
        </div>
      </div>

      <Separator className="opacity-60" />

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
    </div>
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
    <Card className="relative overflow-hidden border border-border/80 bg-card">
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
          className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary hover:brightness-100 hover:shadow-none cursor-pointer"
          size="sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}
