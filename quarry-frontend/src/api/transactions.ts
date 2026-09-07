import { api } from '@/api/http'
import type { Transaction, TxnType, VoucherDraft } from '@/types/transaction'

function fromApi(row: Transaction & { createdAt?: string }): Transaction {
  return {
    id: row.id,
    quarryId: row.quarryId,
    date: row.date,
    type: row.type,
    head: row.head,
    particulars: row.particulars ?? '',
    debit: Number(row.debit) || 0,
    credit: Number(row.credit) || 0,
    partyId: row.partyId ?? null,
    personId: row.personId ?? null,
    labourId: row.labourId ?? null,
    litres: row.litres ?? null,
    refNote: row.refNote ?? null,
    markingBatchId: row.markingBatchId ?? null,
    paymentMethod: row.paymentMethod ?? null,
    createdAt: row.createdAt ?? '',
  }
}

export async function listTransactions() {
  const rows = await api<Transaction[]>('/api/transactions')
  return rows.map(fromApi)
}

export async function createTransaction(quarryId: string, type: TxnType, draft: VoucherDraft) {
  const row = await api<Transaction>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({
      quarryId,
      date: draft.date,
      type,
      head: draft.head,
      particulars: draft.particulars,
      amount: draft.amount,
      partyId: draft.partyId ?? null,
      personId: draft.personId ?? null,
      labourId: draft.labourId ?? null,
      litres: draft.litres ?? null,
      refNote: draft.refNote ?? null,
      markingBatchId: draft.markingBatchId ?? null,
      paymentMethod: draft.paymentMethod ?? null,
    }),
  })
  return fromApi(row)
}

export async function updateTransactionApi(id: string, type: TxnType, draft: VoucherDraft) {
  const row = await api<Transaction>(`/api/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      date: draft.date,
      type,
      head: draft.head,
      particulars: draft.particulars,
      amount: draft.amount,
      partyId: draft.partyId ?? null,
      personId: draft.personId ?? null,
      labourId: draft.labourId ?? null,
      litres: draft.litres ?? null,
      refNote: draft.refNote ?? null,
      markingBatchId: draft.markingBatchId ?? null,
      paymentMethod: draft.paymentMethod ?? null,
    }),
  })
  return fromApi(row)
}

export async function deleteTransactionApi(id: string) {
  await api<void>(`/api/transactions/${id}`, { method: 'DELETE' })
}
