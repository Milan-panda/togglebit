import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from '@/components/ui/sonner'
import { TogglebitAppProvider } from '@/components/togglebit-app-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Togglebit',
    template: '%s | Togglebit',
  },
  description: 'Feature flags built for Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${GeistSans.className} antialiased`}>
          <ThemeProvider>
            <TogglebitAppProvider>
              {children}
              <Toaster />
            </TogglebitAppProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
