import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { api, type ApiKey } from '@/lib/api'
import { KeyList } from '@/components/keys/key-list'
import { GenerateKeyDialog } from '@/components/keys/generate-key-dialog'

interface Props {
  searchParams: Promise<{ org?: string }>
}

export default async function KeysPage({ searchParams }: Props) {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const params = await searchParams
  const orgSlug = params.org
  let keys: ApiKey[] = []
  let orgRole: 'owner' | 'admin' | 'developer' | 'member' = 'member'
  try {
    keys = await api.keys.list(token, orgSlug)
    const org = await api.orgs.me(token, orgSlug)
    orgRole = org.role
  } catch {
    keys = []
  }
  const canManageKeys = orgRole === 'owner' || orgRole === 'admin'

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-[24px]">API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Manage keys for SDK authentication. Each key is scoped to one environment.
          </p>
        </div>
        <GenerateKeyDialog canManage={canManageKeys} orgId={orgSlug} />
      </div>
      {!canManageKeys && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          {orgRole === 'developer'
            ? 'Your role is developer. You can view API keys, but only owners/admins can generate or revoke keys.'
            : `Your role is ${orgRole}. This section is read-only for you.`}
        </div>
      )}
      <KeyList
        keys={keys}
        canRevoke={canManageKeys}
        orgId={orgSlug}
      />
    </div>
  )
}
