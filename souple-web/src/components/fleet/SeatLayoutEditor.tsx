'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seatLayoutsApi } from '@/lib/api/vehicles'
import type { SeatDefinition, LayoutData } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/form-field'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'

// ─── Constants ────────────────────────────────────────────────────────────────

const CELL_TYPES = ['seat', 'driver', 'aisle', 'door', 'luggage', 'empty'] as const
type CellType = (typeof CELL_TYPES)[number]

const SEAT_CLASSES = ['economy', 'business', 'vip'] as const
type SeatClass = (typeof SEAT_CLASSES)[number]

const TYPE_COLORS: Record<CellType, { bg: string; border: string; text: string; label: string }> = {
  driver:  { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151', label: 'Driver' },
  seat:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', label: 'Seat' },
  aisle:   { bg: 'transparent', border: '#E5E7EB', text: '#9CA3AF', label: 'Aisle' },
  door:    { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', label: 'Door' },
  luggage: { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E', label: 'Luggage' },
  empty:   { bg: 'transparent', border: 'transparent', text: 'transparent', label: 'Empty' },
}

const CLASS_COLORS: Record<SeatClass, { bg: string; border: string; text: string; label: string }> = {
  economy:  { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', label: 'Economy' },
  business: { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9', label: 'Business' },
  vip:      { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E', label: 'VIP' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSeatId(row: number, col: number): string {
  return `seat-${row}-${col}`
}

function cellKey(row: number, col: number): string {
  return `${row}-${col}`
}

function parseKey(key: string): { row: number; col: number } {
  const [r, c] = key.split('-').map(Number)
  return { row: r, col: c }
}

function buildDefaultGrid(rows: number, cols: number): SeatDefinition[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      id: makeSeatId(r, c),
      row: r,
      col: c,
      type: 'seat' as CellType,
      class: 'economy' as SeatClass,
      bookable: true,
      label: '',
    }))
  )
}

function layoutDataToGrid(layoutData: LayoutData, rows: number, cols: number): SeatDefinition[][] {
  const grid = buildDefaultGrid(rows, cols)
  for (const seat of layoutData.seats) {
    if (seat.row < rows && seat.col < cols) {
      grid[seat.row][seat.col] = { ...seat }
    }
  }
  return grid
}

function gridToLayoutData(grid: SeatDefinition[][]): LayoutData {
  const seats: SeatDefinition[] = []
  for (const row of grid) {
    for (const cell of row) {
      seats.push({ ...cell })
    }
  }
  return { seats }
}

// ─── Cell component ───────────────────────────────────────────────────────────

interface CellProps {
  cell: SeatDefinition
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
}

function Cell({ cell, isSelected, onClick }: CellProps) {
  const colorSet = cell.type === 'seat' && cell.class
    ? CLASS_COLORS[cell.class as SeatClass] ?? TYPE_COLORS[cell.type as CellType]
    : TYPE_COLORS[cell.type as CellType]

  const isEmpty = cell.type === 'empty'
  const isAisle = cell.type === 'aisle'

  return (
    <button
      type="button"
      onClick={(e) => onClick(e)}
      title={cell.label || cell.type}
      aria-label={`${cell.type} at row ${cell.row + 1}, column ${cell.col + 1}${cell.label ? ` — ${cell.label}` : ''}`}
      aria-pressed={isSelected}
      className={cn(
        'w-10 h-10 rounded-md border-2 flex items-center justify-center transition-all duration-100',
        'text-[10px] font-bold leading-none select-none',
        isEmpty || isAisle
          ? 'cursor-pointer hover:border-[#D1D5DB] dark:hover:border-[#4B5563]'
          : 'cursor-pointer hover:opacity-80',
        isSelected && 'ring-2 ring-offset-1 ring-[#0A7AFF]'
      )}
      style={{
        backgroundColor: colorSet.bg,
        borderColor: isSelected ? '#0A7AFF' : colorSet.border,
        color: colorSet.text,
      }}
    >
      {cell.type === 'driver' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      )}
      {cell.type === 'door' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="2" width="18" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
          <circle cx="17" cy="12" r="1.5" fill="currentColor" />
        </svg>
      )}
      {cell.type === 'luggage' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="7" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M8 7V5a2 2 0 014 0v2" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
      {cell.type === 'seat' && cell.label && (
        <span>{cell.label}</span>
      )}
    </button>
  )
}

// ─── Cell editor panel ────────────────────────────────────────────────────────

interface CellEditorProps {
  cell: SeatDefinition
  onChange: (updated: Partial<SeatDefinition>) => void
  onClose: () => void
}

function CellEditor({ cell, onChange, onClose }: CellEditorProps) {
  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-lg p-4 w-56 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] uppercase tracking-wide">
          Cell ({cell.row + 1}, {cell.col + 1})
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] transition-colors"
          aria-label="Close editor"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Type selector */}
      <div>
        <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1.5 block">Type</label>
        <div className="grid grid-cols-3 gap-1">
          {CELL_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ type: t, bookable: t === 'seat', class: t === 'seat' ? (cell.class ?? 'economy') : null })}
              className={cn(
                'text-[10px] font-semibold px-1.5 py-1.5 rounded-md capitalize transition-colors',
                cell.type === t
                  ? 'bg-[#0A7AFF] text-white'
                  : 'bg-[#F3F4F6] dark:bg-[#2C2C2E] text-[#374151] dark:text-[#D1D5DB] hover:bg-[#E5E7EB] dark:hover:bg-[#374151]'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Class selector (only for seat type) */}
      {cell.type === 'seat' && (
        <div>
          <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1.5 block">Class</label>
          <div className="flex gap-1">
            {SEAT_CLASSES.map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => onChange({ class: sc })}
                className={cn(
                  'flex-1 text-[10px] font-semibold px-1.5 py-1.5 rounded-md capitalize transition-colors',
                  cell.class === sc
                    ? 'bg-[#0A7AFF] text-white'
                    : 'bg-[#F3F4F6] dark:bg-[#2C2C2E] text-[#374151] dark:text-[#D1D5DB] hover:bg-[#E5E7EB] dark:hover:bg-[#374151]'
                )}
              >
                {sc}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Label (only for seat type) */}
      {cell.type === 'seat' && (
        <div>
          <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1.5 block">
            Label (optional)
          </label>
          <input
            type="text"
            value={cell.label ?? ''}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="e.g. A1"
            maxLength={4}
            className={cn(
              'w-full h-8 px-2 text-sm rounded-md border',
              'border-[#D1D5DB] dark:border-[#4B5563]',
              'bg-white dark:bg-[#111827] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF]',
              'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]'
            )}
          />
        </div>
      )}

      {/* Bookable checkbox (only for seat) */}
      {cell.type === 'seat' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <div className={cn(
            'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
            cell.bookable
              ? 'bg-[#0A7AFF] border-[#0A7AFF]'
              : 'bg-white dark:bg-[#111827] border-[#D1D5DB] dark:border-[#4B5563]'
          )}>
            {cell.bookable && (
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <input
              type="checkbox"
              checked={cell.bookable}
              onChange={(e) => onChange({ bookable: e.target.checked })}
              className="sr-only"
            />
          </div>
          <span className="text-xs text-[#374151] dark:text-[#D1D5DB]">Bookable</span>
        </label>
      )}
    </div>
  )
}

// ─── Multi-cell editor panel ──────────────────────────────────────────────────

interface MultiCellEditorProps {
  count: number
  onApply: (updates: Partial<SeatDefinition>) => void
  onClose: () => void
}

function MultiCellEditor({ count, onApply, onClose }: MultiCellEditorProps) {
  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-lg p-4 w-56 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] uppercase tracking-wide">
          {count} cells selected
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] transition-colors"
          aria-label="Clear selection"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p className="text-[10px] text-[#9CA3AF] dark:text-[#6B7280]">
        Ctrl+click to add/remove cells
      </p>

      {/* Type */}
      <div>
        <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1.5 block">
          Apply type to all
        </label>
        <div className="grid grid-cols-3 gap-1">
          {CELL_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onApply({
                type: t,
                bookable: t === 'seat',
                class: t === 'seat' ? 'economy' : null,
              })}
              className="text-[10px] font-semibold px-1.5 py-1.5 rounded-md capitalize transition-colors bg-[#F3F4F6] dark:bg-[#2C2C2E] text-[#374151] dark:text-[#D1D5DB] hover:bg-[#0A7AFF] hover:text-white"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Class */}
      <div>
        <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1.5 block">
          Apply class <span className="text-[9px] normal-case text-[#9CA3AF]">(sets type to seat)</span>
        </label>
        <div className="flex gap-1">
          {SEAT_CLASSES.map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => onApply({ type: 'seat', class: sc, bookable: true })}
              className="flex-1 text-[10px] font-semibold px-1.5 py-1.5 rounded-md capitalize transition-colors bg-[#F3F4F6] dark:bg-[#2C2C2E] text-[#374151] dark:text-[#D1D5DB] hover:bg-[#0A7AFF] hover:text-white"
            >
              {sc}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SeatLayoutEditorProps {
  vehicleId: number
  layoutId?: number
  onSave?: () => void
}

