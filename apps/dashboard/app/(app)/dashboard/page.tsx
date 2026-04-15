import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { FlagTable } from '@/components/flags/flag-table'
import { CreateFlagDialog } from '@/components/flags/create-flag-dialog'
import { api } from '@/lib/api'

interface Props {
  searchParams: Promise<{ env?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const params = await searchParams
  const env = params.env || 'dev'

  let flags: Awaited<ReturnType<typeof api.flags.list>>
  try {
    flags = await api.flags.list(token, env)
  } catch {
    flags = { flags: [], total: 0 }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-sm text-muted-foreground">
            Manage your feature flags across environments.
          </p>
        </div>
        <CreateFlagDialog />
      </div>
      <FlagTable flags={flags.flags} env={env} />
    </div>
  )
}
