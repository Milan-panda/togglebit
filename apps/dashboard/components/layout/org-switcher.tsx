'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Building2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { api, type OrgMembership } from '@/lib/api'

export const ORG_LIST_CHANGED_EVENT = 'orgs-changed'

export function OrgSwitcher({ collapsed = false }: { collapsed?: boolean }) {
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
    if (slug === '__create__') {
      router.push('/onboarding')
      return
    }
    setActiveSlug(slug)
    const params = new URLSearchParams(searchParams.toString())
    params.set('org', slug)
    router.push(`${pathname}?${params.toString()}`)
  }

  if (loading) {
    return (
      <div
        className={cn(
          'h-9 animate-pulse rounded-lg bg-muted',
          collapsed ? 'w-full md:mx-auto md:w-9' : 'w-full',
        )}
      />
    )
  }

  if (orgs.length === 0) {
    return (
      <div
        className={cn(
          'flex h-9 items-center rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground',
          collapsed ? 'w-full md:mx-auto md:w-9 md:justify-center md:px-0' : 'w-full',
        )}
      >
        <span className={cn(collapsed && 'md:sr-only')}>No org</span>
      </div>
    )
  }

  const selectedSlug =
    orgs.some((o) => o.slug === activeSlug) ? activeSlug : orgs[0].slug
  const activeName = orgs.find((o) => o.slug === selectedSlug)?.name ?? selectedSlug
  const activeInitial = activeName.charAt(0).toUpperCase()

  return (
    <Select value={selectedSlug} onValueChange={handleChange}>
      <SelectTrigger
        className={cn(
          'relative h-9 w-full rounded-lg border border-input bg-background px-3',
          collapsed &&
            'md:w-9 md:justify-center md:gap-0 md:px-0 md:mx-auto md:[&_[data-slot=select-value]]:hidden md:[&_svg:last-child]:hidden',
        )}
        title={collapsed ? activeName : undefined}
        aria-label={`Organization: ${activeName}`}
      >
        {collapsed && (
          <span className="pointer-events-none absolute inset-0 hidden items-center justify-center md:flex">
            {orgs.length === 1 ? (
              <span className="text-xs font-semibold">{activeInitial}</span>
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </span>
        )}
        <SelectValue placeholder="Select org" />
      </SelectTrigger>
      <SelectContent
        side={collapsed ? 'right' : 'bottom'}
        align="start"
        sideOffset={collapsed ? 8 : 4}
        alignItemWithTrigger={false}
        className="min-w-44"
      >
        {orgs.map((org) => (
          <SelectItem key={org.id} value={org.slug}>
            {org.name}
          </SelectItem>
        ))}
        <SelectItem value="__create__" className="text-primary">
          + Create organization
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
