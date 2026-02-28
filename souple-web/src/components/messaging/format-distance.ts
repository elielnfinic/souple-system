/**
 * Lightweight relative time formatter (no dependency on date-fns).
 * Returns strings like "2 min", "3 h", "hier", "lun."
 */
export function formatDistanceToNow(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'maintenant'
  if (diffMin < 60) return `${diffMin} min`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} h`

  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'hier'
  if (diffDay < 7) {
    return new Intl.DateTimeFormat('fr', { weekday: 'short' }).format(new Date(isoString))
  }

  return new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'short' }).format(new Date(isoString))
}
