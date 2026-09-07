import { api } from '@/api/http'
import type { Party, PartyDraft } from '@/types/party'
import { isoDateOnly } from '@/utils/money'

type ApiParty = Party & { quarryId: string }

function fromApi(row: ApiParty): Party {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    phone: row.phone ?? '',
    email: row.email ?? '',
    gstin: row.gstin?.trim() ? row.gstin : '—',
    gstType: row.gstType,
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
  const gstin = draft.gstin.trim()
  return {
    name: draft.name.trim(),
    type: draft.type,
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    gstin: gstin === '—' ? '' : gstin,
    gstType: draft.gstType,
    state: draft.state,
    billingAddress: draft.billingAddress.trim(),
    shippingAddress: draft.shippingAddress.trim(),
    openingBalance: Number(draft.openingBalance) || 0,
    asOf: draft.asOf,
    creditLimit: Number(draft.creditLimit) || 0,
    contact: draft.contact.trim(),
    notes: draft.notes.trim(),
    quarryId: draft.quarryIds[0],
  }
}

export async function listCustomers() {
  const rows = await api<ApiParty[]>('/api/customers')
  return rows.map(fromApi)
}

export async function createCustomer(draft: PartyDraft) {
  const row = await api<ApiParty>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(toPayload(draft)),
  })
  return fromApi(row)
}

export async function updateCustomer(id: string, draft: PartyDraft) {
  const row = await api<ApiParty>(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toPayload(draft)),
  })
  return fromApi(row)
}

export async function deleteCustomer(id: string) {
  await api<void>(`/api/customers/${id}`, { method: 'DELETE' })
}
