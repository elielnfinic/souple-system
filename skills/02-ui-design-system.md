# Skill 02: UI/UX Design System

## Objective
Establish a cohesive, professional, and distraction-free design system for all Souple interfaces. Covers component library, theming (light/dark), typography, layout patterns, timezone-aware time display, proper multi-region localization, responsive design, accessibility, and role-specific UI density. Every screen should feel clean, information-rich without clutter, and immediately readable.

## Prerequisites
- Skill 01 (Foundation) completed
- Next.js 15 + Radix UI Themes + Tailwind CSS v4 installed

---

## Design Principles

1. **Information density without clutter** — Show what matters, hide what doesn't. No decorative elements that don't serve a purpose.
2. **Scannable hierarchy** — Users should find what they need in < 2 seconds. Bold numbers, clear labels, logical grouping.
3. **Consistent patterns** — Same action looks the same everywhere. A "Book" button is always the same color, size, position.
4. **Progressive disclosure** — Show summary first, details on demand. Don't overwhelm first-time users.
5. **Offline-aware UI** — Always indicate connection status. Never show a blank screen — show cached data with a subtle offline badge.
6. **Context-appropriate density** — Ticketer POS is large-touch-target optimized. Admin dashboards are dense with data. Passenger-facing is spacious and welcoming.

---

## Scope

### 1. Color System & Theming

#### Brand Colors
```typescript
// lib/design-tokens.ts
export const colors = {
  // Primary — used for CTAs, active states, links
  primary: {
    50:  '#f0f7ff',
    100: '#e0efff',
    200: '#b8dbff',
    300: '#7abfff',
    400: '#3a9fff',
    500: '#0A7AFF',    // Main brand blue
    600: '#0062d6',
    700: '#004dad',
    800: '#003d85',
    900: '#002d5c',
  },

  // Neutral — text, borders, backgrounds
  neutral: {
    0:   '#FFFFFF',
    50:  '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },

  // Semantic
  success: { 500: '#16A34A', 100: '#DCFCE7' },
  warning: { 500: '#F59E0B', 100: '#FEF3C7' },
  danger:  { 500: '#DC2626', 100: '#FEE2E2' },
  info:    { 500: '#2563EB', 100: '#DBEAFE' },
}
```

#### Theme System (Light / Dark)
```typescript
// Light theme (default)
export const lightTheme = {
  bg: {
    primary:   colors.neutral[0],      // White page background
    secondary: colors.neutral[50],     // Card/section backgrounds
    tertiary:  colors.neutral[100],    // Hover states, subtle fills
    inverse:   colors.neutral[900],    // Dark overlays
  },
  text: {
    primary:   colors.neutral[900],    // Headings, body text
    secondary: colors.neutral[600],    // Labels, descriptions
    tertiary:  colors.neutral[400],    // Placeholders, disabled
    inverse:   colors.neutral[0],      // Text on dark backgrounds
    link:      colors.primary[500],    // Interactive text
  },
  border: {
    default:  colors.neutral[200],
    strong:   colors.neutral[300],
    focus:    colors.primary[500],
  },
  // Status colors for booking/trip/payment states
  status: {
    scheduled:  { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
    boarding:   { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
    departed:   { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
    completed:  { bg: '#F9FAFB', text: '#4B5563', dot: '#9CA3AF' },
    cancelled:  { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
    confirmed:  { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
    pending:    { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
    failed:     { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
  },
}

// Dark theme
export const darkTheme = {
  bg: {
    primary:   colors.neutral[950],
    secondary: colors.neutral[900],
    tertiary:  colors.neutral[800],
    inverse:   colors.neutral[0],
  },
  text: {
    primary:   colors.neutral[50],
    secondary: colors.neutral[400],
    tertiary:  colors.neutral[500],
    inverse:   colors.neutral[900],
    link:      colors.primary[400],
  },
  border: {
    default:  colors.neutral[800],
    strong:   colors.neutral[700],
    focus:    colors.primary[400],
  },
  status: {
    // Same semantic colors but with adjusted bg for dark mode
    scheduled:  { bg: '#1E293B', text: '#60A5FA', dot: '#3B82F6' },
    boarding:   { bg: '#292524', text: '#FB923C', dot: '#F97316' },
    departed:   { bg: '#14532D', text: '#4ADE80', dot: '#22C55E' },
    completed:  { bg: '#1F2937', text: '#9CA3AF', dot: '#6B7280' },
    cancelled:  { bg: '#450A0A', text: '#FCA5A5', dot: '#EF4444' },
    confirmed:  { bg: '#14532D', text: '#4ADE80', dot: '#22C55E' },
    pending:    { bg: '#451A03', text: '#FCD34D', dot: '#F59E0B' },
    failed:     { bg: '#450A0A', text: '#FCA5A5', dot: '#EF4444' },
  },
}
```

