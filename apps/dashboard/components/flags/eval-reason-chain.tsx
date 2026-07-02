'use client'

import { Check, X } from 'lucide-react'
import type { EvalReasonChainStep } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Props {
  chain: EvalReasonChainStep[]
  enabled: boolean
}

export function EvalReasonChain({ chain, enabled }: Props) {
  if (enabled || chain.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Why off?
      </p>
      <ol className="mt-3 space-y-2">
        {chain.map((step, i) => (
          <li key={`${step.label}-${i}`} className="flex items-start gap-2 text-sm">
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                step.passed
                  ? 'bg-primary/15 text-primary'
                  : 'bg-destructive/15 text-destructive',
              )}
            >
              {step.passed ? (
                <Check className="h-2.5 w-2.5" />
              ) : (
                <X className="h-2.5 w-2.5" />
              )}
            </span>
            <span className={cn(!step.passed && 'font-medium text-foreground')}>
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
