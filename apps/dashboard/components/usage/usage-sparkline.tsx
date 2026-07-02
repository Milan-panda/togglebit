'use client'

import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface UsageSparklineProps {
  data: number[]
  className?: string
}

export function UsageSparkline({ data, className }: UsageSparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }))
  const hasActivity = data.some((v) => v > 0)

  if (!hasActivity) {
    return (
      <div
        className={className}
        aria-hidden
        title="No evals in this period"
      >
        <svg viewBox="0 0 64 20" className="h-5 w-16 text-muted-foreground/40">
          <line x1="0" y1="10" x2="64" y2="10" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        </svg>
      </div>
    )
  }

  return (
    <div className={className} aria-hidden>
      <ResponsiveContainer width="100%" height={20}>
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.15}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
