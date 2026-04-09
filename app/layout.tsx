import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Nav from '@/components/nav/Nav'
import CosmicBackground from '@/components/fx/CosmicBackground'
import StarfieldCanvas from '@/components/fx/StarfieldCanvas'
import { LanguageProvider } from '@/contexts/language-context'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Driftverse — Your inner universe, mapped.',
  description:
    'Driftverse turns your expressions into a personal universe. Discover who resonates, who complements, and who waits at the far edge.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="cosmic-bg min-h-full text-[var(--foreground)] antialiased overflow-x-hidden">
        <LanguageProvider>
          <CosmicBackground />
          <StarfieldCanvas />
          <Nav />
          {/* pt = nav height so content clears the fixed header */}
          <main className="relative z-10" style={{ paddingTop: 'var(--nav-h)' }}>{children}</main>
        </LanguageProvider>
      </body>
    </html>
  )
}
