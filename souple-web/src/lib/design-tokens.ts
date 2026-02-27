// ─── Color System ─────────────────────────────────────────────────────────────
// Source of truth for all design tokens. All components MUST use these values.
// CSS custom properties are the runtime representation (see globals.css).

export const colors = {
  // Primary — brand blue. CTAs, active states, links.
  primary: {
    50:  '#f0f7ff',
    100: '#e0efff',
    200: '#b8dbff',
    300: '#7abfff',
    400: '#3a9fff',
    500: '#0A7AFF',   // ← main brand
    600: '#0062d6',
    700: '#004dad',
    800: '#003d85',
    900: '#002d5c',
  },

  // Neutral — text, borders, surfaces
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
  success: { 100: '#DCFCE7', 500: '#16A34A' },
  warning: { 100: '#FEF3C7', 500: '#F59E0B' },
  danger:  { 100: '#FEE2E2', 500: '#DC2626' },
  info:    { 100: '#DBEAFE', 500: '#2563EB' },
} as const

// ─── Status Colors ────────────────────────────────────────────────────────────
// Used for trip/booking/payment status badges

export const statusColors = {
  light: {
    scheduled:  { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
    boarding:   { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
    departed:   { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
    completed:  { bg: '#F9FAFB', text: '#4B5563', dot: '#9CA3AF' },
    cancelled:  { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
    confirmed:  { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
    pending:    { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
    failed:     { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
    refunded:   { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
    active:     { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
    inactive:   { bg: '#F9FAFB', text: '#4B5563', dot: '#9CA3AF' },
    maintenance:{ bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  },
  dark: {
    scheduled:  { bg: '#1E293B', text: '#60A5FA', dot: '#3B82F6' },
    boarding:   { bg: '#292524', text: '#FB923C', dot: '#F97316' },
    departed:   { bg: '#14532D', text: '#4ADE80', dot: '#22C55E' },
    completed:  { bg: '#1F2937', text: '#9CA3AF', dot: '#6B7280' },
    cancelled:  { bg: '#450A0A', text: '#FCA5A5', dot: '#EF4444' },
    confirmed:  { bg: '#14532D', text: '#4ADE80', dot: '#22C55E' },
    pending:    { bg: '#451A03', text: '#FCD34D', dot: '#F59E0B' },
    failed:     { bg: '#450A0A', text: '#FCA5A5', dot: '#EF4444' },
    refunded:   { bg: '#1E293B', text: '#60A5FA', dot: '#3B82F6' },
    active:     { bg: '#14532D', text: '#4ADE80', dot: '#22C55E' },
    inactive:   { bg: '#1F2937', text: '#9CA3AF', dot: '#6B7280' },
    maintenance:{ bg: '#451A03', text: '#FCD34D', dot: '#F59E0B' },
  },
} as const

// ─── Typography ───────────────────────────────────────────────────────────────

export const fontSizes = {
  xs:   '0.75rem',   // 12px — captions, badges
  sm:   '0.875rem',  // 14px — secondary text, table cells
  base: '1rem',      // 16px — body
  lg:   '1.125rem',  // 18px — emphasized body, ticketer/driver UI
  xl:   '1.25rem',   // 20px — section titles
  '2xl':'1.5rem',    // 24px — page titles
  '3xl':'1.875rem',  // 30px — hero text
  '4xl':'2.25rem',   // 36px — landing hero
} as const

export const fontWeights = {
  normal:   400,
  medium:   500,
  semibold: 600,
  bold:     700,
} as const

// ─── Spacing ─────────────────────────────────────────────────────────────────
// 4px base scale

export const spacing = {
  0:  '0',
  1:  '0.25rem',  // 4px
  2:  '0.5rem',   // 8px
  3:  '0.75rem',  // 12px
  4:  '1rem',     // 16px
  5:  '1.25rem',  // 20px
  6:  '1.5rem',   // 24px
  8:  '2rem',     // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
} as const

// ─── Border Radius ────────────────────────────────────────────────────────────

export const radii = {
  sm:   '0.25rem',  // 4px — badges, small buttons
  md:   '0.5rem',   // 8px — cards, inputs
  lg:   '0.75rem',  // 12px — modals, large cards
  xl:   '1rem',     // 16px — hero cards
  full: '9999px',   // pills, avatars
} as const

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)',
} as const

// ─── Animation ────────────────────────────────────────────────────────────────

export const durations = {
  fast:   '100ms',
  normal: '200ms',
  slow:   '300ms',
} as const

export const easings = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  in:      'cubic-bezier(0.4, 0, 1, 1)',
  out:     'cubic-bezier(0, 0, 0.2, 1)',
} as const

// ─── Breakpoints ──────────────────────────────────────────────────────────────

export const breakpoints = {
  sm:  '640px',   // Large phones (landscape)
  md:  '768px',   // Tablets
  lg:  '1024px',  // Small laptops
  xl:  '1280px',  // Desktops
  '2xl': '1536px',// Large screens
} as const

// ─── Layout ───────────────────────────────────────────────────────────────────

export const layout = {
  sidebarWidth:     '240px',
  sidebarCollapsed: '64px',
  topbarHeight:     '56px',
  topbarHeightMobile: '48px',
  contentMaxWidth:  '1280px',
} as const

// ─── Touch Targets ────────────────────────────────────────────────────────────

export const touchTargets = {
  min:       '44px',  // WCAG minimum
  preferred: '48px',  // Ticketer/driver UIs
} as const
