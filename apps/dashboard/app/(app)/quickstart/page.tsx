import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { api, type ApiKey } from '@/lib/api'
import { QuickstartClient } from './quickstart-client'

export default async function QuickstartPage() {
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

  const devKey = keys.find((k) => k.environment === 'dev')

  return <QuickstartClient keyPrefix={devKey?.key_prefix} hasKeys={keys.length > 0} />
}
