'use client'

import { cn } from '@/lib/utils'
import type { LayoutData, SeatDefinition } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

type SeatAvailability = 'available' | 'booked' | 'locked'

const CLASS_COLORS = {
  economy:  { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8' },
  business: { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9' },
  vip:      { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E' },
} as const

const CLASS_LABELS = {
  economy:  'Economy',
  business: 'Business',
  vip:      'VIP',
} as const

// ─── Props ────────────────────────────────────────────────────────────────────

interface SeatSelector2DProps {
  layoutData: LayoutData
  availability?: Record<string, SeatAvailability>
  selectedSeats?: string[]
  onSeatSelect?: (seatId: string) => void
  readOnly?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByRow(seats: SeatDefinition[]): Map<number, SeatDefinition[]> {
  const map = new Map<number, SeatDefinition[]>()
  for (const seat of seats) {
    if (!map.has(seat.row)) map.set(seat.row, [])
    map.get(seat.row)!.push(seat)
  }
  for (const [, rowSeats] of map) {
    rowSeats.sort((a, b) => a.col - b.col)
  }
  return map
}

function getMaxCol(seats: SeatDefinition[]): number {
  return Math.max(0, ...seats.map((s) => s.col))
}

// ─── Seat cell ────────────────────────────────────────────────────────────────

interface SeatCellProps {
  seat: SeatDefinition
  status: SeatAvailability
  isSelected: boolean
  readOnly: boolean
  onSelect?: () => void
}

function SeatCell({ seat, status, isSelected, readOnly, onSelect }: SeatCellProps) {
  // Non-interactive cells
  if (seat.type === 'empty') {
    return <div className="w-10 h-10" aria-hidden="true" />
  }

  if (seat.type === 'aisle') {
    return <div className="w-10 h-10" aria-hidden="true" />
  }

  if (seat.type === 'driver') {
    return (
      <div
        className="w-10 h-10 rounded-md border-2 border-[#D1D5DB] dark:border-[#4B5563] bg-[#F3F4F6] dark:bg-[#1F2937] flex items-center justify-center"
        aria-label="Driver seat"
        title="Driver"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="#9CA3AF" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" fill="#9CA3AF" />
        </svg>
      </div>
    )
  }

  if (seat.type === 'door') {
    return (
      <div
        className="w-10 h-10 rounded-md border-2 border-[#FED7AA] bg-[#FFF7ED] flex items-center justify-center"
        aria-label="Door"
        title="Door"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="2" width="18" height="20" rx="2" stroke="#C2410C" strokeWidth="2" />
          <circle cx="17" cy="12" r="1.5" fill="#C2410C" />
        </svg>
      </div>
    )
  }

  if (seat.type === 'luggage') {
    return (
      <div
        className="w-10 h-10 rounded-md border-2 border-[#FDE68A] bg-[#FEF3C7] flex items-center justify-center"
        aria-label="Luggage compartment"
        title="Luggage"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="7" width="18" height="14" rx="2" stroke="#92400E" strokeWidth="2" />
          <path d="M8 7V5a2 2 0 014 0v2" stroke="#92400E" strokeWidth="2" />
        </svg>
      </div>
    )
  }

  // Bookable seat
  if (!seat.bookable) {
    return (
      <div
        className="w-10 h-10 rounded-md border-2 border-[#E5E7EB] dark:border-[#374151] bg-[#F9FAFB] dark:bg-[#1F2937] flex items-center justify-center"
        aria-label={`${seat.label || seat.id} — not bookable`}
        title="Not bookable"
      >
        <span className="text-[10px] font-bold text-[#D1D5DB] dark:text-[#4B5563]">
          {seat.label}
        </span>
      </div>
    )
  }

  const seatClass = seat.class ?? 'economy'
  const colors = CLASS_COLORS[seatClass as keyof typeof CLASS_COLORS] ?? CLASS_COLORS.economy

  // Status-driven styles
  let bgColor = colors.bg
  let borderColor = colors.border
  let textColor = colors.text
  let cursor = readOnly ? 'cursor-default' : 'cursor-pointer'

  if (status === 'booked') {
    bgColor = '#F3F4F6'
    borderColor = '#D1D5DB'
    textColor = '#9CA3AF'
    cursor = 'cursor-not-allowed'
  } else if (status === 'locked') {
    bgColor = '#FEF3C7'
    borderColor = '#FDE68A'
    textColor = '#92400E'
    cursor = 'cursor-not-allowed'
  }

  const isClickable = !readOnly && status === 'available'
  const label = seat.label || seat.id

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={isClickable ? onSelect : undefined}
      title={`${label}${seatClass ? ` — ${CLASS_LABELS[seatClass as keyof typeof CLASS_LABELS] ?? seatClass}` : ''}${seat.price_multiplier && seat.price_multiplier !== 1 ? ` (×${seat.price_multiplier})` : ''}${status !== 'available' ? ` — ${status}` : ''}`}
      aria-label={`Seat ${label}${status !== 'available' ? `, ${status}` : ''}`}
      aria-pressed={isSelected}
      aria-disabled={!isClickable}
      className={cn(
        'w-10 h-10 rounded-md border-2 flex items-center justify-center transition-all duration-100',
        'text-[10px] font-bold leading-none',
        cursor,
        isSelected && 'ring-2 ring-offset-1 ring-[#0A7AFF]',
        !isClickable && 'opacity-60',
        isClickable && 'hover:scale-105 hover:shadow-sm active:scale-95'
      )}
      style={{
        backgroundColor: bgColor,
        borderColor: isSelected ? '#0A7AFF' : borderColor,
        color: textColor,
      }}
    >
      {label}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SeatSelector2D({
  layoutData,
  availability = {},
  selectedSeats = [],
  onSeatSelect,
  readOnly = false,
}: SeatSelector2DProps) {
  const seats = layoutData.seats
  const rowMap = groupByRow(seats)
  const maxCol = getMaxCol(seats)
  const sortedRows = Array.from(rowMap.keys()).sort((a, b) => a - b)

  // Classes present in this layout (for legend)
  const presentClasses = Array.from(
    new Set(seats.filter((s) => s.type === 'seat' && s.class).map((s) => s.class!))
  )

  return (
    <div className="space-y-4">
      {/* Grid */}
      <div className="overflow-x-auto" role="group" aria-label="Seat map">
        <div className="inline-block min-w-max space-y-1.5">
          {sortedRows.map((rowIdx) => {
            const rowSeats = rowMap.get(rowIdx) ?? []
            // Fill missing columns with empty placeholders
            const cells: (SeatDefinition | null)[] = Array.from({ length: maxCol + 1 }, (_, ci) => {
              return rowSeats.find((s) => s.col === ci) ?? null
            })

            return (
              <div key={rowIdx} className="flex items-center gap-1.5">
                <span className="w-5 text-xs text-[#9CA3AF] dark:text-[#6B7280] text-right shrink-0 select-none">
                  {rowIdx + 1}
                </span>
                <div className="flex gap-1.5">
                  {cells.map((seat, ci) => {
                    if (!seat) {
                      return <div key={ci} className="w-10 h-10" aria-hidden="true" />
                    }
                    const status: SeatAvailability = availability[seat.id] ?? 'available'
                    const isSelected = selectedSeats.includes(seat.id)

                    return (
                      <SeatCell
                        key={seat.id}
                        seat={seat}
                        status={status}
                        isSelected={isSelected}
                        readOnly={readOnly}
                        onSelect={() => onSeatSelect?.(seat.id)}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Class colors */}
          {presentClasses.map((sc) => {
            const colors = CLASS_COLORS[sc as keyof typeof CLASS_COLORS]
            if (!colors) return null
            return (
              <div key={sc} className="flex items-center gap-1.5">
                <div
                  className="w-4 h-4 rounded border-2"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                  aria-hidden="true"
                />
                <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF] capitalize">
                  {CLASS_LABELS[sc as keyof typeof CLASS_LABELS] ?? sc}
                </span>
              </div>
            )
          })}

          {/* Status indicators */}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-[#D1D5DB] bg-[#F3F4F6]" aria-hidden="true" />
            <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-[#FDE68A] bg-[#FEF3C7]" aria-hidden="true" />
            <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Reserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded border-2 border-[#0A7AFF]"
              style={{ backgroundColor: '#EFF6FF' }}
              aria-hidden="true"
            />
            <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Selected</span>
          </div>
        </div>
      )}

      {/* Selected count */}
      {!readOnly && selectedSeats.length > 0 && (
        <p className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
          {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}
