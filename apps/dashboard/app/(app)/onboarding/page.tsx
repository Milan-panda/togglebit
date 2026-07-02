'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Copy, Trash2, UserPlus, Users } from 'lucide-react'
import { ORG_LIST_CHANGED_EVENT } from '@/components/layout/org-switcher'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  api,
  type Org,
  type OrgInvitation,
  type OrgMember,
  type OrgRole,
  type PendingOrgInvitation,
} from '@/lib/api'
import { storeInviteToken, clearStoredInviteToken } from '@/lib/preserve-invite'
import {
  avatarColorSeed,
  formatDate,
  formatRelativeExpiry,
  formatRole,
  memberDisplayName,
  memberInitial,
} from '@/lib/team-format'
import { CreateOrgDialog, CreateOrgWelcome } from '@/components/team/create-org'
import { PermissionsMatrixModal } from '@/components/team/permissions-matrix-modal'
import { RoleBadge } from '@/components/team/role-badge'
import { cn } from '@/lib/utils'

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

function PendingInvitesPanel({
  invites,
  accepting,
  onAccept,
  compact = false,
}: {
  invites: PendingOrgInvitation[]
  accepting: boolean
  onAccept: (token: string) => void
  compact?: boolean
}) {
  if (invites.length === 0) return null

  return (
    <section className="rounded-lg border border-primary/20 bg-primary/3 p-4 sm:p-5">
      <SectionHeading
        title="Pending invitations"
        description={
          compact
            ? 'You have been invited to join other organizations.'
            : 'Accept an invitation to join an existing team, or create your own organization below.'
        }
      />
      <ul className={cn('space-y-2', compact ? 'mt-4' : 'mt-5')}>
        {invites.map((pending) => (
          <li
            key={pending.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{pending.org_name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatRole(pending.role)} · {formatRelativeExpiry(pending.expires_at)}
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0 sm:min-w-28"
              onClick={() => onAccept(pending.token)}
              disabled={accepting}
            >
              {accepting ? 'Joining…' : 'Accept invite'}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
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
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrgRole>('member')
  const [inviting, setInviting] = useState(false)
  const [acceptingInvite, setAcceptingInvite] = useState(false)
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
    if (inviteToken) storeInviteToken(inviteToken)
  }, [inviteToken])

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
    const pending = pendingInvites.find((p) => p.token === tokenToAccept)
    try {
      const token = await getToken()
      if (!token) return
      await api.orgs.acceptInvitation(token, { token: tokenToAccept })
      toast.success('Invitation accepted')
      clearStoredInviteToken()
      window.dispatchEvent(new Event(ORG_LIST_CHANGED_EVENT))
      const orgSlug = pending?.org_slug
      if (orgSlug) {
        router.replace(`/dashboard?org=${encodeURIComponent(orgSlug)}`)
      } else {
        router.replace('/dashboard')
      }
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
      router.push('/onboarding')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not delete organization'
      toast.error(message)
    }
  }

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

  if (!isLoaded || checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!org) {
    return (
      <div className="mx-auto max-w-lg space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an organization to manage feature flags, API keys, and team access.
          </p>
        </div>

        <PendingInvitesPanel
          invites={pendingInvites}
          accepting={acceptingInvite}
          onAccept={handleAcceptInvite}
        />

        {inviteToken && pendingInvites.length === 0 && (
          <section className="rounded-lg border border-border p-4 sm:p-5">
            <SectionHeading
              title="Invitation link detected"
              description="We could not find a pending invite for your signed-in email. If the invite was sent to a different address, sign in with that account and try again."
            />
            <Button
              className="mt-4"
              onClick={() => handleAcceptInvite(inviteToken)}
              disabled={acceptingInvite}
            >
              {acceptingInvite ? 'Checking…' : 'Try accepting this link'}
            </Button>
          </section>
        )}

        <CreateOrgWelcome />
      </div>
    )
  }

  const canInvite = org.role === 'owner' || org.role === 'admin'
  const canDeleteOrg = org.role === 'owner'
  const canChangeRoles = org.role === 'owner' || org.role === 'admin'
  const pendingOrgInvitations = invitations.filter((i) => !i.accepted_at)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage members, roles, and invitations for{' '}
            <span className="font-medium text-foreground">{org.name}</span>.
          </p>
        </div>
        <PermissionsMatrixModal variant="button" />
      </div>

      <PendingInvitesPanel
        invites={pendingInvites}
        accepting={acceptingInvite}
        onAccept={handleAcceptInvite}
        compact
      />

      <dl className="grid gap-4 rounded-lg border border-border bg-card px-4 py-4 text-sm sm:grid-cols-3 sm:px-5">
        <div>
          <dt className="text-muted-foreground">Organization</dt>
          <dd className="mt-1 font-medium">{org.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Slug</dt>
          <dd className="mt-1 font-mono text-sm">{org.slug}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Your role</dt>
          <dd className="mt-1">
            <RoleBadge role={org.role} showIcon />
          </dd>
        </div>
      </dl>

      {canInvite && (
        <section className="space-y-4">
          <SectionHeading
            title="Invite members"
            description={
              <>
                Send an email invitation with a role.{' '}
                <PermissionsMatrixModal />
              </>
            }
          />
          <form
            onSubmit={handleInviteMember}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center"
          >
            <div className="flex-1">
              <Label htmlFor="invite-email" className="sr-only">
                Email address
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {org.role === 'owner' && <SelectItem value="owner">{formatRole('owner')}</SelectItem>}
                {org.role === 'owner' && <SelectItem value="admin">{formatRole('admin')}</SelectItem>}
                <SelectItem value="developer">{formatRole('developer')}</SelectItem>
                <SelectItem value="member">{formatRole('member')}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={inviting} className="shrink-0">
              <UserPlus className="mr-2 h-4 w-4" />
              {inviting ? 'Sending…' : 'Send invite'}
            </Button>
          </form>
        </section>
      )}

      <section className="space-y-4">
        <SectionHeading
          title={`Members (${members.length})`}
          description="Everyone with access to this organization."
        />
        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
            <Users className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 font-medium">No members yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Invite teammates to collaborate on flags and keys.
            </p>
          </div>
        ) : (
          <Table className="rounded-lg border border-border bg-card">
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isSelf = user?.id === member.user_id
                const isOwner = member.role === 'owner'
                const canEditThis =
                  canChangeRoles &&
                  !isSelf &&
                  !isOwner &&
                  !(org.role === 'admin' && member.role === 'admin')
                const seed = member.email || member.name || member.user_id

                return (
                  <TableRow key={member.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
                            avatarColorSeed(seed),
                          )}
                        >
                          {memberInitial(member)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {memberDisplayName(member)}
                            {isSelf && (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </p>
                          {member.email && member.name && (
                            <p className="truncate text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canEditThis ? (
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleRoleChange(member.user_id, v as OrgRole)}
                        >
                          <SelectTrigger className="h-8 w-34">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {org.role === 'owner' && (
                              <SelectItem value="admin">{formatRole('admin')}</SelectItem>
                            )}
                            <SelectItem value="developer">{formatRole('developer')}</SelectItem>
                            <SelectItem value="member">{formatRole('member')}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <RoleBadge role={member.role} />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEditThis && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.user_id)}
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </section>

      {canInvite && (
        <section className="space-y-4">
          <SectionHeading
            title={`Invitations (${pendingOrgInvitations.length})`}
            description="Outstanding email invitations that have not been accepted yet."
          />
          {pendingOrgInvitations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
              <p className="font-medium">No pending invitations</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Invitations you send will appear here until they are accepted.
              </p>
            </div>
          ) : (
            <Table className="rounded-lg border border-border bg-card">
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrgInvitations.map((invitation) => {
                  const invitationLink =
                    typeof window === 'undefined'
                      ? invitation.token
                      : `${window.location.origin}/onboarding?invite=${invitation.token}`

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={invitation.role} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(invitation.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeExpiry(invitation.expires_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Copy invite link"
                            onClick={() => {
                              navigator.clipboard.writeText(invitationLink)
                              toast.success('Invite link copied')
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            title="Revoke invitation"
                            onClick={() => handleRevokeInvitation(invitation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </section>
      )}

      <CreateOrgDialog />

      {canDeleteOrg && (
        <section className="rounded-lg border border-destructive/30 p-4 sm:p-5">
          <SectionHeading
            title="Delete organization"
            description="Permanently removes all flags, API keys, and member access. This cannot be undone."
          />
          <Button
            variant="outline"
            className="mt-4 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDeleteOrganization}
          >
            Delete {org.name}
          </Button>
        </section>
      )}
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  )
}
