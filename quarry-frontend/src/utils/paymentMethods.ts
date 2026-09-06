const STORAGE_KEY = 'quarry-payment-methods-v1'

export const DEFAULT_PAYMENT_METHODS = ['Cash', 'GPay', 'UPI', 'Bank'] as const

function uniqueSorted(values: string[]) {
  const seen = new Set<string>()
  const next: string[] = []
  for (const raw of values) {
    const name = raw.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    next.push(name)
  }
  return next.sort((a, b) => a.localeCompare(b))
}

export function readCustomPaymentMethods(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? uniqueSorted(parsed) : []
  } catch {
    return []
  }
}

export function saveCustomPaymentMethod(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return trimmed
  const current = readCustomPaymentMethods()
  const existing = current.find((item) => item.toLowerCase() === trimmed.toLowerCase())
  if (existing) return existing
  const defaults = DEFAULT_PAYMENT_METHODS as readonly string[]
  const inDefault = defaults.find((item) => item.toLowerCase() === trimmed.toLowerCase())
  if (inDefault) return inDefault
  localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueSorted([...current, trimmed])))
  return trimmed
}

export function mergePaymentMethods(...lists: Array<string[] | readonly string[]>) {
  return uniqueSorted([...DEFAULT_PAYMENT_METHODS, ...readCustomPaymentMethods(), ...lists.flat()])
}
