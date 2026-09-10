/** Historical voucher heads from when give/transfer/return posted to All Transactions. */
export const LEGACY_LEDGER_IN_HEAD = 'Cash float in'
export const LEGACY_LEDGER_RETURN_HEAD = 'Cash float return'
export const LEGACY_LEDGER_TRANSFER_HEAD = 'Cash float transfer'

/** Ledger statement only — hidden from All Transactions. */
export const LEDGER_IN_HEAD = 'Ledger in'
export const LEDGER_OUT_HEAD = 'Ledger out'

const LEGACY = [LEGACY_LEDGER_IN_HEAD, LEGACY_LEDGER_RETURN_HEAD, LEGACY_LEDGER_TRANSFER_HEAD]
const BOOK = [LEDGER_IN_HEAD, LEDGER_OUT_HEAD]

export function isLegacyLedgerHead(head: string) {
  const key = head.trim().toLowerCase()
  return LEGACY.some((item) => item.toLowerCase() === key)
}

/** In/out rows that belong on the ledger statement, not the main cash book. */
export function isLedgerBookHead(head: string) {
  const key = head.trim().toLowerCase()
  return (
    BOOK.some((item) => item.toLowerCase() === key) ||
    isLegacyLedgerHead(head)
  )
}

export function isLedgerExpenseHead(head: string) {
  return !isLedgerBookHead(head)
}
