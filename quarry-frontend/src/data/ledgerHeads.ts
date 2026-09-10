/** Ledger statement heads — hidden from All Transactions. */
export const LEDGER_IN_HEAD = 'Ledger in'
export const LEDGER_OUT_HEAD = 'Ledger out'

const BOOK_HEADS = [
  LEDGER_IN_HEAD,
  LEDGER_OUT_HEAD,
  'Cash float in',
  'Cash float return',
  'Cash float transfer',
]

export function isLedgerBookHead(head: string) {
  const key = head.trim().toLowerCase()
  return BOOK_HEADS.some((item) => item.toLowerCase() === key)
}
