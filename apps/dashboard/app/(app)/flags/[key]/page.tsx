import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { Suspense } from 'react'
import { api, type ApiKey } from '@/lib/api'
import { FlagDetailClient } from './flag-detail-client'

interface Props {
  params: Promise<{ key: string }>
  searchParams: Promise<{ org?: string; env?: string; tab?: string; test?: string }>
}

export default async function FlagDetailPage({ params, searchParams }: Props) {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const { key } = await params
  const sp = await searchParams
  const orgSlug = sp.org
  const env = sp.env || 'dev'
  const activeTab = sp.tab === 'code' ? 'code' : 'config'
  const openTest = sp.test === '1'

  let flag
  let orgRole: 'owner' | 'admin' | 'developer' | 'member' = 'member'
  let apiKeyPlaceholder = 'tb_dev_your_api_key_here'

  try {
    flag = await api.flags.get(token, key, orgSlug)
    const org = await api.orgs.me(token, orgSlug)
    orgRole = org.role

    let keys: ApiKey[] = []
    try {
      keys = await api.keys.list(token, orgSlug)
    } catch {
      keys = []
    }
    const envKey = keys.find((k) => k.environment === env) ?? keys.find((k) => k.environment === 'dev')
    if (envKey) {
      apiKeyPlaceholder = `${envKey.key_prefix}...your_full_key_here`
    }
  } catch {
    notFound()
  }

  return (
    <Suspense fallback={null}>
      <FlagDetailClient
        flag={flag}
        orgId={orgSlug}
        env={env}
        activeTab={activeTab}
        openTest={openTest}
        usageHighlight={sp.tab === 'usage'}
        apiKeyPlaceholder={apiKeyPlaceholder}
        canManage={orgRole === 'owner' || orgRole === 'admin' || orgRole === 'developer'}
        canDelete={orgRole === 'owner' || orgRole === 'admin'}
      />
    </Suspense>
  )
}
