import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { DashboardCreateFlag } from '@/components/flags/dashboard-create-flag'
import { DashboardFlagList } from '@/components/flags/dashboard-flag-list'
import { FlagsErrorBanner } from '@/components/flags/flags-error-banner'
import { FlagsFilters } from '@/components/flags/flags-filters'
import { DashboardExtras } from '@/components/onboarding/dashboard-extras'
import { EnvSwitcher } from '@/components/layout/env-switcher'
import { api } from '@/lib/api'
import { FLAGS_PAGE_SIZE, hasActiveFlagsFilters, readFlagsFilters } from '@/lib/flags-url'

interface Props {
  searchParams: Promise<{
    env?: string
    org?: string
    q?: string
    type?: string
    enabled?: string
    has_rules?: string
    rollout_gt?: string
    sort?: string
    order?: string
    page?: string
  }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const params = await searchParams
  const env = params.env || 'dev'
  const orgSlug = params.org

  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.type) sp.set('type', params.type)
  if (params.enabled) sp.set('enabled', params.enabled)
  if (params.has_rules) sp.set('has_rules', params.has_rules)
  if (params.rollout_gt) sp.set('rollout_gt', params.rollout_gt)
  if (params.sort) sp.set('sort', params.sort)
  if (params.order) sp.set('order', params.order)
  if (params.page) sp.set('page', params.page)

  const urlFilters = readFlagsFilters(sp)
  const page = urlFilters.page
  const enabled =
    urlFilters.enabled === 'true' ? true : urlFilters.enabled === 'false' ? false : undefined

  let flags: Awaited<ReturnType<typeof api.flags.list>> = { flags: [], total: 0 }
  let listError: string | null = null
  let usageThisMonth = 0
  let usageSeries = {
    days: [] as string[],
    by_flag_id: {} as Record<string, number[]>,
    totals_by_flag_id: {} as Record<string, number>,
    flags: [] as Array<{ id: string; key: string; name: string }>,
  }
  let orgRole: 'owner' | 'admin' | 'developer' | 'member' = 'member'

  try {
    flags = await api.flags.list(token, env, orgSlug, {
      q: urlFilters.q || undefined,
      type: urlFilters.type !== 'all' ? urlFilters.type : undefined,
      enabled,
      has_rules: urlFilters.has_rules === 'true' ? true : undefined,
      rollout_gt: urlFilters.rollout_gt ? parseInt(urlFilters.rollout_gt, 10) : undefined,
      sort: urlFilters.sort,
      order: urlFilters.order,
      limit: FLAGS_PAGE_SIZE,
      offset: (page - 1) * FLAGS_PAGE_SIZE,
    })
  } catch (err) {
    listError = err instanceof Error ? err.message : 'Failed to load flags'
  }

  try {
    const [org, usage, flagUsage] = await Promise.all([
      api.orgs.me(token, orgSlug),
      api.usage.monthly(token, orgSlug),
      api.flags.usage.list(token, env, 7, orgSlug),
    ])
    orgRole = org.role
    usageThisMonth = usage.current.eval_count
    usageSeries = flagUsage
  } catch {
    // degrade gracefully
  }

  const hasActiveFilters = hasActiveFlagsFilters(urlFilters)
  const canManageFlags =
    orgRole === 'owner' || orgRole === 'admin' || orgRole === 'developer'
  const canDeleteFlags = orgRole === 'owner' || orgRole === 'admin'
  const showChecklist = orgRole === 'owner' || orgRole === 'admin'

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <DashboardExtras orgId={orgSlug} orgRole={orgRole} showChecklist={showChecklist} />
      </Suspense>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Flags</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <EnvSwitcher />
            <p className="text-sm text-muted-foreground">
              {flags.total} flag{flags.total === 1 ? '' : 's'}
              {usageThisMonth > 0 && (
                <> · {usageThisMonth.toLocaleString()} evals this month</>
              )}
            </p>
          </div>
        </div>
        <DashboardCreateFlag canCreate={orgRole !== 'member'} orgId={orgSlug} />
      </div>

      {orgRole === 'member' && (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          View only ({orgRole}). Owners, admins, and developers can edit flags.
        </p>
      )}

      {listError ? (
        <FlagsErrorBanner message={listError} />
      ) : (
        <>
          <FlagsFilters />
          <DashboardFlagList
            flags={flags.flags}
            env={env}
            orgId={orgSlug}
            canEdit={canManageFlags}
            canDelete={canDeleteFlags}
            hasActiveFilters={hasActiveFilters}
            usageByFlagId={usageSeries.by_flag_id}
            usageTotalsByFlagId={usageSeries.totals_by_flag_id}
            total={flags.total}
            page={page}
          />
        </>
      )}
    </div>
  )
}
