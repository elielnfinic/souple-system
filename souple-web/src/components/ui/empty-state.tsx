import { cn } from '@/lib/utils'
import { Button } from './button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

/**
 * Empty state component. Used when a list/table has no data.
 * Every list view MUST have an empty state.
 *
 * @example
 * <EmptyState
 *   icon={<Bus size={32} />}
 *   title="No vehicles registered"
 *   description="Add your first vehicle to start selling tickets."
 *   action={{ label: 'Add Vehicle', onClick: () => router.push('/fleet/new') }}
 * />
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-[#9CA3AF] dark:text-[#6B7280]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] max-w-sm leading-relaxed mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

/**
 * Search results empty state — specialized for "no results found" scenarios.
 */
export function NoResultsState({
  onClearFilters,
  className,
}: {
  onClearFilters?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      }
      title="No results found"
      description="Try adjusting your filters or search terms."
      action={onClearFilters ? { label: 'Clear Filters', onClick: onClearFilters } : undefined}
      className={className}
    />
  )
}
