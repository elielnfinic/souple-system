import * as React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown } from 'lucide-react'

// ─── Color map ────────────────────────────────────────────────────────────────

const colorMap = {
  blue:   { bg: 'bg-[#EFF6FF] dark:bg-[#1E3A5F]', icon: 'text-[#2563EB] dark:text-[#60A5FA]' },
  green:  { bg: 'bg-[#F0FDF4] dark:bg-[#14532D]', icon: 'text-[#16A34A] dark:text-[#4ADE80]' },
  red:    { bg: 'bg-[#FEF2F2] dark:bg-[#7F1D1D]', icon: 'text-[#DC2626] dark:text-[#F87171]' },
  yellow: { bg: 'bg-[#FEFCE8] dark:bg-[#713F12]', icon: 'text-[#CA8A04] dark:text-[#FACC15]' },
  purple: { bg: 'bg-[#F5F3FF] dark:bg-[#3B0764]', icon: 'text-[#7C3AED] dark:text-[#A78BFA]' },
} as const

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  color?: keyof typeof colorMap
  loading?: boolean
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'blue',
  loading = false,
  className,
}: StatCardProps) {
  const palette = colorMap[color]

  if (loading) {
    return (
      <div className={cn(
        'rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] p-4 space-y-2',
        className
      )}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
    )
  }

  const trendPositive = trend && trend.value >= 0

  return (
    <div className={cn(
      'rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] p-4',
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] truncate">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#111827] dark:text-[#F9FAFB] tabular-nums leading-tight">
            {value}
          </p>
          {trend && (
            <p className={cn(
              'mt-1.5 flex items-center gap-0.5 text-xs font-medium',
              trendPositive
                ? 'text-[#16A34A] dark:text-[#4ADE80]'
                : 'text-[#DC2626] dark:text-[#F87171]'
            )}>
              {trendPositive
                ? <TrendingUp size={12} aria-hidden="true" />
                : <TrendingDown size={12} aria-hidden="true" />}
              <span>{trendPositive ? '+' : ''}{trend.value}%</span>
              <span className="ml-1 text-[#9CA3AF] dark:text-[#6B7280] font-normal">
                {trend.label}
              </span>
            </p>
          )}
        </div>

        {icon && (
          <div className={cn('shrink-0 rounded-lg p-2.5', palette.bg)}>
            <span className={cn('block [&>svg]:w-5 [&>svg]:h-5', palette.icon)}>
              {icon}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
