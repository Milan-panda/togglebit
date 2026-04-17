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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { ENVIRONMENTS } from '@/lib/constants'
import { RuleBuilder } from '@/components/flags/rule-builder'
import type { Rule } from '@/lib/api'

export function CreateFlagDialog({
  canCreate = true,
  orgId,
}: {
  canCreate?: boolean
  orgId?: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [type, setType] = useState('boolean')
  const [rolloutPct, setRolloutPct] = useState(0)
  const [rules, setRules] = useState<Rule[]>([])
  const router = useRouter()
  const { getToken } = useAuth()

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

      await api.flags.create(token, {
        key,
        name,
        type,
        environments: Object.fromEntries(ENVIRONMENTS.map((e) => [e, envConfig])),
      }, orgId)
      toast.success(`Flag "${name}" created`)
      setOpen(false)
      setName('')
      setKey('')
      setType('boolean')
      setRolloutPct(0)
      setRules([])
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create flag'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            disabled={!canCreate}
            title={canCreate ? undefined : 'Your role cannot create flags'}
            className="rounded-full bg-primary px-4 hover:bg-[var(--primary-hover)]"
          />
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Flag
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new flag</DialogTitle>
          <DialogDescription>
            Set up the key, type, and rollout defaults. You can tune per environment later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Dark mode"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              placeholder="dark-mode"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              pattern="^[a-z0-9][a-z0-9\-]*[a-z0-9]$"
            />
            <p className="text-xs text-muted-foreground">
              URL-safe slug used in your code
            </p>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="segment">Segment</SelectItem>
                <SelectItem value="combined">Segment + Percentage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(type === 'percentage' || type === 'combined') && (
            <div className="space-y-2">
              <Label>Initial rollout %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={rolloutPct}
                className="rounded-xl"
                onChange={(e) => setRolloutPct(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Applies to all environments; you can edit per-environment later.
              </p>
            </div>
          )}
          {(type === 'segment' || type === 'combined') && (
            <RuleBuilder rules={rules} onChange={setRules} />
          )}
          <Button type="submit" className="w-full rounded-full bg-primary hover:bg-[var(--primary-hover)]" disabled={loading}>
            {loading ? 'Creating...' : 'Create Flag'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