#### Theme Provider
```typescript
// providers/theme-provider.tsx
// - Reads user preference from: localStorage > system preference > default (light)
// - Persists choice to user profile (API) when authenticated
// - Applies via CSS custom properties on <html> element
// - Transitions: 200ms ease on background-color and color
// - Toggle: accessible from any page via header icon (sun/moon)

'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 1. Read from localStorage('souple-theme') or default to 'system'
  // 2. If 'system', use window.matchMedia('(prefers-color-scheme: dark)')
  // 3. Apply data-theme attribute on document.documentElement
  // 4. Listen for system preference changes
  // 5. Sync to user profile API when authenticated
}
```

---

### 2. Typography

#### Font Stack
```css
/* Global font configuration */
:root {
  /* Primary: clean, professional sans-serif with excellent Latin + extended support */
  --font-sans: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;

  /* Monospace: for codes, references, amounts */
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;

  /* Scale: based on 1rem = 16px, modular scale 1.25 */
  --text-xs:   0.75rem;    /* 12px — captions, badges */
  --text-sm:   0.875rem;   /* 14px — secondary text, table cells */
  --text-base: 1rem;       /* 16px — body text */
  --text-lg:   1.125rem;   /* 18px — emphasized body */
  --text-xl:   1.25rem;    /* 20px — section titles */
  --text-2xl:  1.5rem;     /* 24px — page titles */
  --text-3xl:  1.875rem;   /* 30px — hero text */
  --text-4xl:  2.25rem;    /* 36px — landing page hero */

  /* Line heights */
  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Font weights */
  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;
}
```

#### Typography Rules
- **Headings**: `font-semibold`, `leading-tight`, `text-primary`
- **Body text**: `font-normal`, `leading-normal`, `text-primary`
- **Labels**: `font-medium`, `text-sm`, `text-secondary`
- **Captions/helpers**: `font-normal`, `text-xs`, `text-tertiary`
- **Amounts/prices**: `font-mono`, `font-semibold` — always formatted with currency symbol
- **Booking codes**: `font-mono`, `tracking-wider`, uppercase
- **Max line length**: 65-75 characters for body text (readability)
- **Paragraph spacing**: 1.5rem between paragraphs

---

### 3. Spacing & Layout System

```css
:root {
  /* Spacing scale (4px base) */
  --space-0:  0;
  --space-1:  0.25rem;   /* 4px */
  --space-2:  0.5rem;    /* 8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-5:  1.25rem;   /* 20px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */

  /* Border radius */
  --radius-sm:   0.25rem;   /* 4px — badges, small buttons */
  --radius-md:   0.5rem;    /* 8px — cards, inputs */
  --radius-lg:   0.75rem;   /* 12px — modals, large cards */
  --radius-xl:   1rem;      /* 16px — hero cards */
  --radius-full: 9999px;    /* Pills, avatars */

  /* Shadows (subtle, professional) */
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
  --shadow-md:  0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
  --shadow-lg:  0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04);
  --shadow-xl:  0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04);
}
```

#### Layout Patterns

**Page Layout (Authenticated)**
```
┌─────────────────────────────────────────────────┐
│  Top Bar: Logo | Search | Notifications | User  │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│  Sidebar │   Page Content                       │
│  (Nav)   │   ┌─────────────────────────────┐    │
│          │   │  Page Title + Actions        │    │
│  - Home  │   ├─────────────────────────────┤    │
│  - Trips │   │                             │    │
│  - Fleet │   │  Content Area               │    │
│  - ...   │   │                             │    │
│          │   └─────────────────────────────┘    │
└──────────┴──────────────────────────────────────┘
```
- Sidebar: collapsible, 240px expanded, 64px collapsed (icon-only)
- Content area: max-width 1280px, centered with padding
- Mobile: sidebar becomes bottom tab bar (5 key items max)

