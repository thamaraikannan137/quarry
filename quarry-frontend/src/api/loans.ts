import { api } from '@/api/http'
import type { Loan, LoanDraft, LoanPayDraft, LoanPayment } from '@/types/loan'
import type { Transaction } from '@/types/transaction'
import { isoDateOnly } from '@/utils/money'

type ApiLoan = Omit<Loan, 'payments'> & { payments?: LoanPayment[] }

function fromPayment(row: LoanPayment): LoanPayment {
  return {
    id: row.id,
    loanId: row.loanId,
    quarryId: row.quarryId,
    ym: row.ym,
    date: isoDateOnly(row.date),
    amount: Number(row.amount) || 0,
    transactionId: row.transactionId,
  }
}

function fromLoan(row: ApiLoan): Loan {
  return {
    id: row.id,
    vehicleNo: row.vehicleNo,
    borrower: row.borrower ?? '',
    loanNo: row.loanNo ?? '',
    bank: row.bank ?? '',
    informDay: Number(row.informDay) || 1,
    dueDay: Number(row.dueDay) || 1,
    emiAmount: Number(row.emiAmount) || 0,
    active: row.active !== false,
    payments: (row.payments ?? []).map(fromPayment),
  }
}

function toPayload(draft: LoanDraft) {
  return {
    vehicleNo: draft.vehicleNo.trim(),
    borrower: draft.borrower.trim(),
    loanNo: draft.loanNo.trim(),
    bank: draft.bank.trim(),
    informDay: Number(draft.informDay) || 1,
    dueDay: Number(draft.dueDay) || 1,
    emiAmount: Number(draft.emiAmount) || 0,
    active: draft.active,
  }
}

export async function listLoans() {
  const rows = await api<ApiLoan[]>('/api/loans')
  return rows.map(fromLoan)
}

export async function createLoan(draft: LoanDraft) {
  const row = await api<ApiLoan>('/api/loans', {
    method: 'POST',
    body: JSON.stringify(toPayload(draft)),
  })
  return fromLoan(row)
}

export async function updateLoan(id: string, draft: LoanDraft) {
  const row = await api<ApiLoan>(`/api/loans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toPayload(draft)),
  })
  return fromLoan(row)
}

export async function deleteLoan(id: string) {
  await api<void>(`/api/loans/${id}`, { method: 'DELETE' })
}

export async function markLoanPaid(id: string, draft: LoanPayDraft) {
  const row = await api<{ payment: LoanPayment; transaction: Transaction }>(`/api/loans/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify({
      quarryId: draft.quarryId,
      date: draft.date,
      amount: draft.amount,
    }),
  })
  return {
    payment: fromPayment(row.payment),
    transaction: row.transaction,
  }
}

export async function undoLoanPaid(loanId: string, paymentId: string) {
  await api<void>(`/api/loans/${loanId}/payments/${paymentId}`, { method: 'DELETE' })
}
