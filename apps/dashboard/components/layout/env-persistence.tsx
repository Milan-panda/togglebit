'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { readStoredEnv, storeEnv } from '@/lib/env-url'

/** Hydrates ?env= from localStorage when missing on app routes. */
export function EnvPersistence() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('env')) {
      storeEnv(searchParams.get('env')!)
      return
    }

    const stored = readStoredEnv()
    if (stored && stored !== 'dev') {
      const params = new URLSearchParams(searchParams.toString())
      params.set('env', stored)
      router.replace(`${pathname}?${params.toString()}`)
    }
  }, [pathname, router, searchParams])

  return null
}
