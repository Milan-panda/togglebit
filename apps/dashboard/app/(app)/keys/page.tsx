import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { api, type ApiKey } from '@/lib/api'
import { KeyList } from '@/components/keys/key-list'
import { GenerateKeyDialog } from '@/components/keys/generate-key-dialog'

export default async function KeysPage() {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  let keys: ApiKey[] = []
  try {
    keys = await api.keys.list(token)
  } catch {
    keys = []
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Manage keys for SDK authentication. Each key is scoped to one environment.
          </p>
        </div>
        <GenerateKeyDialog />
      </div>
      <KeyList keys={keys} />
    </div>
  )
}
