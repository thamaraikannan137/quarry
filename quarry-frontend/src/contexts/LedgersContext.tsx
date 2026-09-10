import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { message } from 'antd'

import {
  closeLedger,
  createLedger,
  deleteLedger,
  listLedgers,
  returnLedger,
  transferLedger,
  updateLedger,
} from '@/api/ledgers'
import { errorMessage } from '@/api/http'
import { isLedgerBookHead } from '@/data/ledgerHeads'
import type {
  Ledger,
  LedgerCloseDraft,
  LedgerDraft,
  LedgerReturnDraft,
  LedgerTransferDraft,
} from '@/types/ledger'
import type { Transaction } from '@/types/transaction'
import { useTransactions } from '@/contexts/TransactionsContext'

type LedgersContextValue = {
  ledgers: Ledger[]
  loading: boolean
  getLedger: (id?: string | null) => Ledger | undefined
  ledgersForQuarry: (quarryId: string, status?: 'open' | 'closed' | 'all') => Ledger[]
  refreshLedgers: () => Promise<void>
  addLedger: (draft: LedgerDraft) => Promise<Ledger>
  updateLedgerRecord: (id: string, draft: LedgerDraft) => Promise<void>
  removeLedger: (id: string) => Promise<void>
  returnCash: (id: string, draft: LedgerReturnDraft) => Promise<Ledger>
  closeLedgerEntry: (id: string, draft?: LedgerCloseDraft) => Promise<Ledger>
  transferCash: (
    id: string,
    draft: LedgerTransferDraft,
  ) => Promise<{ from: Ledger; to: Ledger; createdNew: boolean }>
  syncBalances: () => void
}

const LedgersContext = createContext<LedgersContextValue | null>(null)

function withLocalSpend(row: Ledger, spent: number, transferred: number): Ledger {
  const given = Number(row.amount) || 0
  const nextSpent = Math.round(spent * 100) / 100
  const nextTransferred = Math.round(transferred * 100) / 100
  return {
    ...row,
    spent: nextSpent,
    returnedAmount: nextTransferred,
    balance: Math.round((given - nextSpent - nextTransferred) * 100) / 100,
  }
}

function isExpenseForLedger(txn: Transaction, ledgerId: string) {
  if (txn.ledgerId !== ledgerId || txn.type !== 'Debit') return false
  return !isLedgerBookHead(txn.head)
}

function isTransferOut(txn: Transaction, ledgerId: string) {
  if (txn.ledgerId !== ledgerId || txn.type !== 'Debit') return false
  return txn.head.trim().toLowerCase() === 'ledger out'
}

export function LedgersProvider({ children }: { children: ReactNode }) {
  const { transactions, refreshTransactions } = useTransactions()
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const rows = await listLedgers()
    setLedgers(rows)
  }, [])

  useEffect(() => {
    reload()
      .catch((error) => {
        message.error(errorMessage(error, 'Could not load ledger') ?? 'Could not load ledger')
      })
      .finally(() => setLoading(false))
  }, [reload])

  const syncBalances = useCallback(() => {
    setLedgers((current) =>
      current.map((row) => {
        const linked = transactions.filter((txn) => txn.ledgerId === row.id)
        const amount = linked
          .filter((txn) => txn.type === 'Credit')
          .reduce((sum, txn) => sum + (Number(txn.credit) || 0), 0)
        const spent = linked.filter((txn) => isExpenseForLedger(txn, row.id)).reduce((sum, txn) => sum + (Number(txn.debit) || 0), 0)
        const transferred = linked
          .filter((txn) => isTransferOut(txn, row.id))
          .reduce((sum, txn) => sum + (Number(txn.debit) || 0), 0)
        return {
          ...withLocalSpend({ ...row, amount }, spent, transferred),
          amount: Math.round(amount * 100) / 100,
        }
      }),
    )
  }, [transactions])

  useEffect(() => {
    if (!ledgers.length) return
    syncBalances()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])

  const getLedgerEntry = useCallback((id?: string | null) => ledgers.find((row) => row.id === id), [ledgers])

  const ledgersForQuarry = useCallback(
    (quarryId: string, status: 'open' | 'closed' | 'all' = 'all') =>
      ledgers.filter((row) => {
        if (row.quarryId !== quarryId) return false
        if (status === 'all') return true
        return row.status === status
      }),
    [ledgers],
  )

  const addLedger = useCallback(
    async (draft: LedgerDraft) => {
      const next = await createLedger(draft)
      setLedgers((current) => [next, ...current.filter((row) => row.id !== next.id)])
      await refreshTransactions()
      return next
    },
    [refreshTransactions],
  )

  const updateLedgerRecord = useCallback(
    async (id: string, draft: LedgerDraft) => {
      const next = await updateLedger(id, draft)
      setLedgers((current) => current.map((row) => (row.id === id ? next : row)))
      await refreshTransactions()
    },
    [refreshTransactions],
  )

  const removeLedger = useCallback(
    async (id: string) => {
      await deleteLedger(id)
      setLedgers((current) => current.filter((row) => row.id !== id))
      await refreshTransactions()
    },
    [refreshTransactions],
  )

  const returnCash = useCallback(
    async (id: string, draft: LedgerReturnDraft) => {
      const next = await returnLedger(id, draft)
      setLedgers((current) => current.map((row) => (row.id === id ? next : row)))
      await refreshTransactions()
      return next
    },
    [refreshTransactions],
  )

  const closeLedgerEntry = useCallback(async (id: string, draft: LedgerCloseDraft = {}) => {
    const next = await closeLedger(id, draft)
    setLedgers((current) => current.map((row) => (row.id === id ? next : row)))
    return next
  }, [])

  const transferCash = useCallback(
    async (id: string, draft: LedgerTransferDraft) => {
      const result = await transferLedger(id, draft)
      setLedgers((current) => {
        const without = current.filter((row) => row.id !== result.from.id && row.id !== result.to.id)
        return [result.from, result.to, ...without]
      })
      await refreshTransactions()
      return result
    },
    [refreshTransactions],
  )

  const value = useMemo(
    () => ({
      ledgers,
      loading,
      getLedger: getLedgerEntry,
      ledgersForQuarry,
      refreshLedgers: reload,
      addLedger,
      updateLedgerRecord,
      removeLedger,
      returnCash,
      closeLedgerEntry,
      transferCash,
      syncBalances,
    }),
    [
      ledgers,
      loading,
      getLedgerEntry,
      ledgersForQuarry,
      reload,
      addLedger,
      updateLedgerRecord,
      removeLedger,
      returnCash,
      closeLedgerEntry,
      transferCash,
      syncBalances,
    ],
  )

  return <LedgersContext.Provider value={value}>{children}</LedgersContext.Provider>
}

export function useLedgers() {
  const ctx = useContext(LedgersContext)
  if (!ctx) throw new Error('useLedgers must be used within LedgersProvider')
  return ctx
}
