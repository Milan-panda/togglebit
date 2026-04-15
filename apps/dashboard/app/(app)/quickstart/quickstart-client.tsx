'use client'

import { useState } from 'react'
import { Copy, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Props {
  keyPrefix?: string
  hasKeys: boolean
}

export function QuickstartClient({ keyPrefix, hasKeys }: Props) {
  const apiKeyPlaceholder = keyPrefix
    ? `${keyPrefix}...your_full_key_here`
    : 'tb_dev_your_api_key_here'

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quickstart</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get feature flags working in your Next.js app in 3 steps.
        </p>
      </div>

      {!hasKeys && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm">
              You need an API key first.
            </p>
            <Link href="/keys">
              <Button size="sm">
                Generate Key
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Step number={1} title="Install the SDK">
        <CodeBlock code="npm install togglebit" language="bash" />
      </Step>

      <Step number={2} title="Add the provider">
        <p className="mb-3 text-sm text-muted-foreground">
          Wrap your app with the Togglebit provider in your root layout or providers file.
        </p>
        <CodeBlock
          language="tsx"
          code={`// app/providers.tsx
'use client'
import { TogglebitProvider } from 'togglebit'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TogglebitProvider
      apiKey="${apiKeyPlaceholder}"
      environment="dev"
    >
      {children}
    </TogglebitProvider>
  )
}`}
        />
      </Step>

      <Step number={3} title="Use a flag">
        <div className="space-y-4">
          <div>
            <Badge variant="secondary" className="mb-2">Client Component</Badge>
            <CodeBlock
              language="tsx"
              code={`'use client'
import { useFlag } from 'togglebit'

export function MyComponent() {
  const darkMode = useFlag('dark-mode', { userId: user.id })
  return darkMode ? <DarkUI /> : <LightUI />
}`}
            />
          </div>
          <div>
            <Badge variant="secondary" className="mb-2">Server Component</Badge>
            <CodeBlock
              language="tsx"
              code={`import { getFlag } from 'togglebit/server'

export default async function Page() {
  const enabled = await getFlag(
    'new-dashboard',
    { userId: session.userId },
    {
      apiKey: process.env.TOGGLEBIT_API_KEY!,
      environment: 'dev',
    }
  )
  return enabled ? <NewDashboard /> : <OldDashboard />
}`}
            />
          </div>
        </div>
      </Step>
    </div>
  )
}

function Step({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {number}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  )
}
