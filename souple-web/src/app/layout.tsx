import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Souple',
    template: '%s — Souple',
  },
  description: 'Transportation platform for intercity buses, vehicle rentals, and cargo delivery.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // lang defaults to 'fr' (default locale); LocaleHtml updates it per-locale after hydration
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Inter font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  )
}
