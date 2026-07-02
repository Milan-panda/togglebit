'use client'

import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { OrgRole } from '@/lib/api'
import { formatRole } from '@/lib/team-format'

const ROLES: OrgRole[] = ['owner', 'admin', 'developer', 'member']

const PERMISSIONS = [
  {
    area: 'Flags',
    rows: [
      { label: 'View flags & logs', owner: true, admin: true, developer: true, member: true },
      { label: 'Create & edit flags', owner: true, admin: true, developer: true, member: false },
      { label: 'Delete flags', owner: true, admin: true, developer: false, member: false },
      { label: 'Run test evals', owner: true, admin: true, developer: true, member: true },
    ],
  },
  {
    area: 'API keys',
    rows: [
      { label: 'View keys', owner: true, admin: true, developer: true, member: true },
      { label: 'Generate & revoke keys', owner: true, admin: true, developer: false, member: false },
    ],
  },
  {
    area: 'Team',
    rows: [
      { label: 'Invite & manage members', owner: true, admin: true, developer: false, member: false },
      { label: 'Change member roles', owner: true, admin: true, developer: false, member: false },
      { label: 'Delete organization', owner: true, admin: false, developer: false, member: false },
    ],
  },
] as const

function cell(value: boolean) {
  return value ? 'Yes' : '—'
}

interface Props {
  triggerClassName?: string
  variant?: 'link' | 'button'
}

export function PermissionsMatrixModal({ triggerClassName, variant = 'link' }: Props) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          variant === 'button' ? (
            <Button variant="outline" size="sm" className={triggerClassName}>
              <Shield className="mr-2 h-4 w-4" />
              What can each role do?
            </Button>
          ) : (
            <button
              type="button"
              className={
                triggerClassName ??
                'text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
              }
            >
              What can each role do?
            </button>
          )
        }
      />
      <DialogContent className="max-h-[min(85vh,640px)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Role permissions</DialogTitle>
          <DialogDescription>
            What each role can do in your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {PERMISSIONS.map((section) => (
            <div key={section.area}>
              <h3 className="mb-2 text-sm font-semibold">{section.area}</h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Action</th>
                      {ROLES.map((role) => (
                        <th key={role} className="px-3 py-2 font-medium">
                          {formatRole(role)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.label} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">{row.label}</td>
                        {ROLES.map((role) => (
                          <td key={role} className="px-3 py-2 text-muted-foreground">
                            {cell(row[role])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
