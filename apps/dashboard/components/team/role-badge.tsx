import { Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OrgRole } from '@/lib/api'
import { formatRole } from '@/lib/team-format'
import { cn } from '@/lib/utils'

interface RoleBadgeProps {
  role: OrgRole
  showIcon?: boolean
  className?: string
}

export function RoleBadge({ role, showIcon = false, className }: RoleBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'rounded-full px-2.5 bg-muted text-foreground ring-1 ring-border',
        className,
      )}
    >
      {showIcon && <Shield className="mr-1 h-3 w-3" />}
      {formatRole(role)}
    </Badge>
  )
}
