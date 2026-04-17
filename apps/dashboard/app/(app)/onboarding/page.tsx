'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Copy, Trash2, UserPlus, Shield, Users } from 'lucide-react'
import { ORG_LIST_CHANGED_EVENT } from '@/components/layout/org-switcher'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  api,
  type Org,
  type OrgInvitation,
  type OrgMember,
  type OrgRole,
  type PendingOrgInvitation,
} from '@/lib/api'

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}

function roleBadgeClass(role: OrgRole) {
  if (role === 'owner') return 'bg-muted text-foreground ring-1 ring-border'
  if (role === 'admin') return 'bg-muted text-foreground ring-1 ring-border'
  return 'bg-muted text-foreground ring-1 ring-border'
}

function avatarColorSeed(value: string) {
  const palette = [
    'bg-zinc-600',
    'bg-zinc-500',
    'bg-zinc-700',
    'bg-zinc-400',
    'bg-zinc-800',
  ]
  let hash = 0
  for (let i = 0; i < value.length; i += 1) hash = (hash << 5) - hash + value.charCodeAt(i)
  return palette[Math.abs(hash) % palette.length]
}

function OnboardingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')
  const selectedOrgSlug = searchParams.get('org') || undefined
  const { isLoaded, userId, getToken } = useAuth()
  const { user } = useUser()
  const [checking, setChecking] = useState(true)
  const [org, setOrg] = useState<Org | null>(null)
  const [pendingInvites, setPendingInvites] = useState<PendingOrgInvitation[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [invitations, setInvitations] = useState<OrgInvitation[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrgRole>('member')
  const [inviting, setInviting] = useState(false)
  const [acceptingInvite, setAcceptingInvite] = useState(false)
  const [showCreateOrgForm, setShowCreateOrgForm] = useState(false)

  const loadOrgData = useCallback(async () => {
    const token = await getToken()
    if (!token) return

    const currentOrg = await api.orgs.meOptional(token, selectedOrgSlug)
    setOrg(currentOrg)

    const userEmail = user?.primaryEmailAddress?.emailAddress
    const pending = await api.orgs.pendingInvitations(token, userEmail || undefined)
    setPendingInvites(pending)

    if (currentOrg) {
      const memberRows = await api.orgs.members(token, selectedOrgSlug)
      setMembers(memberRows)

      if (currentOrg.role === 'owner' || currentOrg.role === 'admin') {
        const invitationRows = await api.orgs.invitations(token, selectedOrgSlug)
        setInvitations(invitationRows)
      } else {
        setInvitations([])
      }
    } else {
      setMembers([])
      setInvitations([])
    }
  }, [getToken, selectedOrgSlug, user])

  useEffect(() => {
    if (!isLoaded || !userId) return

    let cancelled = false
    ;(async () => {
      try {
        await loadOrgData()
      } catch {
        if (!cancelled) toast.error('Could not load organization details')
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoaded, userId, loadOrgData])

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
      const userEmail = user?.primaryEmailAddress?.emailAddress
      const created = await api.orgs.create(token, { name: n, slug: s, email: userEmail })
      toast.success('Organization created')
      setShowCreateOrgForm(false)
      window.dispatchEvent(new Event(ORG_LIST_CHANGED_EVENT))
      const params = new URLSearchParams(searchParams.toString())
      params.set('org', created.slug)
      router.replace(`/onboarding?${params.toString()}`)
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create organization'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      const token = await getToken()
      if (!token) return
      const invite = await api.orgs.invite(token, {
        email: inviteEmail.trim(),
        role: inviteRole,
      }, selectedOrgSlug)
      setInviteEmail('')
      setInvitations((prev) => [invite, ...prev.filter((i) => i.id !== invite.id)])
      toast.success(`Invitation sent to ${invite.email}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not send invitation'
      toast.error(message)
    } finally {
      setInviting(false)
    }
  }

  async function handleAcceptInvite(tokenToAccept: string) {
    setAcceptingInvite(true)
    try {
      const token = await getToken()
      if (!token) return
      await api.orgs.acceptInvitation(token, { token: tokenToAccept })
      toast.success('Invitation accepted')
      window.dispatchEvent(new Event(ORG_LIST_CHANGED_EVENT))
      await loadOrgData()
      router.replace('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not accept invitation'
      toast.error(message)
    } finally {
      setAcceptingInvite(false)
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    try {
      const token = await getToken()
      if (!token) return
      await api.orgs.revokeInvitation(token, invitationId, selectedOrgSlug)
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId))
      toast.success('Invitation revoked')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not revoke invitation'
      toast.error(message)
    }
  }

  async function handleDeleteOrganization() {
    if (!confirm('Delete this organization? This permanently removes flags, keys, and members.')) {
      return
    }
    try {
      const token = await getToken()
      if (!token) return
      await api.orgs.delete(token, selectedOrgSlug)
      toast.success('Organization deleted')
      window.dispatchEvent(new Event(ORG_LIST_CHANGED_EVENT))
      setOrg(null)
      setMembers([])
      setInvitations([])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not delete organization'
      toast.error(message)
    }
  }

  if (!isLoaded || checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!org) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        {pendingInvites.length > 0 && (
          <Card className="border border-border/80">
            <CardHeader>
              <CardTitle>Join invited organization</CardTitle>
              <CardDescription>
                You have pending invitations linked to your signed-in email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingInvites.map((pending) => (
                <div key={pending.id} className="rounded-xl border border-border/80 p-3">
                  <p className="text-sm font-medium">{pending.org_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Role: {pending.role} • Expires {new Date(pending.expires_at).toLocaleDateString()}
                  </p>
                  <Button
                    onClick={() => handleAcceptInvite(pending.token)}
                    disabled={acceptingInvite}
                    className="mt-3 w-full"
                  >
                    {acceptingInvite ? 'Joining...' : `Accept invite to ${pending.org_slug}`}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {inviteToken && pendingInvites.length === 0 && (
          <Card className="border border-border/80">
            <CardHeader>
              <CardTitle>Invitation link detected</CardTitle>
              <CardDescription>
                We could not find a pending invite for your current account email. If you used a
                different email for the invite, switch account and try again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleAcceptInvite(inviteToken)}
                disabled={acceptingInvite}
                className="w-full"
              >
                {acceptingInvite ? 'Checking...' : 'Try accepting this link'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>Create your organization</CardTitle>
            <CardDescription>
              Flags and API keys belong to an organization. You will be the owner.
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

  const canInvite = org.role === 'owner' || org.role === 'admin'
  const canDeleteOrg = org.role === 'owner'
  const canChangeRoles = org.role === 'owner' || org.role === 'admin'

  async function handleRoleChange(targetUserId: string, newRole: OrgRole) {
    try {
      const token = await getToken()
      if (!token) return
      await api.orgs.updateMemberRole(token, targetUserId, newRole, selectedOrgSlug)
      setMembers((prev) =>
        prev.map((m) => (m.user_id === targetUserId ? { ...m, role: newRole } : m)),
      )
      toast.success('Role updated')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not update role'
      toast.error(message)
    }
  }

  async function handleRemoveMember(targetUserId: string) {
    if (!confirm('Remove this member from the organization?')) return
    try {
      const token = await getToken()
      if (!token) return
      await api.orgs.removeMember(token, targetUserId, selectedOrgSlug)
      setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId))
      toast.success('Member removed')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not remove member'
      toast.error(message)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {pendingInvites.length > 0 && (
        <Card className="border border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending invitations</CardTitle>
            <CardDescription>
              You have been invited to join other organizations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((pending) => (
              <div key={pending.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/80 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{pending.org_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Role: {pending.role} · Expires {new Date(pending.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAcceptInvite(pending.token)}
                  disabled={acceptingInvite}
                >
                  {acceptingInvite ? 'Joining...' : 'Accept'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="relative overflow-hidden border border-border/80">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(80%_60%_at_20%_0%,hsl(var(--foreground)/0.1),transparent_60%)]" />
        <CardHeader>
          <CardTitle className="relative">Organization</CardTitle>
          <CardDescription>
            Manage team members, roles, and invitations.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{org.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Slug</p>
              <p className="font-medium">{org.slug}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Your role</p>
              <Badge variant="secondary" className={`mt-1 rounded-full px-2.5 ${roleBadgeClass(org.role)}`}>
                <Shield className="mr-1 h-3 w-3" />
                {org.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {canInvite && (
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-4 w-4" />
              Invite members
            </CardTitle>
            <CardDescription>
              Invite teammates with a role: owner, admin, developer, or member.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInviteMember} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <Input
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                autoComplete="email"
              />
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {org.role === 'owner' && (
                    <SelectItem value="owner">owner</SelectItem>
                  )}
                  {org.role === 'owner' && (
                    <SelectItem value="admin">admin</SelectItem>
                  )}
                  <SelectItem value="developer">developer</SelectItem>
                  <SelectItem value="member">member</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="rounded-full bg-primary hover:bg-[var(--primary-hover)]" disabled={inviting}>
                {inviting ? 'Inviting...' : 'Invite'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border border-border/80">
        <CardHeader>
          <CardTitle className="text-lg">Create another organization</CardTitle>
          <CardDescription>
            You can own and manage multiple organizations from one account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showCreateOrgForm ? (
            <Button variant="outline" onClick={() => setShowCreateOrgForm(true)}>
              New organization
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-org-name">Organization name</Label>
                <Input
                  id="new-org-name"
                  placeholder="Acme Labs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-org-slug">URL slug</Label>
                <Input
                  id="new-org-slug"
                  placeholder="acme-labs"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateOrgForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-4 w-4" />
            Members
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            members.map((member) => {
              const isSelf = user?.id === member.user_id
              const isOwner = member.role === 'owner'
              const canEditThis =
                canChangeRoles && !isSelf && !isOwner &&
                !(org.role === 'admin' && member.role === 'admin')

              return (
                <div key={member.user_id} className="group/member flex items-center justify-between gap-3 rounded-xl border border-border/80 px-3 py-2 hover:bg-accent/20">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColorSeed(member.email || member.user_id)}`}>
                        {(member.email || member.user_id).slice(0, 1).toUpperCase()}
                      </span>
                      <p className="truncate text-sm font-medium">
                        {member.email || member.user_id}
                        {isSelf ? ' (you)' : ''}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEditThis ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleRoleChange(member.user_id, v as OrgRole)}
                      >
                        <SelectTrigger className="h-7 w-[120px] rounded-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {org.role === 'owner' && (
                            <SelectItem value="admin">admin</SelectItem>
                          )}
                          <SelectItem value="developer">developer</SelectItem>
                          <SelectItem value="member">member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary" className={`rounded-full px-2.5 ${roleBadgeClass(member.role)}`}>{member.role}</Badge>
                    )}
                    {canEditThis && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-60 hover:text-destructive md:opacity-0 md:group-hover/member:opacity-100"
                        onClick={() => handleRemoveMember(member.user_id)}
                        title="Remove member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {canInvite && (
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invitations yet.</p>
            ) : (
              invitations.map((invitation) => {
                const invitationLink =
                  typeof window === 'undefined'
                    ? invitation.token
                    : `${window.location.origin}/onboarding?invite=${invitation.token}`
                return (
                  <div key={invitation.id} className="space-y-2 rounded-xl border border-border/80 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{invitation.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Role: {invitation.role}
                          {invitation.accepted_at
                            ? ` • accepted ${new Date(invitation.accepted_at).toLocaleDateString()}`
                            : ' • pending'}
                        </p>
                      </div>
                      {!invitation.accepted_at && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          onClick={() => handleRevokeInvitation(invitation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {!invitation.accepted_at && (
                      <div className="flex items-center gap-2">
                        <Input readOnly value={invitationLink} className="font-mono text-xs" />
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => {
                            navigator.clipboard.writeText(invitationLink)
                            toast.success('Invite link copied')
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      {canDeleteOrg && (
        <Card className="border border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Deleting an organization permanently removes all flags, keys, and member access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="rounded-full border-destructive/60 text-destructive hover:bg-destructive hover:text-white"
              onClick={handleDeleteOrganization}
            >
              Delete organization
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  )
}
