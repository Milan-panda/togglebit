'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, type OrgMembership } from '@/lib/api'

export const ORG_LIST_CHANGED_EVENT = 'orgs-changed'

export function OrgSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { getToken, isLoaded, userId } = useAuth()

  const [orgs, setOrgs] = useState<OrgMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSlug, setActiveSlug] = useState<string>('')

  const urlSlug = searchParams.get('org') ?? ''

  const fetchOrgs = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const result = await api.orgs.list(token)
    setOrgs(result)
    return result
  }, [getToken])

  useEffect(() => {
    if (!isLoaded || !userId) return
    let cancelled = false
    ;(async () => {
      try {
        const result = await fetchOrgs()
        if (!result || cancelled) return

        const matchUrl = result.find((o) => o.slug === urlSlug)
        const resolved = matchUrl ? matchUrl.slug : result[0]?.slug ?? ''
        setActiveSlug(resolved)

        if (resolved && resolved !== urlSlug) {
          const params = new URLSearchParams(searchParams.toString())
          params.set('org', resolved)
          router.replace(`${pathname}?${params.toString()}`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchOrgs, isLoaded, pathname, router, searchParams, urlSlug, userId])

  useEffect(() => {
    function handleOrgChanged() {
      fetchOrgs()
    }
    window.addEventListener(ORG_LIST_CHANGED_EVENT, handleOrgChanged)
    return () => window.removeEventListener(ORG_LIST_CHANGED_EVENT, handleOrgChanged)
  }, [fetchOrgs])

  useEffect(() => {
    if (orgs.length === 0) return
    if (urlSlug && orgs.some((o) => o.slug === urlSlug)) {
      setActiveSlug(urlSlug)
    }
  }, [urlSlug, orgs])

  function handleChange(slug: string | null) {
    if (!slug) return
    setActiveSlug(slug)
    const params = new URLSearchParams(searchParams.toString())
    params.set('org', slug)
    router.push(`${pathname}?${params.toString()}`)
  }

  if (loading || orgs.length === 0) {
    return (
      <div className="flex h-9 w-full items-center rounded-full border border-input bg-background/70 px-3 text-sm text-muted-foreground">
        {loading ? 'Loading...' : 'No organization'}
      </div>
    )
  }

  const activeName = orgs.find((o) => o.slug === activeSlug)?.name ?? activeSlug

  return (
    <Select value={activeSlug} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-full rounded-full border border-input bg-background/70 px-3">
        <SelectValue placeholder="Select org">{activeName}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {orgs.map((org) => (
          <SelectItem key={org.id} value={org.slug}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
