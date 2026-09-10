export type LoanPayment = {
  id: string
  loanId: string
  quarryId: string
  ym: string
  date: string
  amount: number
  transactionId: string
}

export type Loan = {
  id: string
  vehicleNo: string
  borrower: string
  loanNo: string
  bank: string
  informDay: number
  dueDay: number
  emiAmount: number
  active: boolean
  payments: LoanPayment[]
}

export type LoanDraft = {
  vehicleNo: string
  borrower: string
  loanNo: string
  bank: string
  informDay: number
  dueDay: number
  emiAmount: number
  active: boolean
}

export type LoanPayDraft = {
  quarryId: string
  date: string
  amount: number
}

export function emptyLoanDraft(): LoanDraft {
  return {
    vehicleNo: '',
    borrower: '',
    loanNo: '',
    bank: '',
    informDay: 1,
    dueDay: 5,
    emiAmount: 0,
    active: true,
  }
}

export function paymentForMonth(loan: Loan, ym: string) {
  return loan.payments.find((row) => row.ym === ym)
}
