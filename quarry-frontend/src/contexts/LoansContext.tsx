import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { message } from 'antd'

import { createLoan, deleteLoan, listLoans, markLoanPaid, undoLoanPaid, updateLoan } from '@/api/loans'
import { errorMessage } from '@/api/http'
import type { Loan, LoanDraft, LoanPayDraft } from '@/types/loan'
import type { Transaction } from '@/types/transaction'
import { isoDateOnly } from '@/utils/money'

type LoansContextValue = {
  loans: Loan[]
  loading: boolean
  getLoan: (id?: string | null) => Loan | undefined
  addLoan: (draft: LoanDraft) => Promise<Loan>
  updateLoanRecord: (id: string, draft: LoanDraft) => Promise<void>
  removeLoan: (id: string) => Promise<void>
  markPaid: (id: string, draft: LoanPayDraft) => Promise<Transaction>
  undoPaid: (loanId: string, paymentId: string) => Promise<string | null>
}

const LoansContext = createContext<LoansContextValue | null>(null)

function mapTxn(row: Transaction): Transaction {
  return {
    ...row,
    date: isoDateOnly(row.date),
    debit: Number(row.debit) || 0,
    credit: Number(row.credit) || 0,
    loanId: row.loanId ?? null,
    refNote: row.refNote ?? null,
  }
}

export function LoansProvider({ children }: { children: ReactNode }) {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const rows = await listLoans()
    setLoans(rows)
  }, [])

  useEffect(() => {
    reload()
      .catch((error) => {
        message.error(errorMessage(error, 'Could not load loans') ?? 'Could not load loans')
      })
      .finally(() => setLoading(false))
  }, [reload])

  const getLoan = useCallback((id?: string | null) => loans.find((row) => row.id === id), [loans])

  const addLoan = useCallback(async (draft: LoanDraft) => {
    const next = await createLoan(draft)
    setLoans((current) => [next, ...current.filter((row) => row.id !== next.id)])
    return next
  }, [])

  const updateLoanRecord = useCallback(async (id: string, draft: LoanDraft) => {
    const next = await updateLoan(id, draft)
    setLoans((current) => current.map((row) => (row.id === id ? next : row)))
  }, [])

  const removeLoan = useCallback(async (id: string) => {
    await deleteLoan(id)
    setLoans((current) => current.filter((row) => row.id !== id))
  }, [])

  const markPaid = useCallback(async (id: string, draft: LoanPayDraft) => {
    const result = await markLoanPaid(id, draft)
    setLoans((current) =>
      current.map((row) =>
        row.id === id ? { ...row, payments: [...row.payments, result.payment] } : row,
      ),
    )
    return mapTxn(result.transaction)
  }, [])

  const undoPaid = useCallback(async (loanId: string, paymentId: string) => {
    const loan = loans.find((row) => row.id === loanId)
    const payment = loan?.payments.find((row) => row.id === paymentId)
    await undoLoanPaid(loanId, paymentId)
    setLoans((current) =>
      current.map((row) =>
        row.id === loanId ? { ...row, payments: row.payments.filter((item) => item.id !== paymentId) } : row,
      ),
    )
    return payment?.transactionId ?? null
  }, [loans])

  const value = useMemo(
    () => ({
      loans,
      loading,
      getLoan,
      addLoan,
      updateLoanRecord,
      removeLoan,
      markPaid,
      undoPaid,
    }),
    [loans, loading, getLoan, addLoan, updateLoanRecord, removeLoan, markPaid, undoPaid],
  )

  return <LoansContext.Provider value={value}>{children}</LoansContext.Provider>
}

export function useLoans() {
  const ctx = useContext(LoansContext)
  if (!ctx) throw new Error('useLoans must be used within LoansProvider')
  return ctx
}
