'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { ENVIRONMENTS } from '@/lib/constants'
import { refreshOnboardingStatus } from '@/components/onboarding/getting-started-checklist'
import { RuleBuilder } from '@/components/flags/rule-builder'
import { cn } from '@/lib/utils'
import type { Rule } from '@/lib/api'

const FLAG_TYPES = [
  {
    value: 'boolean',
    label: 'Boolean',
    hint: 'Simple on/off',
  },
  {
    value: 'percentage',
    label: 'Percentage',
    hint: 'Gradual rollout',
  },
  {
    value: 'segment',
    label: 'Segment',
    hint: 'Target by attributes',
  },
  {
    value: 'combined',
    label: 'Combined',
    hint: 'Rules + rollout',
  },
] as const

const FLAG_TEMPLATES = [
  {
    id: 'kill-switch',
    label: 'Kill switch',
    hint: 'Boolean on/off',
    type: 'boolean',
    rolloutPct: 0,
    rules: [] as Rule[],
  },
  {
    id: 'beta-rollout',
    label: 'Beta rollout',
    hint: '50% gradual rollout',
    type: 'percentage',
    rolloutPct: 50,
    rules: [] as Rule[],
  },
  {
    id: 'pro-users',
    label: 'Pro users only',
    hint: 'Segment by plan',
    type: 'segment',
    rolloutPct: 0,
    rules: [{ attribute: 'plan', operator: 'in', value: ['pro', 'enterprise'] }] as Rule[],
  },
] as const

export function CreateFlagDialog({
  canCreate = true,
  orgId,
  defaultOpen = false,
}: {
  canCreate?: boolean
  orgId?: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('boolean')
  const [rolloutPct, setRolloutPct] = useState(0)
  const [rules, setRules] = useState<Rule[]>([])
  const router = useRouter()
  const { getToken } = useAuth()

  function resetForm() {
    setName('')
    setKey('')
    setDescription('')
    setType('boolean')
    setRolloutPct(0)
    setRules([])
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) resetForm()
  }

  function handleNameChange(value: string) {
    setName(value)
    setKey(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!key || !name) return

    setLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const needsRollout = type === 'percentage' || type === 'combined'
      const needsRules = type === 'segment' || type === 'combined'

      const envConfig = {
        enabled: false,
        rollout_pct: needsRollout ? rolloutPct : 0,
        rules: needsRules ? rules : [],
      }

      await api.flags.create(
        token,
        {
          key,
          name,
          description: description.trim() || null,
          type,
          environments: Object.fromEntries(ENVIRONMENTS.map((e) => [e, envConfig])),
        },
        orgId,
      )
      toast.success(`Flag "${name}" created`)
      refreshOnboardingStatus()
      setOpen(false)
      resetForm()
      const params = new URLSearchParams({ env: 'dev', test: '1' })
      if (orgId) params.set('org', orgId)
      router.push(`/flags/${key}?${params.toString()}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create flag'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const showRollout = type === 'percentage' || type === 'combined'
  const showRules = type === 'segment' || type === 'combined'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            disabled={!canCreate}
            title={canCreate ? undefined : 'Your role cannot create flags'}
          />
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Create flag
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="text-lg font-semibold">New flag</DialogTitle>
          <DialogDescription>
            Starts disabled in every environment. Tune rollout and targeting on the flag page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5 overflow-y-auto px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Dark mode"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="key">Key</Label>
                <Input
                  id="key"
                  placeholder="dark-mode"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  pattern="^[a-z0-9][a-z0-9\-]*[a-z0-9]$"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Key is what you pass to{' '}
              <code className="rounded bg-code-bg px-1 py-0.5 font-mono">useFlag()</code> in code.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Optional — what this flag controls"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {FLAG_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setType(template.type)
                      setRolloutPct(template.rolloutPct)
                      setRules(template.rules)
                    }}
                    className="rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="block text-sm font-medium">{template.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{template.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {FLAG_TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-left transition-colors',
                      type === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {showRollout && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rollout">Initial rollout</Label>
                  <span className="text-sm font-medium tabular-nums">{rolloutPct}%</span>
                </div>
                <input
                  id="rollout"
                  type="range"
                  min={0}
                  max={100}
                  value={rolloutPct}
                  onChange={(e) => setRolloutPct(Number(e.target.value))}
                  className="tb-range h-2 w-full cursor-pointer appearance-none rounded-full bg-muted"
                  style={{
                    background: `linear-gradient(to right, var(--progress-fill) 0%, var(--progress-fill) ${rolloutPct}%, var(--progress-track) ${rolloutPct}%, var(--progress-track) 100%)`,
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Same starting value for dev, staging, and prod. Edit per env later.
                </p>
              </div>
            )}

            {showRules && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <RuleBuilder rules={rules} onChange={setRules} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name || !key}>
              {loading ? 'Creating…' : 'Create flag'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
