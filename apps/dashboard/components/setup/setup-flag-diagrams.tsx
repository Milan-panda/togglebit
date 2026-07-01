'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

const easeOut = [0.22, 1, 0.36, 1] as const

function useMotionSafe() {
  const reduce = useReducedMotion()
  return {
    reduce,
    transition: reduce ? { duration: 0 } : { duration: 0.5, ease: easeOut },
    stagger: reduce ? 0 : 0.06,
  }
}

export function EvalFlowDiagram() {
  const { reduce, transition, stagger } = useMotionSafe()
  const steps = [
    { label: 'Your app', sub: 'Server or client' },
    { label: 'SDK', sub: 'togglebit' },
    { label: 'Eval API', sub: 'Cached response' },
    { label: 'Result', sub: 'true / false' },
  ]

  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 sm:px-6">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-stretch sm:justify-center sm:gap-0">
        {steps.map((step, i) => (
          <div key={step.label} className="flex w-full flex-col items-center sm:w-auto sm:flex-row sm:items-center">
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ ...transition, delay: i * stagger }}
              className="flex w-full min-w-[120px] flex-col items-center justify-center rounded-lg border border-border bg-background px-4 py-3 text-center shadow-sm sm:w-[140px] sm:min-h-[72px]"
            >
              <span className="text-sm font-medium">{step.label}</span>
              <span className="mt-0.5 text-xs text-muted-foreground">{step.sub}</span>
            </motion.div>
            {i < steps.length - 1 && (
              <motion.span
                initial={reduce ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ ...transition, delay: i * stagger + 0.08 }}
                className="my-1 shrink-0 px-2 text-muted-foreground sm:my-0"
                aria-hidden
              >
                <span className="sm:hidden">↓</span>
                <span className="hidden sm:inline">→</span>
              </motion.span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function BooleanDiagram() {
  const { reduce, transition } = useMotionSafe()

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/20 p-6">
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...transition, delay: i * 0.04 }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary"
          >
            {i + 1}
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ ...transition, delay: 0.35 }}
        className="flex items-center gap-2 text-sm"
      >
        <span className="inline-flex h-6 w-11 items-center rounded-full bg-primary px-0.5">
          <motion.span
            className="block h-5 w-5 rounded-full bg-primary-foreground shadow-sm"
            initial={reduce ? { x: 20 } : { x: 0 }}
            whileInView={{ x: 20 }}
            viewport={{ once: true }}
            transition={{ ...transition, delay: 0.4 }}
          />
        </span>
        <span className="text-muted-foreground">Flag on → everyone gets true</span>
      </motion.div>
    </div>
  )
}

export function PercentageDiagram({ rollout = 40 }: { rollout?: number }) {
  const { reduce, transition } = useMotionSafe()
  const users = Array.from({ length: 10 }, (_, i) => {
    const bucket = (i * 11 + 7) % 100
    return { id: i, bucket, on: bucket < rollout }
  })

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-6">
      <div className="flex flex-wrap justify-center gap-2">
        {users.map((user, i) => (
          <motion.div
            key={user.id}
            initial={reduce ? false : { opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...transition, delay: i * 0.05 }}
            className={cn(
              'flex h-10 w-10 flex-col items-center justify-center rounded-full text-[10px] font-medium',
              user.on
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground ring-1 ring-border',
            )}
            title={`Bucket ${user.bucket}`}
          >
            <span>{user.id + 1}</span>
          </motion.div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Rollout {rollout}%</span>
          <span>Stable bucket per userId</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={reduce ? { width: `${rollout}%` } : { width: 0 }}
            whileInView={{ width: `${rollout}%` }}
            viewport={{ once: true }}
            transition={{ ...transition, delay: 0.2 }}
          />
        </div>
      </div>
    </div>
  )
}

export function SegmentDiagram() {
  const { reduce, transition } = useMotionSafe()
  const users = [
    { label: 'A', plan: 'free', match: false },
    { label: 'B', plan: 'pro', match: true },
    { label: 'C', plan: 'pro', match: true },
    { label: 'D', plan: 'free', match: false },
  ]

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-6">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-md bg-background px-2.5 py-1 ring-1 ring-border">
          plan <span className="font-mono text-primary">eq</span> &quot;pro&quot;
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {users.map((user, i) => (
          <motion.div
            key={user.label}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...transition, delay: i * 0.08 }}
            className={cn(
              'rounded-lg border px-3 py-3 text-center',
              user.match
                ? 'border-primary/40 bg-primary/10'
                : 'border-border bg-background opacity-50',
            )}
          >
            <div className="text-sm font-medium">User {user.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">plan: {user.plan}</div>
            <div className={cn('mt-2 text-xs font-medium', user.match ? 'text-primary' : 'text-muted-foreground')}>
              {user.match ? 'Match' : 'No match'}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function CombinedDiagram() {
  const { reduce, transition } = useMotionSafe()

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={transition}
          className="rounded-lg border border-border bg-background p-3 text-center text-xs"
        >
          <div className="font-medium">All users</div>
          <div className="mt-1 text-muted-foreground">100</div>
        </motion.div>
        <div className="hidden text-muted-foreground sm:block">→</div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...transition, delay: 0.15 }}
          className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center text-xs"
        >
          <div className="font-medium">Segment rules</div>
          <div className="mt-1 text-muted-foreground">plan = pro</div>
          <div className="mt-2 font-medium text-primary">32 eligible</div>
        </motion.div>
        <div className="hidden text-muted-foreground sm:block">→</div>
        <motion.div
          initial={reduce ? false : { opacity: 0, x: 8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ ...transition, delay: 0.3 }}
          className="rounded-lg border border-border bg-background p-3 text-center text-xs"
        >
          <div className="font-medium">25% rollout</div>
          <div className="mt-1 text-muted-foreground">Among eligible only</div>
          <div className="mt-2 font-medium text-primary">~8 see feature</div>
        </motion.div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Rules filter first. Percentage applies only to users who pass.
      </p>
    </div>
  )
}

export function FlagTypeDiagram({ type }: { type: string }) {
  switch (type) {
    case 'boolean':
      return <BooleanDiagram />
    case 'percentage':
      return <PercentageDiagram rollout={40} />
    case 'segment':
      return <SegmentDiagram />
    case 'combined':
      return <CombinedDiagram />
    default:
      return null
  }
}
