import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Nav from '@/components/nav/Nav'
import CosmicBackground from '@/components/fx/CosmicBackground'
import StarfieldCanvas from '@/components/fx/StarfieldCanvas'
import AuthSyncProvider from '@/components/layout/AuthSyncProvider'
import { LanguageProvider } from '@/contexts/language-context'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Gravity-Souls  -  Where souls find their gravity',
  description:
    'Gravity-Souls connects you with those who share your inner pull. Discover resonance, compatibility, and genuine connection through the power of authentic expression.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="cosmic-bg min-h-full text-[var(--foreground)] antialiased overflow-x-hidden">
        <LanguageProvider>
          <AuthSyncProvider>
            <CosmicBackground />
            <StarfieldCanvas />
            <Nav />
            {/* pt = nav height so content clears the fixed header */}
            <main className="relative z-10" style={{ paddingTop: 'var(--nav-h)' }}>{children}</main>
          </AuthSyncProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
