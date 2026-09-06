import type { MarkingBatchSummary } from '@/types/marking'
import type { Party } from '@/types/party'
import type { Transaction } from '@/types/transaction'

import { batchBalance } from '@/utils/markingPayment'

/** Unpaid amount on this party’s marking invoices. */
export function partyMarkingPending(
  transactions: Transaction[],
  markings: Array<Pick<MarkingBatchSummary, 'batchId' | 'total'>> = [],
) {
  return markings.reduce((sum, batch) => sum + Math.max(0, batchBalance(batch, transactions)), 0)
}

/** Total pending = opening balance + marking pending. */
export function partyBalance(
  party: Pick<Party, 'openingBalance'>,
  transactions: Transaction[],
  markings: Array<Pick<MarkingBatchSummary, 'batchId' | 'total'>> = [],
) {
  return Math.round((party.openingBalance + partyMarkingPending(transactions, markings)) * 100) / 100
}
