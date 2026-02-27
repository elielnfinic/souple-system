import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/**
 * Skeleton loading placeholder.
 * Use to match the shape of the content being loaded — never use a spinner.
 *
 * @example
 * <Skeleton className="h-4 w-48" />         // text line
 * <Skeleton className="h-10 w-full" />       // full-width input
 * <Skeleton className="h-32 w-32 rounded-full" /> // avatar
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[#E5E7EB] dark:bg-[#374151]',
        className
      )}
      aria-hidden="true"
    />
  )
}

/**
 * Pre-built table row skeleton.
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/**
 * Pre-built card skeleton.
 */
export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-[#E5E7EB] dark:border-[#374151] p-4 space-y-3" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  )
}

/**
 * Pre-built stat card skeleton.
 */
export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-[#E5E7EB] dark:border-[#374151] p-4 space-y-2" aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}
