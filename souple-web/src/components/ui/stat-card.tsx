import * as React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  /** Background + foreground for the icon circle, e.g. 'bg-blue-50 text-blue-600' */
  iconClass?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'flat'
    label?: string
  }
  description?: string
  loading?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  icon,
  iconClass = 'bg-[#EFF6FF] dark:bg-[#0A7AFF]/15 text-[#0A7AFF]',
  trend,
  description,
  loading = false,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn(
        'bg-white dark:bg-[#1C1C1E] rounded-2xl p-5',
        'border border-[#E5E7EB] dark:border-[#2C2C2E]',
        'shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]',
        'space-y-3',
        className
      )}>
        <Skeleton className="w-9 h-9 rounded-xl" />
        <div className="space-y-2 pt-1">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3.5 w-28" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    )
  }

  return (
    <div className={cn(
      'bg-white dark:bg-[#1C1C1E] rounded-2xl p-5',
      'border border-[#E5E7EB] dark:border-[#2C2C2E]',
      'shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]',
      className
    )}>
      {/* Icon */}
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        iconClass
      )}>
        {icon}
      </div>

      {/* Value */}
      <p className="mt-4 text-[2rem] leading-none font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
        {value}
      </p>

      {/* Label */}
      <p className="mt-1.5 text-sm font-medium text-[#6B7280] dark:text-[#8E8E93]">
        {label}
      </p>

      {/* Trend / description */}
      {(trend || description) && (
        <div className="mt-3 pt-3 border-t border-[#F3F4F6] dark:border-[#2C2C2E] flex items-center gap-1.5">
          {trend ? (
            <>
              {trend.direction === 'up' && <TrendingUp size={13} className="text-[#16A34A] shrink-0" />}
              {trend.direction === 'down' && <TrendingDown size={13} className="text-[#DC2626] shrink-0" />}
              {trend.direction === 'flat' && <Minus size={13} className="text-[#9CA3AF] shrink-0" />}
              <span className={cn(
                'text-xs font-medium',
                trend.direction === 'up' && 'text-[#16A34A]',
                trend.direction === 'down' && 'text-[#DC2626]',
                trend.direction === 'flat' && 'text-[#9CA3AF]',
              )}>
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              {trend.label && (
                <span className="text-xs text-[#9CA3AF]">{trend.label}</span>
              )}
            </>
          ) : (
            <span className="text-xs text-[#9CA3AF]">{description}</span>
          )}
        </div>
      )}
    </div>
  )
}
