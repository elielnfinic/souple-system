'use client'

import { cn } from '@/lib/utils'
import type { TripStop } from '@/lib/types'
import type { TripManifestEntry } from '@/lib/api/trips'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TripManifestProps {
  stops: TripStop[]
  manifest: TripManifestEntry[]
  selectedStopId?: number
  onStopSelect?: (stopId: number) => void
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TripManifest({
  stops,
  manifest,
  selectedStopId,
  onStopSelect,
  className,
}: TripManifestProps) {
  const sortedStops = [...stops].sort((a, b) => a.stopOrder - b.stopOrder)

  return (
    <div className={cn('space-y-4', className)}>
      {sortedStops.map((stop) => {
        const stopData = manifest.find((m) => m.stopId === stop.id)
        const stopName = stop.city?.name ?? stop.stopName ?? `Arrêt ${stop.stopOrder + 1}`
        const isSelected = selectedStopId === stop.id
        const boardingCount = stopData?.boarding.length ?? 0
        const alightingCount = stopData?.alighting.length ?? 0

        if (!stopData || (boardingCount === 0 && alightingCount === 0)) {
          return null
        }

        return (
          <div
            key={stop.id}
            className={cn(
              'rounded-xl border bg-white dark:bg-[#1C1C1E] overflow-hidden transition-all duration-100',
              isSelected
                ? 'border-[#0A7AFF] shadow-[0_0_0_3px_rgba(10,122,255,0.1)]'
                : 'border-[#E5E7EB] dark:border-[#374151]'
            )}
          >
            {/* Stop header */}
            <button
              type="button"
              onClick={() => onStopSelect?.(stop.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#F9FAFB] dark:bg-[#111827] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] transition-colors duration-100 text-left"
            >
              <span className="font-semibold text-sm text-[#111827] dark:text-[#F9FAFB]">
                {stopName}
              </span>
              <div className="flex items-center gap-3 text-xs">
                {boardingCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[#16A34A] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    {boardingCount} monte{boardingCount > 1 ? 'nt' : ''}
                  </span>
                )}
                {alightingCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[#DC2626] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                    {alightingCount} descend{alightingCount > 1 ? 'ent' : ''}
                  </span>
                )}
              </div>
            </button>

            {/* Passenger lists */}
            <div className="divide-y divide-[#F3F4F6] dark:divide-[#2C2C2E]">
              {/* Boarding */}
              {boardingCount > 0 && (
                <div className="px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#16A34A] mb-2">
                    Montée
                  </p>
                  <ul className="space-y-1">
                    {stopData!.boarding.map((entry) => (
                      <li key={entry.bookingCode} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">
                          {entry.passengerName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#9CA3AF] font-mono">
                            {entry.seatIdentifiers.join(', ')}
                          </span>
                          <span className="text-xs font-mono text-[#6B7280] dark:text-[#9CA3AF]">
                            #{entry.bookingCode}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alighting */}
              {alightingCount > 0 && (
                <div className="px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#DC2626] mb-2">
                    Descente
                  </p>
                  <ul className="space-y-1">
                    {stopData!.alighting.map((entry) => (
                      <li key={entry.bookingCode} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">
                          {entry.passengerName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#9CA3AF] font-mono">
                            {entry.seatIdentifiers.join(', ')}
                          </span>
                          <span className="text-xs font-mono text-[#6B7280] dark:text-[#9CA3AF]">
                            #{entry.bookingCode}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {manifest.every((m) => m.boarding.length === 0 && m.alighting.length === 0) && (
        <div className="text-center py-8 text-[#9CA3AF] dark:text-[#6B7280] text-sm">
          Aucun passager enregistré pour ce trajet.
        </div>
      )}
    </div>
  )
}
