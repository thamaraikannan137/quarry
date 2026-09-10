import { api } from '@/api/http'
import type {
  Ledger,
  LedgerCloseDraft,
  LedgerDraft,
  LedgerReturnDraft,
  LedgerTransferDraft,
} from '@/types/ledger'
import { isoDateOnly } from '@/utils/money'

type ApiLedger = Ledger

function fromLedger(row: ApiLedger): Ledger {
  return {
    id: row.id,
    quarryId: row.quarryId,
    holderName: row.holderName ?? '',
    personId: row.personId ?? null,
    date: isoDateOnly(row.date),
    amount: Number(row.amount) || 0,
    notes: row.notes ?? '',
    status: row.status === 'closed' ? 'closed' : 'open',
    returnedAmount: Number(row.returnedAmount) || 0,
    closedDate: row.closedDate ? isoDateOnly(row.closedDate) : null,
    spent: Number(row.spent) || 0,
    balance: Number(row.balance) || 0,
  }
}

function toPayload(draft: LedgerDraft) {
  return {
    quarryId: draft.quarryId,
    holderName: draft.holderName.trim(),
    personId: draft.personId ?? null,
    date: draft.date,
    amount: Number(draft.amount) || 0,
    notes: draft.notes.trim(),
    status: draft.status,
    closedDate: draft.closedDate === undefined ? undefined : draft.closedDate,
  }
}

export async function listLedgers(params?: { quarryId?: string; status?: string }) {
  const query = new URLSearchParams()
  if (params?.quarryId) query.set('quarryId', params.quarryId)
  if (params?.status) query.set('status', params.status)
  const suffix = query.toString() ? `?${query}` : ''
  const rows = await api<ApiLedger[]>(`/api/ledgers${suffix}`)
  return rows.map(fromLedger)
}

export async function getLedger(id: string) {
  const row = await api<ApiLedger>(`/api/ledgers/${id}`)
  return fromLedger(row)
}

export async function createLedger(draft: LedgerDraft) {
  const row = await api<ApiLedger>('/api/ledgers', {
    method: 'POST',
    body: JSON.stringify(toPayload(draft)),
  })
  return fromLedger(row)
}

export async function updateLedger(id: string, draft: LedgerDraft) {
  const row = await api<ApiLedger>(`/api/ledgers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toPayload(draft)),
  })
  return fromLedger(row)
}

export async function returnLedger(id: string, draft: LedgerReturnDraft) {
  const row = await api<ApiLedger>(`/api/ledgers/${id}/return`, {
    method: 'POST',
    body: JSON.stringify({
      amount: draft.amount,
      date: draft.date,
      close: draft.close,
    }),
  })
  return fromLedger(row)
}

export async function closeLedger(id: string, draft: LedgerCloseDraft = {}) {
  const row = await api<ApiLedger>(`/api/ledgers/${id}/close`, {
    method: 'POST',
    body: JSON.stringify({
      returnedAmount: draft.returnedAmount,
      date: draft.date,
    }),
  })
  return fromLedger(row)
}

export async function transferLedger(id: string, draft: LedgerTransferDraft) {
  const row = await api<{
    from: ApiLedger
    to: ApiLedger
    createdNew: boolean
  }>(`/api/ledgers/${id}/transfer`, {
    method: 'POST',
    body: JSON.stringify({
      amount: draft.amount,
      date: draft.date,
      notes: draft.notes,
      close: draft.close,
      toLedgerId: draft.toLedgerId,
      toHolderName: draft.toHolderName,
      toPersonId: draft.toPersonId ?? null,
    }),
  })
  return {
    from: fromLedger(row.from),
    to: fromLedger(row.to),
    createdNew: row.createdNew,
  }
}

export async function deleteLedger(id: string) {
  await api<void>(`/api/ledgers/${id}`, { method: 'DELETE' })
}
