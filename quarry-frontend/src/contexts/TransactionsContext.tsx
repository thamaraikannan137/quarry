import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { EXPENSE_HEADS } from '@/data/expenseHeads'
import { JULY_2026_TRANSACTIONS } from '@/data/july2026Transactions'
import type { Transaction, TxnType, VoucherDraft } from '@/types/transaction'
import { newId } from '@/utils/money'

/** Bump when replacing seed / incompatible shapes. */
const STORAGE_KEY = 'quarry-transactions-v7'
const HEADS_KEY = 'quarry-heads-v1'
const LEGACY_KEYS = [
  'quarry-transactions-v6',
  'quarry-transactions-v5',
  'quarry-transactions-v4',
  'quarry-transactions-v3',
  'quarry-transactions-v2',
]

type TransactionsContextValue = {
  transactions: Transaction[]
  heads: string[]
  addVoucher: (quarryId: string, type: TxnType, draft: VoucherDraft) => void
  updateTransaction: (id: string, type: TxnType, draft: VoucherDraft) => void
  addHead: (name: string) => string | null
  deleteTransaction: (id: string) => void
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null)

function uniqueHeads(list: string[]) {
  const seen = new Set<string>()
  const next: string[] = []
  for (const item of list) {
    const name = item.trim()
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    next.push(name)
  }
  return next
}

function clearLegacyStorage() {
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key)
  }
}

function readStored(): Transaction[] {
  try {
    clearLegacyStorage()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return JULY_2026_TRANSACTIONS
    const parsed = JSON.parse(raw) as Transaction[]
    return Array.isArray(parsed) ? parsed : JULY_2026_TRANSACTIONS
  } catch {
    return JULY_2026_TRANSACTIONS
  }
}

function readHeads(transactions: Transaction[]): string[] {
  try {
    const raw = localStorage.getItem(HEADS_KEY)
    const stored = raw ? (JSON.parse(raw) as string[]) : []
    return uniqueHeads([...EXPENSE_HEADS, ...stored, ...transactions.map((row) => row.head)])
  } catch {
    return uniqueHeads([...EXPENSE_HEADS, ...transactions.map((row) => row.head)])
  }
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(readStored)
  const [heads, setHeads] = useState<string[]>(() => readHeads(readStored()))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    localStorage.setItem(HEADS_KEY, JSON.stringify(heads))
  }, [heads])

  const addHead = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    setHeads((current) => {
      if (current.some((head) => head.toLowerCase() === trimmed.toLowerCase())) return current
      return uniqueHeads([...current, trimmed])
    })
    const existing = heads.find((head) => head.toLowerCase() === trimmed.toLowerCase())
    return existing ?? trimmed
  }, [heads])

  const addVoucher = useCallback((quarryId: string, type: TxnType, draft: VoucherDraft) => {
    const isCredit = type === 'Credit'
    const head = addHead(draft.head) ?? draft.head
    const next: Transaction = {
      id: newId(),
      quarryId,
      date: draft.date,
      type,
      head,
      particulars: draft.particulars,
      debit: isCredit ? 0 : draft.amount,
      credit: isCredit ? draft.amount : 0,
      partyId: draft.partyId ?? null,
      personId: draft.personId ?? null,
      labourId: draft.labourId ?? null,
      litres: draft.litres ?? null,
      refNote: draft.refNote ?? null,
      markingBatchId: draft.markingBatchId ?? null,
      paymentMethod: draft.paymentMethod ?? null,
    }
    setTransactions((current) => [next, ...current])
  }, [addHead])

  const updateTransaction = useCallback((id: string, type: TxnType, draft: VoucherDraft) => {
    const isCredit = type === 'Credit'
    const head = addHead(draft.head) ?? draft.head
    setTransactions((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              date: draft.date,
              type,
              head,
              particulars: draft.particulars,
              debit: isCredit ? 0 : draft.amount,
              credit: isCredit ? draft.amount : 0,
              partyId: draft.partyId ?? null,
              personId: draft.personId ?? null,
              labourId: draft.labourId ?? null,
              litres: draft.litres ?? null,
              refNote: draft.refNote ?? null,
              markingBatchId: draft.markingBatchId ?? null,
              paymentMethod: draft.paymentMethod ?? null,
            }
          : row,
      ),
    )
  }, [addHead])

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((current) => current.filter((row) => row.id !== id))
  }, [])

  const value = useMemo(
    () => ({ transactions, heads, addVoucher, updateTransaction, addHead, deleteTransaction }),
    [transactions, heads, addVoucher, updateTransaction, addHead, deleteTransaction],
  )

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider')
  return ctx
}
