'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/lib/api'

/**
 * Redirects signed-in users who have no organization to /onboarding.
 * Skips when already on /onboarding.
 */
export function OrgGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedOrgSlug = searchParams.get('org') || undefined
  const router = useRouter()
  const { isLoaded, userId, getToken } = useAuth()

  useEffect(() => {
    if (!isLoaded || !userId) return
    if (pathname?.startsWith('/onboarding')) return

    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        if (!token || cancelled) return
        const org = await api.orgs.meOptional(token, selectedOrgSlug)
        if (!cancelled && org === null) {
          router.replace('/onboarding')
        }
      } catch {
        // Network / server error — do not redirect
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoaded, userId, pathname, router, getToken, selectedOrgSlug])

  return <>{children}</>
}
