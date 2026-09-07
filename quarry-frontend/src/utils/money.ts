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

export function isoDateOnly(value: string | Date | null | undefined) {
  if (!value) return ''
  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim())
    return match ? match[1] : ''
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  return ''
}

export function formatDate(value: string | Date | null | undefined) {
  const iso = isoDateOnly(value)
  if (!iso) return '—'
  const parsed = dayjs(iso)
  return parsed.isValid() ? parsed.format(DATE_DISPLAY) : iso
}

export function monthKey(date: string | Date | null | undefined) {
  return isoDateOnly(date).slice(0, 7)
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
