'use client'

import { useUser } from '@clerk/nextjs'
import { useFlag } from 'togglebit'
import { Badge } from '@/components/ui/badge'
import { isTogglebitPublicConfigured } from '@/lib/togglebit-public'

/**
 * Shows a small badge when flag `togglebit-dogfood` is on for the signed-in user.
 * Create that flag in your Togglebit project to verify the SDK + eval API.
 *
 * Only mounts useFlag when NEXT_PUBLIC_TOGGLEBIT_API_KEY is set (same condition as
 * TogglebitAppProvider); otherwise useFlag would run outside TogglebitProvider.
 */
export function TogglebitDogfoodBadge() {
  const { user, isLoaded } = useUser()
  if (!isTogglebitPublicConfigured()) return null
  if (!isLoaded || !user) return null
  return <TogglebitDogfoodBadgeInner userId={user.id} />
}

function TogglebitDogfoodBadgeInner({ userId }: { userId: string }) {
  const on = useFlag('togglebit-dogfood', { userId })
  if (!on) return null

  return (
    <Badge variant="secondary" className="text-xs font-normal">
      togglebit-dogfood
    </Badge>
  )
}
