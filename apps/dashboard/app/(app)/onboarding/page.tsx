'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}

export default function OnboardingPage() {
  const router = useRouter()
  const { isLoaded, userId, getToken } = useAuth()
  const [checking, setChecking] = useState(true)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoaded || !userId) return

    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        if (!token || cancelled) return
        const org = await api.orgs.meOptional(token)
        if (!cancelled && org) {
          router.replace('/dashboard')
          return
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoaded, userId, router, getToken])

  useEffect(() => {
    if (slugTouched) return
    setSlug(slugify(name))
  }, [name, slugTouched])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const s = slug.trim()
    const n = name.trim()
    if (!n || !s || s.length < 2) {
      toast.error('Enter an organization name and a valid slug (letters, numbers, hyphens).')
      return
    }

    setSubmitting(true)
    try {
      const token = await getToken()
      if (!token) return
      await api.orgs.create(token, { name: n, slug: s })
      toast.success('Organization created')
      router.replace('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create organization'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isLoaded || checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Create your organization</CardTitle>
          <CardDescription>
            Flags and API keys belong to an organization. You will be the owner. This
            step is required before you can create keys or flags.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                placeholder="Acme Inc"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">URL slug</Label>
              <Input
                id="org-slug"
                placeholder="acme-inc"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens. Used in URLs and must be unique.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create organization'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
