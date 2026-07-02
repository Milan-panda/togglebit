import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { api, type ApiKey } from '@/lib/api'
import { QuickstartClient } from './quickstart-client'

interface Props {
  searchParams: Promise<{ org?: string; env?: string }>
}

export default async function QuickstartPage({ searchParams }: Props) {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const params = await searchParams
  const orgSlug = params.org
  const env = params.env || 'dev'

  let keys: ApiKey[] = []
  let firstFlagKey: string | null = null
  try {
    keys = await api.keys.list(token, orgSlug)
    const flags = await api.flags.list(token, env, orgSlug, { limit: 1 })
    firstFlagKey = flags.flags[0]?.key ?? null
  } catch {
    keys = []
  }

  const envKey = keys.find((k) => k.environment === env) ?? keys.find((k) => k.environment === 'dev')

  return (
    <QuickstartClient
      keyPrefix={envKey?.key_prefix}
      hasKeys={keys.length > 0}
      orgId={orgSlug}
      environment={env}
      firstFlagKey={firstFlagKey}
    />
  )
}