**Page Layout (Public / Passenger)**
```
┌─────────────────────────────────────────────────┐
│  Navbar: Logo | Search | Language | Login       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Full-width content                             │
│  (Marketplace, Search Results, Booking Flow)    │
│                                                 │
├─────────────────────────────────────────────────┤
│  Footer: Links | Language | Currency | Social   │
└─────────────────────────────────────────────────┘
```

---

### 4. Core Component Library

All components built on Radix UI Themes, extended with Souple design tokens.

#### Buttons
```typescript
// components/ui/button.tsx
// Variants:
//   primary   — solid brand color, white text (main CTAs: "Book Now", "Save", "Confirm")
//   secondary — outlined, brand color border and text (secondary actions)
//   ghost     — no border, subtle hover bg (tertiary actions, icon buttons)
//   danger    — solid red (destructive: "Cancel Booking", "Delete")
//   success   — solid green (confirmations: "Confirm Payment")
//
// Sizes:
//   sm  — height 32px, text-sm  (table actions, inline)
//   md  — height 40px, text-base (default)
//   lg  — height 48px, text-lg  (main CTAs, POS)
//   xl  — height 56px, text-xl  (POS primary action, mobile full-width)
//
// States: default, hover, active, focus-visible (ring), disabled, loading (spinner)
// Loading: replaces text with spinner, maintains button width to prevent layout shift
// Icons: optional leading/trailing icon with consistent spacing
```

#### Cards
```typescript
// components/ui/card.tsx
// Structure:
//   <Card>
//     <Card.Header>    — optional: title + subtitle + action buttons
//     <Card.Content>   — main content area
//     <Card.Footer>    — optional: bottom actions, meta info
//   </Card>
//
// Variants:
//   default  — white bg, subtle border, shadow-sm
//   elevated — white bg, no border, shadow-md (hover: shadow-lg)
//   outlined — white bg, strong border, no shadow
//   ghost    — transparent bg, no border (for grid items)
//   status   — left border colored by status (booking cards, trip cards)
//
// Usage examples:
//   Trip card:    status variant with departure/arrival, price, seats available
//   Booking card: status variant with QR code, passenger info, status badge
//   Stat card:    elevated, large number + label + trend indicator
//   Vehicle card: default, photo + plate + status
```

#### Data Tables
```typescript
// components/ui/data-table.tsx
// Built on @tanstack/react-table
//
// Features:
//   - Sortable columns (click header, arrow indicator)
//   - Filterable (search input per column or global)
//   - Pagination (page size selector: 10/25/50/100)
//   - Row selection (checkbox, bulk actions bar appears)
//   - Responsive: horizontal scroll on mobile with sticky first column
//   - Loading: skeleton rows (not spinner)
//   - Empty: illustrated empty state with action CTA
//   - Density: compact (32px rows) / default (44px rows) / relaxed (56px rows)
//
// Column types with proper formatting:
//   - Text: left-aligned, truncated with tooltip on overflow
//   - Number/Amount: right-aligned, formatted per locale, mono font
//   - Date/Time: formatted per user timezone and locale
//   - Status: badge with colored dot
//   - Actions: icon buttons (view, edit, delete) in last column
//   - Avatar + Name: user/org display
```

#### Forms
```typescript
// components/ui/form-field.tsx
// Structure:
//   <FormField>
//     <FormField.Label>      — text-sm, font-medium, text-secondary
//     <FormField.Description> — text-xs, text-tertiary (optional helper text)
//     <FormField.Input />     — the actual input component
//     <FormField.Error>       — text-xs, text-danger, appears on validation error
//   </FormField>
//
// Input variants:
//   TextInput     — standard text, with optional leading/trailing icon
//   NumberInput   — with increment/decrement, min/max, formatted display
//   PhoneInput    — with country code selector (default +243 for DRC)
//   CurrencyInput — with currency selector, formatted as user types
//   DatePicker    — calendar popup, timezone-aware, locale-formatted display
//   TimePicker    — 24h or 12h based on locale
//   Select        — single select with search
//   MultiSelect   — multi-select with tags
//   TextArea      — auto-grow, max height, character count
//   FileUpload    — drag and drop, preview thumbnails, size limit display
//   Toggle        — for boolean settings
//   RadioGroup    — card-style radio for important choices (payment method, seat class)
//
// Validation:
//   - Validate on blur (not on every keystroke)
//   - Show error after first blur or form submission attempt
//   - Inline errors below field (not toast/alert)
//   - Success state (green check) on corrected field
```

