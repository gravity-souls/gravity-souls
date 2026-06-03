import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { defaultLocale, isLocale, type Locale } from '@/lib/i18n-locales'

function resolveBrowserLocale(acceptLanguage: string | null): Locale {
  const browserLang = acceptLanguage?.split(',')[0]?.split('-')[0]
  return isLocale(browserLang) ? browserLang : defaultLocale
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const cookieLocale = cookieStore.get('locale')?.value
  const locale = isLocale(cookieLocale) ? cookieLocale : resolveBrowserLocale(headerStore.get('accept-language'))

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
