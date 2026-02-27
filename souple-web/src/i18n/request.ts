import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  // Validate locale
  if (!locale || !routing.locales.includes(locale as 'fr' | 'en' | 'ln' | 'sw')) {
    locale = routing.defaultLocale
  }

  const messages = (
    await import(`../../messages/${locale}/common.json`)
  ).default

  return {
    locale,
    messages,
  }
})