#### Status Badges
```typescript
// components/ui/status-badge.tsx
// Consistent status display across all entities:
//
// Pattern: [●] Status Text
//   - Colored dot (8px circle) + text
//   - Background tinted with status color at 10% opacity
//   - Border-radius: full (pill shape)
//   - Font: text-xs, font-medium
//
// Booking:  pending | confirmed | checked_in | completed | cancelled | refunded
// Trip:     scheduled | boarding | departed | arrived | completed | cancelled
// Payment:  pending | processing | completed | failed | refunded
// Vehicle:  active | maintenance | inactive | pending_verification
// Driver:   available | on_trip | offline
// Subscription: active | trialing | past_due | cancelled | expired
```

#### Navigation
```typescript
// components/layout/sidebar.tsx
// - Grouped sections: Main, Fleet, Finance, Settings
// - Active item: bg-primary/10, text-primary, left border accent
// - Badge counts on nav items (e.g., "Bookings" with pending count)
// - Collapse: stores preference in localStorage
// - Mobile: bottom tab bar with 5 key items, "More" for the rest
// - Role-aware: only shows items the user's role can access

// components/layout/top-bar.tsx
// - Left: hamburger (mobile) + breadcrumbs
// - Center: global search (Cmd+K shortcut)
// - Right: notification bell (with unread count), org switcher, user menu
// - Sticky: stays visible on scroll
// - Height: 56px (desktop), 48px (mobile)
```

#### Modals & Dialogs
```typescript
// components/ui/dialog.tsx
// - Overlay: neutral-900 at 50% opacity, click to close (unless critical)
// - Content: max-width 480px (sm), 640px (md), 800px (lg)
// - Animation: fade in overlay + slide up content (200ms)
// - Focus trap: tab cycles within modal
// - Close: X button top-right + Escape key
// - Footer: right-aligned buttons (Cancel | Primary Action)
//
// Variants:
//   confirm  — "Are you sure?" with destructive action
//   form     — contains a form (scroll if long)
//   info     — read-only content display
//   fullscreen — mobile: takes full screen
```

#### Toast Notifications
```typescript
// components/ui/toast.tsx
// Position: bottom-right (desktop), bottom-center (mobile)
// Duration: 5s (info/success), 8s (warning), persistent (error, must dismiss)
// Stack: max 3 visible, older ones pushed up
// Variants: success (green), error (red), warning (amber), info (blue)
// Structure: [icon] [message] [optional action link] [dismiss X]
// Animation: slide in from right + fade
```

---

### 5. Timezone Handling

**Principle**: All times stored in UTC in the database. All times displayed in the user's local timezone.

```typescript
// lib/timezone.ts
import { DateTime } from 'luxon'

/**
 * Timezone detection priority:
 * 1. User profile setting (user.timezone) — if explicitly set
 * 2. Browser's Intl.DateTimeFormat().resolvedOptions().timeZone
 * 3. Fallback: 'Africa/Lubumbashi' (DRC default)
 */
export function getUserTimezone(): string {
  // Check user profile first (from auth context)
  // Then browser detection
  // Then fallback
}

/**
 * Display a timestamp in the user's timezone.
 * NEVER display raw UTC to users.
 */
export function formatDateTime(
  isoString: string,
  options?: {
    format?: 'full' | 'date' | 'time' | 'relative' | 'short'
    timezone?: string
    locale?: string
  }
): string {
  const tz = options?.timezone ?? getUserTimezone()
  const locale = options?.locale ?? getUserLocale()
  const dt = DateTime.fromISO(isoString, { zone: 'utc' }).setZone(tz).setLocale(locale)

  switch (options?.format) {
    case 'full':
      // "Jeudi 27 février 2026 à 14:30" (fr)
      // "Thursday, February 27, 2026 at 2:30 PM" (en)
      return dt.toLocaleString(DateTime.DATETIME_FULL)

    case 'date':
      // "27 févr. 2026" (fr) / "Feb 27, 2026" (en)
      return dt.toLocaleString(DateTime.DATE_MED)

    case 'time':
      // "14:30" (fr, 24h) / "2:30 PM" (en, 12h based on locale)
      return dt.toLocaleString(DateTime.TIME_SIMPLE)

    case 'short':
      // "27/02 14:30" (fr) / "02/27 2:30 PM" (en)
      return dt.toLocaleString(DateTime.DATETIME_SHORT)

    case 'relative':
      // "il y a 5 minutes" / "5 minutes ago" / "dans 2 heures" / "in 2 hours"
      return dt.toRelative({ locale }) ?? ''

    default:
      // "27 févr. 2026, 14:30" (fr) / "Feb 27, 2026, 2:30 PM" (en)
      return dt.toLocaleString(DateTime.DATETIME_MED)
  }
}

/**
 * Format trip departure/arrival with timezone indicator
 * Shows timezone abbreviation when displaying for a different city
 */
export function formatTripTime(
  isoString: string,
  cityTimezone: string,  // Timezone of the departure/arrival city
  locale: string
): string {
  const dt = DateTime.fromISO(isoString, { zone: 'utc' }).setZone(cityTimezone).setLocale(locale)
  const userTz = getUserTimezone()

  // If city timezone differs from user timezone, show abbreviation
  if (cityTimezone !== userTz) {
    return `${dt.toLocaleString(DateTime.TIME_SIMPLE)} (${dt.offsetNameShort})`
    // e.g., "14:30 (CAT)" or "2:30 PM (WAT)"
  }

  return dt.toLocaleString(DateTime.TIME_SIMPLE)
}

/**
 * Duration formatting
 * "5h 30min" — always this format, locale-independent
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}
```

