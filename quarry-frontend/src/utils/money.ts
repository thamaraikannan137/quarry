import dayjs from 'dayjs'

export function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Display dates as day-month-year, e.g. 10 Aug 2026. Storage stays YYYY-MM-DD. */
export const DATE_DISPLAY = 'DD MMM YYYY'

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format(DATE_DISPLAY) : value
}

export function monthKey(date: string) {
  return date.slice(0, 7)
}

export function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}

export function todayISO() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Sort by voucher date, then by saved time (same-day entries). */
export function compareByDateThenTime(
  a: { date: string; createdAt?: string | null },
  b: { date: string; createdAt?: string | null },
) {
  const byDate = a.date.localeCompare(b.date)
  if (byDate !== 0) return byDate
  return (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
}

export function newId(prefix = 't') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}
