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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keys authenticate the SDK. Each key is scoped to one environment.
          </p>
        </div>
        <GenerateKeyDialog canManage={canManageKeys} orgId={orgSlug} />
      </div>

      {!canManageKeys && (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          View only ({orgRole}). Only owners and admins can generate or revoke keys.
        </p>
      )}

      <KeyList keys={keys} canRevoke={canManageKeys} orgId={orgSlug} />
    </div>
  )
}