#### Timezone in the UI
```typescript
// components/ui/time-display.tsx
// Smart time component that handles all display logic:
//
// <TimeDisplay
//   value="2026-02-27T12:30:00Z"
//   format="full"           // full | date | time | relative | short
//   cityTimezone="Africa/Lubumbashi"  // optional: for trip times
//   showTooltip              // hover shows full datetime + timezone
// />
//
// Tooltip always shows: "Thursday, February 27, 2026 at 14:30 CAT (UTC+2)"
// This way users always have access to the full context.
//
// Relative time auto-updates every minute (for "5 minutes ago" displays)
```

#### Timezone in API Responses
```typescript
// API convention:
// - All timestamps returned as ISO 8601 UTC: "2026-02-27T12:30:00.000Z"
// - The frontend ALWAYS converts to user's timezone for display
// - Trip departure/arrival times: returned in UTC, displayed in city's timezone
// - Cities table includes: timezone VARCHAR(50) — e.g., 'Africa/Lubumbashi', 'Africa/Kinshasa'
// - DRC has two timezones:
//     West (Kinshasa, Bandundu, Équateur): Africa/Kinshasa (UTC+1)
//     East (Lubumbashi, Goma, Bukavu): Africa/Lubumbashi (UTC+2)
```

---

### 6. Internationalization & Localization (i18n / l10n)

**This goes beyond Skill 11's basic i18n setup.** This defines the full localization strategy.

#### Supported Locales

| Locale | Language   | Region          | Date Format | Time Format | Number Format | Currency Display |
|--------|-----------|-----------------|-------------|-------------|---------------|------------------|
| `fr-CD` | French    | DRC (default)  | DD/MM/YYYY  | 24h (14:30) | 1 234,56      | 1 500 FC / 25,00 $ |
| `en-CD` | English   | DRC            | MM/DD/YYYY  | 12h (2:30 PM)| 1,234.56     | FC 1,500 / $25.00 |
| `ln-CD` | Lingala   | DRC (West)     | DD/MM/YYYY  | 24h          | 1 234,56      | 1 500 FC |
| `sw-CD` | Swahili   | DRC (East)     | DD/MM/YYYY  | 24h          | 1.234,56      | FC 1.500 |

#### Locale Detection Priority
```typescript
// lib/locale.ts
/**
 * Locale resolution:
 * 1. URL path prefix: /fr/dashboard, /en/dashboard, /ln/dashboard, /sw/dashboard
 * 2. User profile setting (user.locale)
 * 3. Cookie (NEXT_LOCALE)
 * 4. Accept-Language header
 * 5. Fallback: 'fr-CD'
 */
```

#### Translation File Structure
```
messages/
  fr/
    common.json        — shared: buttons, labels, navigation, statuses
    auth.json          — login, register, password
    trips.json         — trip search, trip details, booking
    fleet.json         — vehicles, seat layouts
    payments.json      — payment methods, receipts
    dashboard.json     — dashboard-specific labels
    notifications.json — notification messages
    errors.json        — error messages, validation
    marketplace.json   — public marketplace
  en/
    ... (same structure)
  ln/
    ... (same structure)
  sw/
    ... (same structure)
```

