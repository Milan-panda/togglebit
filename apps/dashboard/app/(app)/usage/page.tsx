import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnvSwitcher } from '@/components/layout/env-switcher'
import { UsageChart } from '@/components/usage/usage-chart'
import { UsageSparkline } from '@/components/usage/usage-sparkline'
import { api } from '@/lib/api'
import { withOrgAndEnv } from '@/lib/env-url'

interface Props {
  searchParams: Promise<{ org?: string; env?: string }>
}

function sumDailyTotals(
  days: string[],
  byFlagId: Record<string, number[]>,
): Array<{ day: string; count: number }> {
  return days.map((day, i) => {
    let count = 0
    for (const series of Object.values(byFlagId)) {
      count += series[i] ?? 0
    }
    return { day, count }
  })
}

export default async function UsagePage({ searchParams }: Props) {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const params = await searchParams
  const env = params.env || 'dev'
  const orgSlug = params.org

  let monthly = { current: { month: '', eval_count: 0 }, series: [] as Array<{ month: string; eval_count: number }> }
  let usage = { days: [] as string[], by_flag_id: {} as Record<string, number[]>, totals_by_flag_id: {} as Record<string, number>, flags: [] as Array<{ id: string; key: string; name: string }> }

  try {
    ;[monthly, usage] = await Promise.all([
      api.usage.monthly(token, orgSlug),
      api.flags.usage.list(token, env, 30, orgSlug),
    ])
  } catch {
    // degrade gracefully
  }

  const priorMonth = monthly.series[1]?.eval_count ?? 0
  const currentCount = monthly.current.eval_count
  const trendPct =
    priorMonth > 0 ? Math.round(((currentCount - priorMonth) / priorMonth) * 100) : null

  const chartData = sumDailyTotals(usage.days, usage.by_flag_id)

  const flagMeta = new Map(usage.flags.map((f) => [f.id, f]))
  const topFlags = Object.entries(usage.totals_by_flag_id)
    .map(([id, total]) => ({
      id,
      total,
      meta: flagMeta.get(id),
      series: usage.by_flag_id[id] ?? [],
    }))
    .filter((row) => row.meta)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
          <EnvSwitcher />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Evals this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {currentCount.toLocaleString()}
            </p>
            {trendPct !== null && (
              <p className="mt-1 text-sm text-muted-foreground">
                {trendPct >= 0 ? '+' : ''}
                {trendPct}% vs last month
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top flags by volume</CardTitle>
        </CardHeader>
        <CardContent>
          {topFlags.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No eval activity in the last 30 days for {env}.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {topFlags.map((row) => (
                <Link
                  key={row.id}
                  href={withOrgAndEnv(`/flags/${row.meta!.key}`, orgSlug, env) + '&tab=usage'}
                  className="flex items-center gap-4 py-3 transition-colors hover:bg-muted/40 -mx-2 px-2 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.meta!.name}</p>
                    <code className="text-xs text-muted-foreground">{row.meta!.key}</code>
                  </div>
                  <Badge variant="secondary">{env}</Badge>
                  <div className="w-20">
                    <UsageSparkline data={row.series} className="h-5 w-20" />
                  </div>
                  <span className="w-16 text-right text-sm tabular-nums font-medium">
                    {row.total.toLocaleString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
