'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RuleBuilder } from '@/components/flags/rule-builder'
import { api, type Flag, type Rule } from '@/lib/api'
import { ENVIRONMENTS } from '@/lib/constants'

interface Props {
  flag: Flag
}

export function FlagDetailClient({ flag }: Props) {
  const router = useRouter()
  const { getToken } = useAuth()

  async function handleDelete() {
    if (!confirm(`Delete flag "${flag.key}"? This cannot be undone.`)) return
    const token = await getToken()
    if (!token) return
    try {
      await api.flags.delete(token, flag.key)
      toast.success(`Flag "${flag.key}" deleted`)
      router.push('/dashboard')
    } catch {
      toast.error('Failed to delete flag')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{flag.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
              {flag.key}
            </code>
            <Badge variant="secondary">{flag.type}</Badge>
          </div>
          {flag.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {flag.description}
            </p>
          )}
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
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
}: {
  flagKey: string
  flagType: string
  env: string
  enabled: boolean
  rolloutPct: number
  rules: Rule[]
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
      })
      toast.success(`Updated ${env}`)
    } catch {
      toast.error(`Failed to update ${env}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-medium">{env}</CardTitle>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </CardHeader>
      <CardContent className="space-y-4">
        {flagType === 'percentage' && (
          <div className="space-y-2">
            <Label>Rollout %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={rolloutPct}
              onChange={(e) => setRolloutPct(Number(e.target.value))}
            />
          </div>
        )}
        {flagType === 'segment' && (
          <RuleBuilder rules={rules} onChange={setRules} />
        )}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}