#### Translation Patterns
```typescript
// GOOD: parameterized messages, handle plurals, handle gender
{
  "booking.seats_selected": "{count, plural, =0 {Aucun siège sélectionné} =1 {1 siège sélectionné} other {# sièges sélectionnés}}",
  "trip.departure_in": "Départ dans {hours, plural, =1 {1 heure} other {# heures}} et {minutes, plural, =1 {1 minute} other {# minutes}}",
  "booking.confirmed_by": "Réservation confirmée par {name}",
  "dashboard.revenue_period": "Revenu du {startDate} au {endDate}",
}

// BAD: concatenated strings (breaks in other languages)
// `t('seats') + ': ' + count` — NEVER do this
```

#### Number & Currency Formatting
```typescript
// lib/format.ts

/**
 * Format currency amount per user's locale
 * Handles CDF (Franc Congolais) and USD
 */
export function formatCurrency(
  amount: number,
  currency: 'CDF' | 'USD' | 'EUR',
  locale?: string
): string {
  const userLocale = locale ?? getUserLocale()

  // Custom handling for CDF (not always in Intl databases)
  if (currency === 'CDF') {
    const formatted = new Intl.NumberFormat(userLocale, {
      minimumFractionDigits: 0,  // CDF doesn't use decimals typically
      maximumFractionDigits: 0,
    }).format(amount)
    return `${formatted} FC`  // "1 500 FC" (fr) or "1,500 FC" (en)
  }

  return new Intl.NumberFormat(userLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
  // "25,00 $" (fr) or "$25.00" (en)
}

/**
 * Format phone numbers for display
 * DRC numbers: +243 XXX XXX XXX
 */
export function formatPhone(phone: string): string {
  // Parse and format with libphonenumber-js
  // Display: +243 812 345 678
}

/**
 * Format distance
 * Always in km for DRC market
 */
export function formatDistance(km: number, locale?: string): string {
  return `${new Intl.NumberFormat(locale ?? getUserLocale()).format(Math.round(km))} km`
}
```

#### Language Switcher Component
```typescript
// components/ui/language-switcher.tsx
// - Dropdown in header (desktop) and settings (mobile)
// - Shows: Flag + language name in that language ("Français", "English", "Lingála", "Kiswahili")
// - On change: updates URL prefix, cookie, user profile (if authenticated)
// - Content re-renders without full page reload (next-intl handles this)
// - Persistent: remembered across sessions
```

#### RTL Support (Future-Proofing)
```typescript
// Not needed now, but structure supports it:
// - All spacing uses logical properties (margin-inline-start, not margin-left)
// - Flexbox direction inherits from dir attribute
// - If Arabic is added later, just add dir="rtl" on <html>
```

---

### 7. Role-Specific UI Patterns

Each role sees a different level of information density and interaction pattern.

#### Passenger (Public)
- **Feel**: Spacious, welcoming, image-rich
- **Typography**: Larger text (base 16px), generous spacing
- **Navigation**: Simple top navbar, minimal options
- **Key screens**: Search → Results → Trip Detail → Seat Selection → Payment → Confirmation
- **Mobile-first**: Designed for phone screens primarily
- **Colors**: Brand blue + lots of white space

#### Ticketer (POS)
- **Feel**: Fast, functional, large targets
- **Typography**: Large text (base 18px), bold key info
- **Navigation**: Minimal — single-purpose screens
- **Key screens**: Quick search → Select trip → Select seats → Confirm payment → Print
- **Touch-optimized**: Minimum 48px touch targets, large buttons
- **Speed**: < 30 seconds from open to ticket printed
- **Offline indicator**: Always visible connection status bar

