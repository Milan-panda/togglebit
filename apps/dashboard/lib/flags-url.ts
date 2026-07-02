export type FlagsFilterParams = {
  q: string
  type: string
  enabled: 'all' | 'true' | 'false'
  has_rules: 'all' | 'true'
  rollout_gt: string
  sort: 'name' | 'created_at' | 'eval_volume'
  order: 'asc' | 'desc'
  page: number
}

export function readFlagsFilters(searchParams: URLSearchParams): FlagsFilterParams {
  const enabledParam = searchParams.get('enabled')
  const sortParam = searchParams.get('sort')
  const orderParam = searchParams.get('order')
  const pageParam = searchParams.get('page')

  return {
    q: searchParams.get('q') ?? '',
    type: searchParams.get('type') ?? 'all',
    enabled:
      enabledParam === 'true'
        ? 'true'
        : enabledParam === 'false'
          ? 'false'
          : 'all',
    has_rules: searchParams.get('has_rules') === 'true' ? 'true' : 'all',
    rollout_gt: searchParams.get('rollout_gt') ?? '',
    sort:
      sortParam === 'name' || sortParam === 'eval_volume' ? sortParam : 'created_at',
    order: orderParam === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, parseInt(pageParam || '1', 10) || 1),
  }
}

export function hasActiveFlagsFilters(filters: FlagsFilterParams): boolean {
  return Boolean(
    filters.q ||
      filters.type !== 'all' ||
      filters.enabled !== 'all' ||
      filters.has_rules !== 'all' ||
      filters.rollout_gt ||
      filters.sort !== 'created_at' ||
      filters.order !== 'desc' ||
      filters.page > 1,
  )
}

export function applyFlagsFilterUpdates(
  searchParams: URLSearchParams,
  updates: Partial<{
    q: string | null
    type: string | null
    enabled: string | null
    has_rules: string | null
    rollout_gt: string | null
    sort: string | null
    order: string | null
    page: string | null
  }>,
): URLSearchParams {
  const sp = new URLSearchParams(searchParams.toString())

  if ('q' in updates) {
    const q = updates.q?.trim()
    if (q) sp.set('q', q)
    else sp.delete('q')
  }

  if ('type' in updates) {
    const type = updates.type
    if (type && type !== 'all') sp.set('type', type)
    else sp.delete('type')
  }

  if ('enabled' in updates) {
    const enabled = updates.enabled
    if (enabled && enabled !== 'all') sp.set('enabled', enabled)
    else sp.delete('enabled')
  }

  if ('has_rules' in updates) {
    const hasRules = updates.has_rules
    if (hasRules === 'true') sp.set('has_rules', 'true')
    else sp.delete('has_rules')
  }

  if ('rollout_gt' in updates) {
    const rolloutGt = updates.rollout_gt?.trim()
    if (rolloutGt) sp.set('rollout_gt', rolloutGt)
    else sp.delete('rollout_gt')
  }

  if ('sort' in updates) {
    const sort = updates.sort
    if (sort && sort !== 'created_at') sp.set('sort', sort)
    else sp.delete('sort')
  }

  if ('order' in updates) {
    const order = updates.order
    if (order && order !== 'desc') sp.set('order', order)
    else sp.delete('order')
  }

  if ('page' in updates) {
    const page = updates.page
    if (page && page !== '1') sp.set('page', page)
    else sp.delete('page')
  }

  return sp
}

export function buildDashboardUrl(pathname: string, env: string, orgId?: string): string {
  const sp = new URLSearchParams()
  sp.set('env', env)
  if (orgId) sp.set('org', orgId)
  return `${pathname}?${sp.toString()}`
}

export const FLAGS_PAGE_SIZE = 50
