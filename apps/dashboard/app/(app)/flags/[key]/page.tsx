import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { api } from '@/lib/api'
import { FlagDetailClient } from './flag-detail-client'

interface Props {
  params: Promise<{ key: string }>
}

export default async function FlagDetailPage({ params }: Props) {
  const { getToken, userId } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const { key } = await params

  let flag
  try {
    flag = await api.flags.get(token, key)
  } catch {
    notFound()
  }

  return <FlagDetailClient flag={flag} />
}
