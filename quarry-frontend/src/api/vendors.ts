import { api } from '@/api/http'
import type { Party, PartyDraft } from '@/types/party'
import { isoDateOnly } from '@/utils/money'

type ApiVendor = Party & { quarryId: string }

function fromApi(row: ApiVendor): Party {
  return {
    id: row.id,
    name: row.name,
    type: 'Vendor',
    phone: row.phone ?? '',
    email: row.email ?? '',
    gstin: row.gstin?.trim() ? row.gstin : '—',
    gstType: row.gstType ?? 'Unregistered/Consumer',
    state: row.state ?? '',
    billingAddress: row.billingAddress ?? '',
    shippingAddress: row.shippingAddress ?? '',
    openingBalance: Number(row.openingBalance) || 0,
    asOf: isoDateOnly(row.asOf),
    creditLimit: Number(row.creditLimit) || 0,
    contact: row.contact ?? '',
    notes: row.notes ?? '',
    quarryIds: row.quarryIds?.length ? row.quarryIds : [row.quarryId],
  }
}

function toPayload(draft: PartyDraft) {
  return {
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    billingAddress: draft.billingAddress.trim(),
    openingBalance: Number(draft.openingBalance) || 0,
    notes: draft.notes.trim(),
    quarryId: draft.quarryIds[0],
  }
}

export async function listVendors() {
  const rows = await api<ApiVendor[]>('/api/vendors')
  return rows.map(fromApi)
}

export async function createVendor(draft: PartyDraft) {
  const row = await api<ApiVendor>('/api/vendors', {
    method: 'POST',
    body: JSON.stringify(toPayload(draft)),
  })
  return fromApi(row)
}

export async function updateVendor(id: string, draft: PartyDraft) {
  const row = await api<ApiVendor>(`/api/vendors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toPayload(draft)),
  })
  return fromApi(row)
}

export async function deleteVendor(id: string) {
  await api<void>(`/api/vendors/${id}`, { method: 'DELETE' })
}
