import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Variants ─────────────────────────────────────────────────────────────────

const cardVariants = {
  default:
    'bg-white dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-lg',

  elevated:
    'bg-white dark:bg-[#1F2937] border-0 ' +
    'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07),0_2px_4px_-2px_rgba(0,0,0,0.05)] ' +
    'hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08),0_4px_6px_-4px_rgba(0,0,0,0.04)] ' +
    'transition-shadow duration-150 rounded-lg',

  outlined:
    'bg-white dark:bg-[#1F2937] border-2 border-[#D1D5DB] dark:border-[#4B5563] rounded-lg',

  ghost:
    'bg-transparent border-0 rounded-lg',

  // Left border accent — color driven by data-status attribute
  status:
    'bg-white dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-lg border-l-4',
} as const

// ─── Root ─────────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants
  statusColor?: string
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', statusColor, className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants[variant], className)}
      style={statusColor ? { borderLeftColor: statusColor, ...style } : style}
      {...props}
    />
  )
)
Card.displayName = 'Card'

// ─── Header ──────────────────────────────────────────────────────────────────

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] dark:border-[#374151]', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

// ─── Title ────────────────────────────────────────────────────────────────────

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] leading-tight', className)}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

// ─── Content ──────────────────────────────────────────────────────────────────

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4', className)} {...props} />
))
CardContent.displayName = 'CardContent'

// ─── Footer ───────────────────────────────────────────────────────────────────

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center px-4 py-3 border-t border-[#E5E7EB] dark:border-[#374151]', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardContent, CardFooter }
