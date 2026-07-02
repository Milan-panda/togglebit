'use client'

import { SignIn } from '@clerk/nextjs'
import { postAuthRedirectUrl } from '@/lib/preserve-invite'

export function SignInClient() {
  const redirect = postAuthRedirectUrl()
  return <SignIn fallbackRedirectUrl={redirect} forceRedirectUrl={redirect} />
}
