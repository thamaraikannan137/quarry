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

/**
 * What we still owe this vendor.
 * Expense vouchers (diesel, purchase) are cash bills already paid, so they increase
 * “Paid” and do not create pending. Pending is only unpaid opening balance.
 */
export function vendorBalance(party: Pick<Party, 'id' | 'openingBalance'>, transactions: Transaction[]) {
  const unpaid = (Number(party.openingBalance) || 0) - vendorPaid(party.id, transactions)
  return Math.round(Math.max(0, unpaid) * 100) / 100
}
