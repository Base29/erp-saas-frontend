/**
 * Formats a date string (YYYY-MM-DD or ISO) to a human-readable format.
 * Example: 2026-04-20 -> Apr 20, 2026
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d)
  } catch {
    return date
  }
}

/**
 * Formats an ISO timestamp to a human-readable date and time.
 * Example: 2026-04-20T15:24:02Z -> Apr 20, 2026, 3:24 PM
 */
export function formatDateTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '—'
  try {
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) return timestamp
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(d)
  } catch {
    return timestamp
  }
}

/**
 * Formats a number as currency (PKR).
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const val = typeof amount === 'string' ? parseFloat(amount) : amount
  if (val === null || val === undefined || isNaN(val)) return '—'
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val).replace('PKR', 'PKR ')
}
