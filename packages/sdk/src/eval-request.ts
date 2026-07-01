import type { FlagContext } from './types'

export function buildEvalSearchParams(context: FlagContext): URLSearchParams {
  const params = new URLSearchParams({
    context: JSON.stringify(context),
  })
  const userId = context.userId?.trim()
  if (userId) {
    params.set('userId', userId)
  }
  return params
}
