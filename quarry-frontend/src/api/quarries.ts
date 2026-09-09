import { api } from '@/api/http'
import type { Quarry } from '@/types/app'
import { quarryGstPct } from '@/types/marking'

type ApiQuarry = Quarry & { place?: string | null; gstPct?: number | null }

function fromApi(row: ApiQuarry): Quarry {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    place: row.place ?? '',
    gstPct: quarryGstPct(row),
  }
}

export async function listQuarries() {
  const rows = await api<ApiQuarry[]>('/api/quarries')
  return rows.map(fromApi)
}

export async function createQuarry(input: { name: string; code: string; place?: string | null }) {
  const row = await api<ApiQuarry>('/api/quarries', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return fromApi(row)
}

export async function updateQuarry(
  id: string,
  patch: { name?: string; code?: string; place?: string | null; gstPct?: number },
) {
  const row = await api<ApiQuarry>(`/api/quarries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
  return fromApi(row)
}
