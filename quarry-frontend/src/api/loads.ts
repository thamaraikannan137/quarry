import { api } from '@/api/http'
import type { DispatchTrip, DispatchTripDraft } from '@/types/dispatch'

type ApiTrip = DispatchTrip

function fromApi(row: ApiTrip): DispatchTrip {
  return {
    id: row.id,
    loadNo: row.loadNo,
    quarryId: row.quarryId,
    date: row.date,
    lorryNo: row.lorryNo,
    fromLocation: row.fromLocation,
    toLocation: row.toLocation,
    blockIds: row.blockIds ?? [],
    notes: row.notes || undefined,
  }
}

export async function listLoads() {
  const rows = await api<ApiTrip[]>('/api/loads')
  return rows.map(fromApi)
}

export async function createLoad(quarryId: string, draft: DispatchTripDraft) {
  const row = await api<ApiTrip>('/api/loads', {
    method: 'POST',
    body: JSON.stringify({
      quarryId,
      date: draft.date,
      lorryNo: draft.lorryNo.trim(),
      fromLocation: draft.fromLocation.trim(),
      toLocation: draft.toLocation.trim(),
      blockIds: [...new Set(draft.blockIds)],
      notes: draft.notes?.trim() || null,
    }),
  })
  return fromApi(row)
}

export async function updateLoad(id: string, quarryId: string, draft: DispatchTripDraft) {
  const row = await api<ApiTrip>(`/api/loads/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      quarryId,
      date: draft.date,
      lorryNo: draft.lorryNo.trim(),
      fromLocation: draft.fromLocation.trim(),
      toLocation: draft.toLocation.trim(),
      blockIds: [...new Set(draft.blockIds)],
      notes: draft.notes?.trim() || null,
    }),
  })
  return fromApi(row)
}

export async function deleteLoad(id: string) {
  await api<void>(`/api/loads/${id}`, { method: 'DELETE' })
}
