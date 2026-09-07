import { api } from '@/api/http'
import type { Quarry } from '@/types/app'

type ApiQuarry = Quarry & { place?: string | null }

export async function listQuarries() {
  const rows = await api<ApiQuarry[]>('/api/quarries')
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    place: row.place ?? '',
  }))
}
