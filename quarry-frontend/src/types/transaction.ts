export type TxnType = 'Debit' | 'Credit'

/** Optional links / extras that appear based on category. */
export type TransactionMeta = {
  partyId?: string | null
  personId?: string | null
  labourId?: string | null
  litres?: number | null
  refNote?: string | null
  /** Link Cash Received to a marking invoice (party + date batch). */
  markingBatchId?: string | null
  /** How the receipt was paid — Cash, GPay, etc. */
  paymentMethod?: string | null
  /** Linked EMI loan (Finance / Loan due board). */
  loanId?: string | null
}

export type Transaction = {
  id: string
  quarryId: string
  date: string
  type: TxnType
  head: string
  particulars: string
  debit: number
  credit: number
  createdAt?: string
} & TransactionMeta

export type VoucherDraft = {
  date: string
  amount: number
  head: string
  particulars: string
} & TransactionMeta
