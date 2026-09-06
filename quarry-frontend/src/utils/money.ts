export function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
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

export function newId(prefix = 't') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}
