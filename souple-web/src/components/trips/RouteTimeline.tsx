'use client'

import { cn } from '@/lib/utils'
import type { TripStop } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface RouteTimelineProps {
  stops: TripStop[]
  boardingStopId?: number
  alightingStopId?: number
  onStopClick?: (stop: TripStop) => void
  selectionMode?: 'boarding' | 'alighting' | null
  className?: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatTime(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-CD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RouteTimeline({
  stops,
  boardingStopId,
  alightingStopId,
  onStopClick,
  selectionMode,
  className,
}: RouteTimelineProps) {
  const sorted = [...stops].sort((a, b) => a.stopOrder - b.stopOrder)

  return (
    <div className={cn('relative pl-8', className)}>
      {/* Vertical line */}
      <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-[#E5E7EB] dark:bg-[#374151]" aria-hidden="true" />

      <ol className="space-y-0">
        {sorted.map((stop, idx) => {
          const isBoarding = stop.id === boardingStopId
          const isAlighting = stop.id === alightingStopId
          const isFirst = idx === 0
          const isLast = idx === sorted.length - 1
          const isSelected = isBoarding || isAlighting
          const isIntermediate = !isFirst && !isLast

          const stopName = stop.city?.name ?? stop.stopName ?? `Arrêt ${stop.stopOrder + 1}`
          const scheduledTime = stop.scheduledDepartureAt ?? stop.scheduledArrivalAt

          // Dot color
          let dotColor = '#E5E7EB'
          let dotBorder = '#D1D5DB'
          if (isBoarding) { dotColor = '#16A34A'; dotBorder = '#16A34A' }
          else if (isAlighting) { dotColor = '#DC2626'; dotBorder = '#DC2626' }
          else if (isFirst) { dotColor = '#0A7AFF'; dotBorder = '#0A7AFF' }
          else if (isLast) { dotColor = '#0A7AFF'; dotBorder = '#0A7AFF' }

          const isClickable = !!onStopClick && (
            selectionMode === 'boarding' ? stop.boardingEnabled :
            selectionMode === 'alighting' ? stop.alightingEnabled :
            true
          )

          return (
            <li key={stop.id} className="relative flex items-start gap-3 py-2">
              {/* Dot */}
              <div
                className={cn(
                  'absolute left-[-26px] top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white dark:bg-[#111827] z-10 transition-all duration-100',
                  isSelected && 'ring-2 ring-offset-1',
                  isBoarding && 'ring-[#16A34A]',
                  isAlighting && 'ring-[#DC2626]',
                )}
                style={{ borderColor: dotBorder }}
                aria-hidden="true"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: dotColor }}
                />
              </div>

              {/* Stop card */}
              <button
                type="button"
                disabled={!isClickable}
                onClick={isClickable ? () => onStopClick?.(stop) : undefined}
                className={cn(
                  'flex-1 text-left rounded-xl px-4 py-2.5 border transition-all duration-100',
                  isClickable
                    ? 'cursor-pointer hover:border-[#0A7AFF] hover:bg-[#F0F7FF] dark:hover:bg-[#0A7AFF]/10'
                    : 'cursor-default',
                  isBoarding
                    ? 'border-[#16A34A] bg-[#F0FDF4] dark:bg-[#16A34A]/10'
                    : isAlighting
                    ? 'border-[#DC2626] bg-[#FEF2F2] dark:bg-[#DC2626]/10'
                    : 'border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1C1C1E]'
                )}
                aria-label={stopName}
                aria-pressed={isSelected}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className={cn(
                      'text-sm font-medium',
                      isBoarding ? 'text-[#16A34A]' :
                      isAlighting ? 'text-[#DC2626]' :
                      'text-[#111827] dark:text-[#F9FAFB]'
                    )}>
                      {stopName}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {isIntermediate && (
                        <span className="text-[10px] text-[#9CA3AF]">Intermédiaire</span>
                      )}
                      {isFirst && (
                        <span className="text-[10px] font-medium text-[#0A7AFF]">Départ</span>
                      )}
                      {isLast && (
                        <span className="text-[10px] font-medium text-[#0A7AFF]">Arrivée finale</span>
                      )}
                      {isBoarding && (
                        <span className="text-[10px] font-semibold text-[#16A34A]">Montée</span>
                      )}
                      {isAlighting && (
                        <span className="text-[10px] font-semibold text-[#DC2626]">Descente</span>
                      )}
                    </div>
                  </div>
                  {scheduledTime && (
                    <span className="text-sm font-mono text-[#6B7280] dark:text-[#9CA3AF] tabular-nums shrink-0">
                      {formatTime(scheduledTime)}
                    </span>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
