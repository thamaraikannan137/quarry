import { BLOCK_CHOICES } from '@/types/marking'

const STORAGE_KEY = 'quarry-block-choices-v1'

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
  return next.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

export function readCustomBlockChoices(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? uniqueSorted(parsed) : []
  } catch {
    return []
  }
}

export function saveCustomBlockChoice(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return trimmed
  const current = readCustomBlockChoices()
  const existing = current.find((item) => item.toLowerCase() === trimmed.toLowerCase())
  if (existing) return existing
  const next = uniqueSorted([...current, trimmed])
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return trimmed
}

export function mergeBlockChoices(...lists: Array<string[] | readonly string[]>) {
  return uniqueSorted([...BLOCK_CHOICES, ...readCustomBlockChoices(), ...lists.flat()])
}
