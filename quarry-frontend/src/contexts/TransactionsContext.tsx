import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { message } from 'antd'

import { errorMessage } from '@/api/http'
import {
  createTransaction,
  deleteTransactionApi,
  listTransactions,
  updateTransactionApi,
} from '@/api/transactions'
import { EXPENSE_HEADS, isMachineryRentHead } from '@/data/expenseHeads'
import type { Transaction, TxnType, VoucherDraft } from '@/types/transaction'

const HEADS_KEY = 'quarry-heads-v1'
const MACHINERY_KEY = 'quarry-machinery-names-v1'
const LEGACY_KEYS = [
  'quarry-transactions-v7',
  'quarry-transactions-v6',
  'quarry-transactions-v5',
  'quarry-transactions-v4',
  'quarry-transactions-v3',
  'quarry-transactions-v2',
]

type TransactionsContextValue = {
  transactions: Transaction[]
  loading: boolean
  heads: string[]
  machineryNames: string[]
  addVoucher: (quarryId: string, type: TxnType, draft: VoucherDraft) => Promise<void>
  updateTransaction: (id: string, type: TxnType, draft: VoucherDraft) => Promise<void>
  addHead: (name: string) => string | null
  addMachineryName: (name: string) => string | null
  deleteTransaction: (id: string) => Promise<void>
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

function readStoredList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function readHeads(transactions: Transaction[]): string[] {
  return uniqueHeads([...EXPENSE_HEADS, ...readStoredList(HEADS_KEY), ...transactions.map((row) => row.head)])
}

function machineryFromTransactions(transactions: Transaction[]) {
  return transactions.filter((row) => isMachineryRentHead(row.head)).map((row) => row.refNote ?? '')
}

function readMachineryNames(transactions: Transaction[]): string[] {
  return uniqueHeads([...readStoredList(MACHINERY_KEY), ...machineryFromTransactions(transactions)])
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [heads, setHeads] = useState<string[]>(() => readHeads([]))
  const [machineryNames, setMachineryNames] = useState<string[]>(() => readMachineryNames([]))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key)
    listTransactions()
      .then((rows) => {
        setTransactions(rows)
        setHeads(readHeads(rows))
        setMachineryNames(readMachineryNames(rows))
      })
      .catch((error) => {
        message.error(errorMessage(error, 'Could not load transactions') ?? 'Could not load transactions')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    localStorage.setItem(HEADS_KEY, JSON.stringify(heads))
  }, [heads])

  useEffect(() => {
    localStorage.setItem(MACHINERY_KEY, JSON.stringify(machineryNames))
  }, [machineryNames])

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

  const addMachineryName = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    setMachineryNames((current) => {
      if (current.some((item) => item.toLowerCase() === trimmed.toLowerCase())) return current
      return uniqueHeads([...current, trimmed])
    })
    const existing = machineryNames.find((item) => item.toLowerCase() === trimmed.toLowerCase())
    return existing ?? trimmed
  }, [machineryNames])

  const addVoucher = useCallback(async (quarryId: string, type: TxnType, draft: VoucherDraft) => {
    const head = addHead(draft.head) ?? draft.head
    if (isMachineryRentHead(head) && draft.refNote) addMachineryName(draft.refNote)
    const next = await createTransaction(quarryId, type, { ...draft, head })
    setTransactions((current) => [next, ...current.filter((row) => row.id !== next.id)])
  }, [addHead, addMachineryName])

  const updateTransaction = useCallback(async (id: string, type: TxnType, draft: VoucherDraft) => {
    const head = addHead(draft.head) ?? draft.head
    if (isMachineryRentHead(head) && draft.refNote) addMachineryName(draft.refNote)
    const next = await updateTransactionApi(id, type, { ...draft, head })
    setTransactions((current) => current.map((row) => (row.id === id ? next : row)))
  }, [addHead, addMachineryName])

  const deleteTransaction = useCallback(async (id: string) => {
    await deleteTransactionApi(id)
    setTransactions((current) => current.filter((row) => row.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      transactions,
      loading,
      heads,
      machineryNames,
      addVoucher,
      updateTransaction,
      addHead,
      addMachineryName,
      deleteTransaction,
    }),
    [transactions, loading, heads, machineryNames, addVoucher, updateTransaction, addHead, addMachineryName, deleteTransaction],
  )

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider')
  return ctx
}
