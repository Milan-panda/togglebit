'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { api, type EnvConfig } from '@/lib/api'
import { diffEnvConfigs } from '@/lib/env-diff'
import { refreshOnboardingStatus } from '@/components/onboarding/getting-started-checklist'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  flagKey: string
  sourceEnv: string
  targetEnv: string
  sourceConfig: EnvConfig
  targetConfig: EnvConfig
  orgId?: string
  onApplied: () => void
}

export function EnvPromoteDialog({
  open,
  onOpenChange,
  flagKey,
  sourceEnv,
  targetEnv,
  sourceConfig,
  targetConfig,
  orgId,
  onApplied,
}: Props) {
  const { getToken } = useAuth()
  const [applying, setApplying] = useState(false)
  const [prodConfirmed, setProdConfirmed] = useState(false)

  const diffs = diffEnvConfigs(sourceConfig, targetConfig)
  const isProd = targetEnv === 'prod'

  async function handleApply() {
    if (isProd && !prodConfirmed) return

    setApplying(true)
    try {
      const token = await getToken()
      if (!token) return
      await api.flags.updateEnv(
        token,
        flagKey,
        targetEnv,
        {
          enabled: sourceConfig.enabled,
          rollout_pct: sourceConfig.rollout_pct,
          rules: sourceConfig.rules,
        },
        orgId,
      )
      toast.success(`Copied ${sourceEnv} → ${targetEnv}`)
      refreshOnboardingStatus()
      onApplied()
      onOpenChange(false)
      setProdConfirmed(false)
    } catch {
      toast.error('Failed to copy environment config')
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      onOpenChange(next)
      if (!next) setProdConfirmed(false)
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Copy {sourceEnv}
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            {targetEnv}
          </DialogTitle>
          <DialogDescription>
            Review changes before applying to {targetEnv}.
          </DialogDescription>
        </DialogHeader>

        {diffs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No differences — configs already match.</p>
        ) : (
          <div className="space-y-2 rounded-lg border border-border">
            {diffs.map((d) => (
              <div key={d.field} className="border-b border-border px-3 py-2 last:border-0">
                <p className="text-xs font-medium text-muted-foreground">{d.field}</p>
                <div className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Current ({targetEnv})</span>
                    <p className="font-mono text-xs break-all">{d.from}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">After copy</span>
                    <p className="font-mono text-xs break-all text-foreground">{d.to}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isProd && diffs.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 space-y-2">
            <p className="text-sm font-medium text-destructive">This affects live users</p>
            <p className="text-xs text-muted-foreground">
              Production changes apply immediately to real traffic after cache invalidation.
            </p>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={prodConfirmed}
                onChange={(e) => setProdConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>I understand this will change production flag behavior</span>
            </label>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={applying || diffs.length === 0 || (isProd && !prodConfirmed)}
          >
            {applying ? 'Applying…' : `Apply to ${targetEnv}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
