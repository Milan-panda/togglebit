'use client'

import { SignUp } from '@clerk/nextjs'
import { postAuthRedirectUrl } from '@/lib/preserve-invite'

export function SignUpClient() {
  const redirect = postAuthRedirectUrl()
  return <SignUp fallbackRedirectUrl={redirect} forceRedirectUrl={redirect} />
}
