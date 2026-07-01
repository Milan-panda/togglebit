import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { FlagTable } from '@/components/flags/flag-table'
import { CreateFlagDialog } from '@/components/flags/create-flag-dialog'
import { FlagsFilters } from '@/components/flags/flags-filters'
import { EnvSwitcher } from '@/components/layout/env-switcher'
import { api } from '@/lib/api'

interface Props {
  searchParams: Promise<{ env?: string; org?: string; q?: string; type?: string; enabled?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const params = await searchParams
  const env = params.env || 'dev'
  const orgSlug = params.org
  const q = params.q || ''
  const type = params.type || 'all'
  const enabled = params.enabled === 'true' ? true : params.enabled === 'false' ? false : undefined

  let flags: Awaited<ReturnType<typeof api.flags.list>>
  let usageThisMonth = 0
  let orgRole: 'owner' | 'admin' | 'developer' | 'member' = 'member'
  try {
    flags = await api.flags.list(token, env, orgSlug, {
      q: q || undefined,
      type: type !== 'all' ? type : undefined,
      enabled,
    })
    const org = await api.orgs.me(token, orgSlug)
    orgRole = org.role
    const usage = await api.usage.monthly(token, orgSlug)
    usageThisMonth = usage.current.eval_count
  } catch {
    flags = { flags: [], total: 0 }
  }
  const canManageFlags =
    orgRole === 'owner' || orgRole === 'admin' || orgRole === 'developer'

  return (
    <div className="space-y-6">
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
          <p className="text-xs text-muted-foreground">
            Controls which environment&apos;s on/off state and rollout you see in this list.
          </p>
        </div>
        <CreateFlagDialog canCreate={orgRole !== 'member'} orgId={orgSlug} />
      </div>

      {!canManageFlags && (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          View only ({orgRole}). Owners, admins, and developers can edit flags.
        </p>
      )}

      <FlagsFilters
        initialQ={q}
        initialType={type}
        initialEnabled={
          params.enabled === 'true' ? 'true' : params.enabled === 'false' ? 'false' : 'all'
        }
      />
      <FlagTable
        flags={flags.flags}
        env={env}
        orgId={orgSlug}
        canEdit={canManageFlags}
      />
    </div>
  )
}
