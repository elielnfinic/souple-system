import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Variants & Sizes ─────────────────────────────────────────────────────────

const variantClasses = {
  primary:
    'bg-[#0A7AFF] text-white hover:bg-[#0062d6] active:bg-[#004dad] ' +
    'disabled:bg-[#9CA3AF] disabled:cursor-not-allowed ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7AFF] focus-visible:ring-offset-2',

  secondary:
    'bg-transparent text-[#0A7AFF] border border-[#0A7AFF] hover:bg-[#f0f7ff] active:bg-[#e0efff] ' +
    'disabled:text-[#9CA3AF] disabled:border-[#9CA3AF] disabled:cursor-not-allowed ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7AFF] focus-visible:ring-offset-2',

  ghost:
    'bg-transparent text-[#374151] hover:bg-[#F3F4F6] active:bg-[#E5E7EB] ' +
    'disabled:text-[#9CA3AF] disabled:cursor-not-allowed ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7AFF] focus-visible:ring-offset-2',

  danger:
    'bg-[#DC2626] text-white hover:bg-[#b91c1c] active:bg-[#991b1b] ' +
    'disabled:bg-[#9CA3AF] disabled:cursor-not-allowed ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2',

  success:
    'bg-[#16A34A] text-white hover:bg-[#15803d] active:bg-[#166534] ' +
    'disabled:bg-[#9CA3AF] disabled:cursor-not-allowed ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2',
} as const

const sizeClasses = {
  sm: 'h-8  px-3   text-sm  gap-1.5 rounded-[6px]',
  md: 'h-10 px-4   text-base gap-2  rounded-[8px]',
  lg: 'h-12 px-5   text-lg  gap-2  rounded-[8px]',
  xl: 'h-14 px-6   text-xl  gap-2.5 rounded-[10px]',
} as const

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses
  size?: keyof typeof sizeClasses
  loading?: boolean
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
  fullWidth?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leadingIcon,
      trailingIcon,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-colors duration-100',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size={size} />
            {/* Keep original text for width, hidden for screen readers */}
            <span className="invisible absolute">{children}</span>
            {/* Visible loading text */}
            <span aria-hidden="true" className="opacity-0 select-none">
              {children}
            </span>
          </>
        ) : (
          <>
            {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
            {children}
            {trailingIcon && <span className="shrink-0">{trailingIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size }: { size: keyof typeof sizeClasses }) {
  const spinnerSize = { sm: 14, md: 16, lg: 18, xl: 20 }[size]

  return (
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={spinnerSize}
      height={spinnerSize}
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
