'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UsageChart } from '@/components/usage/usage-chart'
import { api } from '@/lib/api'

interface Props {
  flagId: string
  env: string
  orgId?: string
  defaultDays?: 7 | 30
}

export function EvalVolumeSection({ flagId, env, orgId, defaultDays = 7 }: Props) {
  const { getToken } = useAuth()
  const [days, setDays] = useState<7 | 30>(defaultDays)
  const [chartData, setChartData] = useState<Array<{ day: string; count: number }>>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await api.flags.usage.list(token, env, days, orgId)
      const series = res.by_flag_id[flagId] ?? []
      setChartData(
        res.days.map((day, i) => ({
          day,
          count: series[i] ?? 0,
        })),
      )
      setTotal(res.totals_by_flag_id[flagId] ?? 0)
    } catch {
      setChartData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [getToken, env, days, orgId, flagId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Card id="eval-volume">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Eval volume</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily evaluation count for {env}
            {!loading && <> · {total.toLocaleString()} total</>}
          </p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v) as 7 | 30)}>
          <SelectTrigger size="sm" className="min-w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <UsageChart data={chartData} />
        )}
      </CardContent>
    </Card>
  )
}
