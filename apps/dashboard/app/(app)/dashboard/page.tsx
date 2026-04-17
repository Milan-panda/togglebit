import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { FlagTable } from '@/components/flags/flag-table'
import { CreateFlagDialog } from '@/components/flags/create-flag-dialog'
import { api } from '@/lib/api'

interface Props {
  searchParams: Promise<{ env?: string; org?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const params = await searchParams
  const env = params.env || 'dev'
  const orgSlug = params.org

  let flags: Awaited<ReturnType<typeof api.flags.list>>
  let orgRole: 'owner' | 'admin' | 'developer' | 'member' = 'member'
  try {
    flags = await api.flags.list(token, env, orgSlug)
    const org = await api.orgs.me(token, orgSlug)
    orgRole = org.role
  } catch {
    flags = { flags: [], total: 0 }
  }
  const canManageFlags =
    orgRole === 'owner' || orgRole === 'admin' || orgRole === 'developer'

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 md:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(85%_70%_at_30%_0%,hsl(var(--foreground)/0.10),transparent_60%),radial-gradient(60%_40%_at_90%_110%,hsl(var(--foreground)/0.06),transparent_60%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-[24px]">
              Feature flags
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create, target, and roll out changes safely per environment.
            </p>
          </div>
          <CreateFlagDialog canCreate={orgRole !== 'member'} orgId={orgSlug} />
        </div>
      </div>
      {!canManageFlags && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Your current role is <span className="font-semibold">{orgRole}</span>. You can view
          flags, but only owners/admins/developers can create or update them.
        </div>
      )}
      <FlagTable
        flags={flags.flags}
        env={env}
        orgId={orgSlug}
        canEdit={canManageFlags}
      />
    </div>
  )
}