export function SeatLayoutEditor({ vehicleId, layoutId, onSave }: SeatLayoutEditorProps) {
  const queryClient = useQueryClient()
  const isEdit = layoutId !== undefined

  // Layout metadata
  const [layoutName, setLayoutName] = useState('Default layout')
  const [rows, setRows] = useState(4)
  const [cols, setCols] = useState(5)
  const [isDefault, setIsDefault] = useState(false)

  // Grid state
  const [grid, setGrid] = useState<SeatDefinition[][]>(() => buildDefaultGrid(4, 5))
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())

  // Error
  const [error, setError] = useState<string | null>(null)

  // ── Load existing layout if editing ─────────────────────────────────────────
  const { data: existingLayout } = useQuery({
    queryKey: ['seat-layout', vehicleId, layoutId],
    queryFn: async () => {
      const res = await seatLayoutsApi.list(vehicleId)
      return res.data.find((l) => l.id === layoutId) ?? null
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingLayout) {
      setLayoutName(existingLayout.name)
      setRows(existingLayout.rows)
      setCols(existingLayout.columns)
      setIsDefault(existingLayout.isDefault)
      setGrid(layoutDataToGrid(existingLayout.layoutData, existingLayout.rows, existingLayout.columns))
    }
  }, [existingLayout])

  // ── Resize grid when rows/cols change ────────────────────────────────────────
  const handleRowsChange = useCallback((newRows: number) => {
    const r = Math.max(1, Math.min(20, newRows))
    setRows(r)
    setGrid((prev) => {
      const next = buildDefaultGrid(r, cols)
      for (let i = 0; i < Math.min(prev.length, r); i++) {
        for (let j = 0; j < cols; j++) {
          next[i][j] = prev[i]?.[j] ?? next[i][j]
        }
      }
      return next
    })
    setSelectedCells(new Set())
  }, [cols])

  const handleColsChange = useCallback((newCols: number) => {
    const c = Math.max(1, Math.min(20, newCols))
    setCols(c)
    setGrid((prev) => {
      const next = buildDefaultGrid(rows, c)
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < Math.min(prev[i]?.length ?? 0, c); j++) {
          next[i][j] = prev[i]?.[j] ?? next[i][j]
        }
      }
      return next
    })
    setSelectedCells(new Set())
  }, [rows])

  // ── Cell update ──────────────────────────────────────────────────────────────
  function updateCell(row: number, col: number, updates: Partial<SeatDefinition>) {
    setGrid((prev) => {
      const next = prev.map((r) => [...r])
      next[row][col] = { ...next[row][col], ...updates }
      return next
    })
  }

  // ── Save mutation ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      const layoutData = gridToLayoutData(grid)
      const payload = {
        name: layoutName.trim() || 'Default layout',
        rows,
        columns: cols,
        layoutData,
        isDefault,
      }
      if (isEdit && layoutId !== undefined) {
        return seatLayoutsApi.update(vehicleId, layoutId, payload)
      }
      return seatLayoutsApi.create(vehicleId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seat-layouts', vehicleId] })
      queryClient.invalidateQueries({ queryKey: ['seat-layout', vehicleId, layoutId] })
      setError(null)
      onSave?.()
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to save layout. Please try again.')
      }
    },
  })

  const singleSelectedKey = selectedCells.size === 1 ? [...selectedCells][0] : null
  const singleSelectedPos = singleSelectedKey ? parseKey(singleSelectedKey) : null
  const selectedCellData = singleSelectedPos
    ? grid[singleSelectedPos.row]?.[singleSelectedPos.col] ?? null
    : null

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Layout name */}
          <div className="flex flex-col gap-1 min-w-[200px] flex-1">
            <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
              Layout name
            </label>
            <TextInput
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="e.g. Standard 18 seats"
            />
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-1 w-20">
            <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">Rows</label>
            <TextInput
              type="number"
              value={rows}
              onChange={(e) => handleRowsChange(Number(e.target.value))}
              min={1}
              max={20}
            />
          </div>

          {/* Columns */}
          <div className="flex flex-col gap-1 w-20">
            <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">Cols</label>
            <TextInput
              type="number"
              value={cols}
              onChange={(e) => handleColsChange(Number(e.target.value))}
              min={1}
              max={20}
            />
          </div>

          {/* Default checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pb-1">
            <div className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              isDefault
                ? 'bg-[#0A7AFF] border-[#0A7AFF]'
                : 'bg-white dark:bg-[#111827] border-[#D1D5DB] dark:border-[#4B5563]'
            )}>
              {isDefault && (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="sr-only"
              />
            </div>
            <span className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">Default</span>
          </label>

          {/* Save */}
          <Button
            variant="primary"
            size="md"
            loading={saveMutation.isPending}
            onClick={() => {
              setError(null)
              saveMutation.mutate()
            }}
          >
            {isEdit ? 'Save changes' : 'Save layout'}
          </Button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-[#DC2626] dark:text-[#FCA5A5]">{error}</p>
        )}
        {saveMutation.isSuccess && !error && (
          <p className="mt-3 text-sm text-[#16A34A] dark:text-[#4ADE80]">Layout saved successfully.</p>
        )}
      </div>

      {/* ── Grid + editor ────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Grid */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 overflow-x-auto">
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            role="grid"
            aria-label="Seat layout grid"
          >
            {grid.map((rowCells, ri) =>
              rowCells.map((cell, ci) => (
                <Cell
                  key={`${ri}-${ci}`}
                  cell={cell}
                  isSelected={selectedCells.has(cellKey(ri, ci))}
                  onClick={(e) => {
                    const key = cellKey(ri, ci)
                    if (e.ctrlKey || e.metaKey) {
                      setSelectedCells((prev) => {
                        const next = new Set(prev)
                        if (next.has(key)) next.delete(key)
                        else next.add(key)
                        return next
                      })
                    } else {
                      setSelectedCells((prev) =>
                        prev.size === 1 && prev.has(key) ? new Set() : new Set([key])
                      )
                    }
                  }}
                />
              ))
            )}
          </div>

          {/* Row/col labels */}
          <div className="mt-3 flex items-center gap-2 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
            <span>{rows} rows × {cols} columns</span>
            <span>·</span>
            <span>
              {grid.flat().filter((c) => c.type === 'seat' && c.bookable).length} bookable seats
            </span>
          </div>
        </div>

        {/* Single-cell editor */}
        {selectedCells.size === 1 && singleSelectedPos && selectedCellData && (
          <CellEditor
            cell={selectedCellData}
            onChange={(updates) => updateCell(singleSelectedPos.row, singleSelectedPos.col, updates)}
            onClose={() => setSelectedCells(new Set())}
          />
        )}

        {/* Multi-cell editor */}
        {selectedCells.size > 1 && (
          <MultiCellEditor
            count={selectedCells.size}
            onApply={(updates) => {
              setGrid((prev) => {
                const next = prev.map((r) => [...r])
                for (const key of selectedCells) {
                  const { row: r, col: c } = parseKey(key)
                  if (next[r]?.[c]) next[r][c] = { ...next[r][c], ...updates }
                }
                return next
              })
            }}
            onClose={() => setSelectedCells(new Set())}
          />
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
        <p className="text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] mb-3 uppercase tracking-wide">
          Legend
        </p>
        <div className="flex flex-wrap gap-3">
          {/* Seat classes */}
          {SEAT_CLASSES.map((sc) => (
            <div key={sc} className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded border-2"
                style={{
                  backgroundColor: CLASS_COLORS[sc].bg,
                  borderColor: CLASS_COLORS[sc].border,
                }}
                aria-hidden="true"
              />
              <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF] capitalize">{sc}</span>
            </div>
          ))}
          {/* Other types */}
          {(['driver', 'aisle', 'door', 'luggage'] as const).map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded border-2"
                style={{
                  backgroundColor: TYPE_COLORS[t].bg || '#F9FAFB',
                  borderColor: TYPE_COLORS[t].border,
                }}
                aria-hidden="true"
              />
              <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF] capitalize">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
