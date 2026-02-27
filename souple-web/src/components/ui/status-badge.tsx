import { cn } from '@/lib/utils'
import { statusColors } from '@/lib/design-tokens'
import { useTheme } from '@/providers/theme-provider'

type StatusKey = keyof typeof statusColors.light

const STATUS_LABELS: Record<string, string> = {
  // Trip
  scheduled:  'Scheduled',
  boarding:   'Boarding',
  departed:   'Departed',
  arrived:    'Arrived',
  completed:  'Completed',
  cancelled:  'Cancelled',
  // Booking
  pending:    'Pending',
  confirmed:  'Confirmed',
  checked_in: 'Checked In',
  refunded:   'Refunded',
  // Payment
  processing: 'Processing',
  failed:     'Failed',
  // Vehicle
  active:     'Active',
  inactive:   'Inactive',
  maintenance:'Maintenance',
  pending_verification: 'Pending Review',
  // Driver
  available:  'Available',
  on_trip:    'On Trip',
  offline:    'Offline',
}

interface StatusBadgeProps {
  status: string
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const { resolvedTheme } = useTheme()
  const palette = resolvedTheme === 'dark' ? statusColors.dark : statusColors.light

  const colors = palette[status as StatusKey] ?? {
    bg: resolvedTheme === 'dark' ? '#1F2937' : '#F9FAFB',
    text: resolvedTheme === 'dark' ? '#9CA3AF' : '#4B5563',
    dot: resolvedTheme === 'dark' ? '#6B7280' : '#9CA3AF',
  }

  const displayLabel = label ?? STATUS_LABELS[status] ?? status

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        className
      )}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: colors.dot }}
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  )
}
