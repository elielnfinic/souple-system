import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { ThemeProvider } from '@/providers/theme-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { QueryProvider } from '@/providers/query-provider'
import { LocaleHtml } from '@/components/locale-html'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  // Validate locale
  if (!routing.locales.includes(locale as 'fr' | 'en' | 'ln' | 'sw')) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <LocaleHtml locale={locale} />
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            {/* Skip to main content — accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#0A7AFF] focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
            >
              Skip to main content
            </a>
            {children}
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}
