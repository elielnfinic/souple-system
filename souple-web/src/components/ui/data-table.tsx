'use client'

import * as React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export { createColumnHelper } from '@tanstack/react-table'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  emptyMessage?: string
  pageSize?: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No results found.',
  pageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  const { pageIndex, pageSize: currentPageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const from = totalRows === 0 ? 0 : pageIndex * currentPageSize + 1
  const to = Math.min((pageIndex + 1) * currentPageSize, totalRows)
  const pageCount = table.getPageCount()

  return (
    <div className="flex flex-col gap-3">
      {/* Table */}
      <div className="rounded-lg border border-[#E5E7EB] dark:border-[#374151] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Head */}
            <thead className="bg-[#F9FAFB] dark:bg-[#111827] border-b border-[#E5E7EB] dark:border-[#374151]">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()

                    return (
                      <th
                        key={header.id}
                        className={cn(
                          'px-4 py-3 text-left text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wide whitespace-nowrap',
                          canSort && 'cursor-pointer select-none hover:text-[#111827] dark:hover:text-[#F9FAFB] transition-colors'
                        )}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        colSpan={header.colSpan}
                      >
                        <span className="inline-flex items-center gap-1">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="shrink-0 text-[#D1D5DB] dark:text-[#4B5563]">
                              {sorted === 'asc' ? (
                                <ChevronUp size={14} />
                              ) : sorted === 'desc' ? (
                                <ChevronDown size={14} />
                              ) : (
                                <ChevronsUpDown size={14} />
                              )}
                            </span>
                          )}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#374151] bg-white dark:bg-[#1F2937]">
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={columns.length} />
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-[#9CA3AF] dark:text-[#6B7280]"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-[#F9FAFB] dark:hover:bg-[#111827] transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 text-[#374151] dark:text-[#D1D5DB]"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && totalRows > 0 && (
        <div className="flex items-center justify-between gap-4 px-1">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Showing <span className="font-medium text-[#374151] dark:text-[#D1D5DB]">{from}–{to}</span> of{' '}
            <span className="font-medium text-[#374151] dark:text-[#D1D5DB]">{totalRows}</span> results
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              leadingIcon={<ChevronLeft size={14} />}
            >
              Previous
            </Button>
            <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF] min-w-[4rem] text-center">
              {pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              trailingIcon={<ChevronRight size={14} />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
