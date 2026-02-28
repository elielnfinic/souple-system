'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string
  header: React.ReactNode
  /** Custom cell renderer. Receives the full row and the column's value. */
  render?: (row: T, value: unknown) => React.ReactNode
  sortable?: boolean
  headerClassName?: string
  cellClassName?: string
  align?: 'left' | 'center' | 'right'
}

type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: string
  direction: SortDirection
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  /** Key accessor — must be unique per row */
  rowKey: (row: T) => string | number
  searchable?: boolean
  searchPlaceholder?: string
  /** Rows per page (default 20) */
  pageSize?: number
  loading?: boolean
  emptyMessage?: string
  className?: string
  /** Pass to enable server-side sorting */
  onSortChange?: (sort: SortState | null) => void
  /** Pass for server-side pagination */
  totalRows?: number
  page?: number
  onPageChange?: (page: number) => void
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SortIcon({ direction }: { direction?: SortDirection }) {
  if (!direction) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-30 shrink-0" aria-hidden="true">
        <path d="M7 8l5-5 5 5M7 16l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#0A7AFF] shrink-0" aria-hidden="true">
      {direction === 'asc'
        ? <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[#9CA3AF]">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {direction === 'left'
        ? <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  rowKey,
  searchable = false,
  searchPlaceholder = 'Search…',
  pageSize: initialPageSize = 20,
  loading = false,
  emptyMessage = 'No data found.',
  className,
  onSortChange,
  totalRows,
  page: controlledPage,
  onPageChange,
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState('')
  const [sort, setSort] = React.useState<SortState | null>(null)
  const [internalPage, setInternalPage] = React.useState(1)

  const isServerPaginated = controlledPage !== undefined && onPageChange !== undefined
  const page = isServerPaginated ? controlledPage : internalPage
  const setPage = isServerPaginated ? onPageChange : setInternalPage

  // Client-side filtering
  const filtered = React.useMemo(() => {
    if (!searchable || !search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      Object.values(row as Record<string, unknown>).some(
        (v) => typeof v === 'string' && v.toLowerCase().includes(q)
      )
    )
  }, [data, search, searchable])

  // Client-side sorting (skipped when server-side is active)
  const sorted = React.useMemo(() => {
    if (!sort || onSortChange) return filtered
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sort.key]
      const bv = (b as Record<string, unknown>)[sort.key]
      if (av === bv) return 0
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true })
      return sort.direction === 'asc' ? cmp : -cmp
    })
  }, [filtered, sort, onSortChange])

  // Pagination
  const total = totalRows ?? sorted.length
  const pageCount = Math.max(1, Math.ceil(total / initialPageSize))
  const paginated = isServerPaginated
    ? sorted
    : sorted.slice((page - 1) * initialPageSize, page * initialPageSize)

  // Reset to page 1 when search changes
  React.useEffect(() => {
    if (!isServerPaginated) setInternalPage(1)
  }, [search, isServerPaginated])

  function toggleSort(key: string) {
    const next: SortState | null =
      sort?.key === key
        ? sort.direction === 'asc'
          ? { key, direction: 'desc' }
          : null
        : { key, direction: 'asc' }
    setSort(next)
    onSortChange?.(next)
  }

  const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' } as const

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Search */}
      {searchable && (
        <div className="relative w-full max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              'w-full pl-9 pr-4 py-2 text-sm rounded-lg border',
              'border-[#E5E7EB] bg-white text-[#111827] placeholder:text-[#9CA3AF]',
              'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF] focus:border-transparent',
              'dark:bg-[#1F2937] dark:border-[#374151] dark:text-[#F9FAFB]'
            )}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] dark:border-[#374151]">
        <table className="w-full min-w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] dark:bg-[#111827] border-b border-[#E5E7EB] dark:border-[#374151]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 font-semibold text-[#374151] dark:text-[#D1D5DB] whitespace-nowrap',
                    alignClass[col.align ?? 'left'],
                    col.sortable && 'cursor-pointer select-none hover:text-[#0A7AFF] transition-colors duration-100',
                    col.headerClassName
                  )}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  aria-sort={
                    sort?.key === col.key
                      ? sort.direction === 'asc' ? 'ascending' : 'descending'
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <SortIcon direction={sort?.key === col.key ? sort.direction : undefined} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#E5E7EB] dark:border-[#374151] last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-[#E5E7EB] dark:bg-[#374151] rounded-md animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-[#6B7280] dark:text-[#9CA3AF]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-[#E5E7EB] dark:border-[#374151] last:border-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F2937] transition-colors duration-100"
                >
                  {columns.map((col) => {
                    const val = (row as Record<string, unknown>)[col.key]
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-[#111827] dark:text-[#F9FAFB]',
                          alignClass[col.align ?? 'left'],
                          col.cellClassName
                        )}
                      >
                        {col.render ? col.render(row, val) : String(val ?? '—')}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          <span>
            {isServerPaginated
              ? `${total} total`
              : `${Math.min((page - 1) * initialPageSize + 1, total)}–${Math.min(page * initialPageSize, total)} of ${total}`}
          </span>
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <PageButton onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page">
              <ChevronIcon direction="left" />
            </PageButton>

            {getPageNumbers(page, pageCount).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-2 select-none">…</span>
              ) : (
                <PageButton key={p} onClick={() => setPage(p as number)} active={p === page} aria-current={p === page ? 'page' : undefined}>
                  {p}
                </PageButton>
              )
            )}

            <PageButton onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page === pageCount} aria-label="Next page">
              <ChevronIcon direction="right" />
            </PageButton>
          </nav>
        </div>
      )}
    </div>
  )
}

// ─── PageButton ───────────────────────────────────────────────────────────────

function PageButton({
  children,
  onClick,
  disabled,
  active,
  ...rest
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  'aria-label'?: string
  'aria-current'?: 'page' | undefined
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg text-sm font-medium',
        'transition-colors duration-100',
        active
          ? 'bg-[#0A7AFF] text-white'
          : 'text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#374151]',
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

// ─── Page number algorithm ────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}
