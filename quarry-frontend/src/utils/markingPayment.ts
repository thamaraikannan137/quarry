import type { LoadStatus, MarkingBatchSummary } from '@/types/marking'
import type { Transaction } from '@/types/transaction'

export type PaymentStatusKey = 'unpaid' | 'partial' | 'paid'

export type PaymentStatus = {
  key: PaymentStatusKey
  label: 'Unpaid' | 'Partial' | 'Paid'
}

/** Cash Received credits linked to a marking invoice (batch). */
export function paymentsForBatch(transactions: Transaction[], batchId: string) {
  return transactions
    .filter(
      (row) =>
        row.type === 'Credit' &&
        row.head === 'Cash Received' &&
        row.markingBatchId === batchId &&
        (Number(row.credit) || 0) > 0,
    )
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function batchReceived(transactions: Transaction[], batchId: string) {
  return paymentsForBatch(transactions, batchId).reduce((sum, row) => sum + (Number(row.credit) || 0), 0)
}

export function batchBalance(batch: Pick<MarkingBatchSummary, 'batchId' | 'total'>, transactions: Transaction[]) {
  return Math.round((batch.total - batchReceived(transactions, batch.batchId)) * 100) / 100
}

export function batchPayStatus(
  batch: Pick<MarkingBatchSummary, 'batchId' | 'total'>,
  transactions: Transaction[],
): PaymentStatus {
  const recv = batchReceived(transactions, batch.batchId)
  if (recv <= 0.5) return { key: 'unpaid', label: 'Unpaid' }
  if (recv + 0.5 >= batch.total) return { key: 'paid', label: 'Paid' }
  return { key: 'partial', label: 'Partial' }
}

export function derivedLoadStatus(blockId: string, dispatchedIds: Set<string>): LoadStatus {
  return dispatchedIds.has(blockId) ? 'OK' : 'Pending'
}

export function summarizeLoadCounts(blockIds: string[], dispatchedIds: Set<string>) {
  let loadOk = 0
  let loadPending = 0
  for (const id of blockIds) {
    if (dispatchedIds.has(id)) loadOk += 1
    else loadPending += 1
  }
  return { loadOk, loadPending }
}
