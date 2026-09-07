export const SALARY_MONTH_DAYS = 30

export function monthRange(month: string) {
  const [year, mon] = month.split('-').map(Number)
  const days = new Date(year, mon, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(days).padStart(2, '0')}`, days }
}

export function normalizeAttendanceStatus(status: string | null | undefined) {
  if (status === 'Holiday') return 'HalfDay'
  if (status === 'Present' || status === 'Absent' || status === 'HalfDay') return status
  return null
}

export function workDayValue(status: string | null | undefined) {
  const normalized = normalizeAttendanceStatus(status)
  if (normalized === 'Present') return 1
  if (normalized === 'HalfDay') return 0.5
  return 0
}

export function earnedSalary(basicSalary: number, workDays: number) {
  if (basicSalary <= 0 || workDays <= 0) return 0
  return (basicSalary * workDays) / SALARY_MONTH_DAYS
}

export function isSalaryAdvanceHead(head: string) {
  return head.trim().toLowerCase() === 'salary advance'
}

export function isSalaryPayoutHead(head: string) {
  return head.trim().toLowerCase() === 'salary'
}

export function payStatus(netSalary: number, salaryPaid: number) {
  if (netSalary <= 0.5) return salaryPaid > 0.5 ? 'Paid' : 'None'
  if (salaryPaid >= netSalary - 0.5) return 'Paid'
  if (salaryPaid > 0.5) return 'Partial'
  return 'Unpaid'
}
