import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Noto_Sans_SC } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'
import RouteShell from '@/components/layout/RouteShell'

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
          <RouteShell>{children}</RouteShell>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
