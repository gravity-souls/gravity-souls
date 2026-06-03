import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Noto_Sans_SC } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'
import Topbar from '@/components/layout/Topbar'
import CosmicBackground from '@/components/fx/CosmicBackground'
import StarfieldCanvas from '@/components/fx/StarfieldCanvas'
import AuthSyncProvider from '@/components/layout/AuthSyncProvider'
import LevelUpToast from '@/components/ui/LevelUpToast'
import { LanguageProvider } from '@/contexts/language-context'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Gravity-Souls  -  Where souls find their gravity',
  description:
    'Gravity-Souls connects you with those who share your inner pull. Discover resonance, compatibility, and genuine connection through the power of authentic expression.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${geist.variable} ${locale === 'zh' ? notoSansSC.className : ''} h-full`}>
      <body className="cosmic-bg min-h-full text-foreground antialiased overflow-x-hidden">
        <NextIntlClientProvider messages={messages}>
          <LanguageProvider>
            <AuthSyncProvider>
              <CosmicBackground />
              <StarfieldCanvas />
              <Topbar />
              <LevelUpToast />
              {/* pt = nav height so content clears the fixed header */}
              <main className="relative z-10" style={{ paddingTop: 'var(--nav-h)' }}>{children}</main>
              <footer className="relative z-10 text-center py-4 text-[10px] tracking-wide" style={{ color: 'var(--ghost)', opacity: 0.4 }}>
                Planet textures by{' '}
                <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer" className="underline">
                  Solar System Scope
                </a>{' '}
                (CC BY 4.0)
              </footer>
            </AuthSyncProvider>
          </LanguageProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
