import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { FlagDetailClient } from './flag-detail-client'

interface Props {
  params: Promise<{ key: string }>
  searchParams: Promise<{ org?: string }>
}

export default async function FlagDetailPage({ params, searchParams }: Props) {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const { key } = await params
  const sp = await searchParams
  const orgSlug = sp.org

  let flag
  let orgRole: 'owner' | 'admin' | 'developer' | 'member' = 'member'
  try {
    flag = await api.flags.get(token, key, orgSlug)
    const org = await api.orgs.me(token, orgSlug)
    orgRole = org.role
  } catch {
    notFound()
  }

  return (
    <FlagDetailClient
      flag={flag}
      orgId={orgSlug}
      canManage={orgRole === 'owner' || orgRole === 'admin' || orgRole === 'developer'}
      canDelete={orgRole === 'owner' || orgRole === 'admin'}
    />
  )
}