#### Driver
- **Feel**: Functional, glanceable while stationary
- **Typography**: Large (base 18px), high contrast
- **Navigation**: Bottom tabs (Today's Trips, Passengers, Earnings, Profile)
- **Key screens**: Today's trip list → Trip detail with passenger list → Check-in → GPS tracking
- **Touch-optimized**: Large action buttons, swipe gestures
- **Dark mode default**: Reduce glare while driving at night

#### Agency Manager
- **Feel**: Professional dashboard, data-dense
- **Typography**: Standard (base 14-16px), compact tables
- **Navigation**: Full sidebar with grouped sections
- **Key screens**: Dashboard overview → Trips → Bookings → Fleet → Finance → Settings
- **Desktop-first**: Designed for laptop/desktop, responsive to tablet

#### Finance
- **Feel**: Spreadsheet-like precision, numbers prominent
- **Typography**: Mono font for all amounts, right-aligned numbers
- **Navigation**: Focused sidebar (Revenue, Expenses, Payouts, Invoices, Taxes)
- **Key screens**: Revenue dashboard → Transaction list → Payout management → Reports

#### Super Admin
- **Feel**: Dense, technical, comprehensive
- **Typography**: Compact (base 14px), high density tables
- **Navigation**: Full sidebar with admin sections
- **Key screens**: Platform overview → Orgs → Users → Subscriptions → KYC → Revenue → Audit logs

---

### 8. Responsive Breakpoints

```css
:root {
  /* Breakpoints (Tailwind defaults, customized) */
  --bp-sm:  640px;    /* Large phones (landscape) */
  --bp-md:  768px;    /* Tablets */
  --bp-lg:  1024px;   /* Small laptops */
  --bp-xl:  1280px;   /* Desktops */
  --bp-2xl: 1536px;   /* Large screens */
}

/* Mobile-first approach:
   - Base styles: mobile (< 640px)
   - sm: side-by-side layouts start
   - md: sidebar appears (collapsible)
   - lg: sidebar permanent, content max-width
   - xl: comfortable dashboard density
   - 2xl: max-width container, centered
*/
```

#### Key Responsive Behaviors
| Component | Mobile (< 768px) | Tablet (768-1024px) | Desktop (> 1024px) |
|-----------|------------------|---------------------|---------------------|
| Sidebar | Bottom tab bar | Collapsed (icons) | Expanded |
| Data tables | Card list view | Horizontal scroll | Full table |
| Forms | Stacked (1 col) | 2 columns | 2-3 columns |
| Stat cards | 2 per row | 3 per row | 4 per row |
| Trip results | Card list | Card list | Table or card toggle |
| Seat selector | Full width, scroll | Side panel | Side panel |
| Modal | Full screen | Centered overlay | Centered overlay |

---

### 9. Loading & Empty States

#### Loading Patterns
```typescript
// RULE: Never show a blank white screen. Always show structure.

// Page load: skeleton screen matching the layout
// components/ui/skeleton.tsx
// - Skeleton blocks pulse with subtle animation
// - Match the shape of the content they replace
// - Use for: cards, tables, text blocks, avatars

// Data fetching: skeleton rows in tables, skeleton cards in grids
// Navigation: instant (optimistic), content area shows skeleton

// Action loading: button shows spinner, stays same width
// Form submit: button disabled + spinner, form fields disabled

// Infinite scroll: skeleton row at bottom while loading more
```

#### Empty States
```typescript
// components/ui/empty-state.tsx
// Every list/table has an empty state. Never just show nothing.
//
// Structure:
//   [Illustration or Icon]
//   [Title: what's empty]
//   [Description: why it's empty or what to do]
//   [CTA button: the primary action to fill it]
//
// Examples:
//   No trips: "No trips yet" / "Create your first trip to start selling tickets" / [Create Trip]
//   No bookings: "No bookings found" / "Bookings will appear here when passengers book" / [View Marketplace]
//   No vehicles: "No vehicles registered" / "Add your first vehicle to get started" / [Add Vehicle]
//   Search no results: "No trips found" / "Try different dates or a nearby route" / [Clear Filters]
```

#### Error States
```typescript
// components/ui/error-state.tsx
// Friendly, not technical. User shouldn't see stack traces.
//
// 404: "Page not found" / "The page you're looking for doesn't exist or has moved" / [Go Home]
// 500: "Something went wrong" / "We're working on fixing this. Please try again." / [Retry]
// Network error: "You're offline" / "Check your internet connection and try again" / [Retry]
// Permission: "Access denied" / "You don't have permission to view this page" / [Go to Dashboard]
// Expired session: "Session expired" / "Please log in again to continue" / [Log In]
```

---

### 10. Animation & Transitions

```css
/* Subtle, functional animations only. No decorative bounces or flashes. */

:root {
  --duration-fast:   100ms;   /* Hover states, active states */
  --duration-normal: 200ms;   /* Page transitions, modal open/close */
  --duration-slow:   300ms;   /* Complex layout changes */
  --ease-default:    cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in:         cubic-bezier(0.4, 0, 1, 1);
  --ease-out:        cubic-bezier(0, 0, 0.2, 1);
}

/* What gets animated:
   - Page transitions: fade (200ms)
   - Modal: overlay fade + content slide-up (200ms)
   - Dropdown/popover: fade + slight scale (150ms)
   - Sidebar collapse: width transition (200ms)
   - Toast: slide in from right (200ms)
   - Skeleton: pulse opacity 0.4 → 1 → 0.4 (1.5s loop)
   - Theme toggle: background-color + color (200ms)
   - Hover on cards: shadow transition (150ms)

   What does NOT get animated:
   - Data table sorting (instant)
   - Form validation errors (instant appear)
   - Status badge changes (instant)
   - Navigation active state (instant)
*/

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### 11. Accessibility Standards

- **WCAG 2.1 AA** compliance minimum
- Color contrast: minimum 4.5:1 for text, 3:1 for large text and UI elements
- All interactive elements keyboard-accessible (Tab, Enter, Escape, Arrow keys)
- Focus-visible ring: 2px solid primary-500, 2px offset (never hidden)
- Screen reader: all images have alt text, all icons have aria-label, live regions for dynamic content
- Form errors: announced via aria-live, associated via aria-describedby
- Skip to content link (hidden until focused)
- Semantic HTML: proper heading hierarchy (h1 → h2 → h3), landmarks (nav, main, aside)
- Touch targets: minimum 44x44px (WCAG), 48x48px preferred
- No information conveyed by color alone (always paired with icon or text)

---

### 12. Iconography

```typescript
// Use Lucide React icons (consistent, clean, MIT licensed)
// https://lucide.dev
//
// Icon sizes aligned to text:
//   16px (text-sm context)
//   20px (text-base context, default)
//   24px (text-lg context, navigation)
//   32px (empty states, feature highlights)
//
// Icon + text: 8px gap (space-2)
// Icon-only buttons: always have aria-label + tooltip on hover
//
// Consistent icon mapping:
//   Search: Search
//   Trips: Route / MapPin
//   Vehicles: Bus / Car
//   Bookings: Ticket / Calendar
//   Payments: CreditCard / Wallet
//   Notifications: Bell
//   Settings: Settings
//   User: User / UserCircle
//   Dashboard: LayoutDashboard
//   Finance: DollarSign / PiggyBank
//   GPS: Navigation / MapPin
//   Offline: WifiOff
//   Print: Printer
//   QR Code: QrCode
//   Edit: Pencil
//   Delete: Trash2
//   Add: Plus
//   Close: X
//   Back: ArrowLeft
//   Menu: Menu
//   More: MoreVertical
//   Success: CheckCircle
//   Warning: AlertTriangle
//   Error: XCircle
//   Info: Info
```

---

## Acceptance Criteria

1. Design tokens (colors, spacing, typography) defined and used consistently across all components
2. Light and dark themes work across all pages, toggle persists across sessions
3. All timestamps display in user's local timezone — never raw UTC
4. DRC's two timezones (Kinshasa UTC+1 / Lubumbashi UTC+2) handled correctly for trip times
5. Time tooltip always shows full datetime with timezone name
6. Language switching works across all 4 languages (FR, EN, LN, SW) without page reload
7. All dates, numbers, currencies, and phone numbers formatted per locale
8. CDF amounts display as "1 500 FC" (fr) without decimals
9. USD amounts display as "25,00 $" (fr) or "$25.00" (en)
10. Responsive layouts work from 320px (small phone) to 2560px (large desktop)
11. Data tables switch to card view on mobile
12. All loading states use skeleton screens, not spinners
13. All empty states have illustration + description + CTA
14. All interactive elements are keyboard-accessible with visible focus indicators
15. Color contrast meets WCAG 2.1 AA (4.5:1 minimum)
16. Animations respect `prefers-reduced-motion`
17. Ticketer POS has minimum 48px touch targets
18. Role-specific UI density is appropriate (spacious for passengers, dense for admin)

---

## Dependencies
- Skill 01 (Foundation) — user profile stores timezone and locale preferences
- Skill 11 (Deployment) — i18n translation files, font loading

## Blocks
- All other skills (every UI component follows this design system)
