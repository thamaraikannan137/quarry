export type SalaryPayStatus = 'Unpaid' | 'Partial' | 'Paid' | 'None'

export type SalaryRow = {
  sno: number
  staffId: string
  name: string
  designation: string
  staffStatus: string
  basicSalary: number
  present: number
  halfDays: number
  absent: number
  workDays: number
  salary: number
  advance: number
  netSalary: number
  salaryPaid: number
  due: number
  payStatus: SalaryPayStatus
}

export type SalarySheet = {
  quarryId: string
  month: string
  days: number
  salaryMonthDays: number
  rows: SalaryRow[]
  totals: {
    workDays: number
    salary: number
    advance: number
    netSalary: number
    salaryPaid: number
    due: number
  }
}
