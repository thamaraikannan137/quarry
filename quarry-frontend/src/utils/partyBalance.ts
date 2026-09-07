import type { MarkingBatchSummary } from '@/types/marking'
import type { Party } from '@/types/party'
import type { Transaction } from '@/types/transaction'

import { batchBalance } from '@/utils/markingPayment'

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function isPartyCredit(row: Transaction, partyId: string) {
  return row.partyId === partyId && row.type === 'Credit' && (Number(row.credit) || 0) > 0
}

/** All cash received from this customer, including receipts not yet applied to a marking. */
export function partyReceived(partyId: string, transactions: Transaction[]) {
  return roundMoney(
    transactions.filter((row) => isPartyCredit(row, partyId)).reduce((sum, row) => sum + (Number(row.credit) || 0), 0),
  )
}

/** Invoice value of this party’s marking batches. */
export function partyInvoiced(markings: Array<Pick<MarkingBatchSummary, 'total'>> = []) {
  return roundMoney(markings.reduce((sum, batch) => sum + (Number(batch.total) || 0), 0))
}

/** Unpaid amount on this party’s marking invoices (not below zero per batch). */
export function partyMarkingPending(
  transactions: Transaction[],
  markings: Array<Pick<MarkingBatchSummary, 'batchId' | 'total'>> = [],
) {
  return roundMoney(markings.reduce((sum, batch) => sum + Math.max(0, batchBalance(batch, transactions)), 0))
}

/** Total pending = opening + invoiced − all receipts. Negative = advance / overpayment. */
export function partyBalance(
  party: Pick<Party, 'id' | 'openingBalance'>,
  transactions: Transaction[],
  markings: Array<Pick<MarkingBatchSummary, 'total'>> = [],
) {
  return roundMoney(party.openingBalance + partyInvoiced(markings) - partyReceived(party.id, transactions))
}

/** Cash paid to this vendor (debit) minus refunds (credit). */
export function vendorPaid(partyId: string, transactions: Transaction[]) {
  return transactions
    .filter((row) => row.partyId === partyId)
    .reduce((sum, row) => sum + (Number(row.debit) || 0) - (Number(row.credit) || 0), 0)
}

/** What we still owe this vendor: opening minus net payments. Negative = advance. */
export function vendorBalance(party: Pick<Party, 'id' | 'openingBalance'>, transactions: Transaction[]) {
  return Math.round((party.openingBalance - vendorPaid(party.id, transactions)) * 100) / 100
}
