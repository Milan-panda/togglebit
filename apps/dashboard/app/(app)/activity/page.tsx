import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ActivityClient } from './activity-client'
import { api } from '@/lib/api'

interface Props {
  searchParams: Promise<{ org?: string; env?: string }>
}

export default async function ActivityPage({ searchParams }: Props) {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const params = await searchParams
  const orgSlug = params.org

  let members: Awaited<ReturnType<typeof api.orgs.members>> = []
  try {
    members = await api.orgs.members(token, orgSlug)
  } catch {
    members = []
  }

  return <ActivityClient orgId={orgSlug} members={members} />
}
