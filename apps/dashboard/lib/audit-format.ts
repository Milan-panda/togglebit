import type { FlagEvent } from '@/lib/api'

export function formatEventAction(action: string): string {
  return action.replace(/_/g, ' ')
}

export function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatEventActor(event: Pick<FlagEvent, 'user_name' | 'user_email' | 'user_id'>): string {
  return event.user_name || event.user_email || event.user_id
}
