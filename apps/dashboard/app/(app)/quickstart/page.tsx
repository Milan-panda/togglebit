import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { api, type ApiKey } from '@/lib/api'
import { QuickstartClient } from './quickstart-client'

interface Props {
  searchParams: Promise<{ org?: string }>
}

export default async function QuickstartPage({ searchParams }: Props) {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const params = await searchParams
  const orgSlug = params.org

  let keys: ApiKey[] = []
  try {
    keys = await api.keys.list(token, orgSlug)
  } catch {
    keys = []
  }

  const devKey = keys.find((k) => k.environment === 'dev')

  return (
    <QuickstartClient
      keyPrefix={devKey?.key_prefix}
      hasKeys={keys.length > 0}
      orgId={orgSlug}
    />
  )
}
