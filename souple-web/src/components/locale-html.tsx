'use client'

import { useEffect } from 'react'

/**
 * Sets the `lang` attribute on the root `<html>` element for the current locale.
 * This is needed because the root layout (app/layout.tsx) is locale-agnostic,
 * while the lang attribute must reflect the active locale.
 */
export function LocaleHtml({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
