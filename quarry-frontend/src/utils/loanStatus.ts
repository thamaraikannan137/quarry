import type { Loan } from '@/types/loan'
import { paymentForMonth } from '@/types/loan'
import { todayISO } from '@/utils/money'

export type LoanStatusKey = 'paid' | 'overdue' | 'due' | 'upcoming'

export type LoanStatus = {
  key: LoanStatusKey
  label: string
  color: 'success' | 'error' | 'warning' | 'default'
}

function daysInMonth(ym: string) {
  const [year, month] = ym.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

function localToday() {
  const iso = todayISO()
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function currentMonthKey() {
  return todayISO().slice(0, 7)
}

export function recentMonthKeys(count = 18) {
  const now = localToday()
  const keys: string[] = []
  for (let i = 0; i < count; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

export function dueDateForMonth(ym: string, dueDay: number) {
  const day = Math.min(Number(dueDay) || 1, daysInMonth(ym))
  return `${ym}-${String(day).padStart(2, '0')}`
}

export function loanStatus(loan: Loan, ym: string): LoanStatus {
  if (paymentForMonth(loan, ym)) return { key: 'paid', label: 'Paid', color: 'success' }

  const [year, month] = ym.split('-').map(Number)
  const dueDay = Math.min(Number(loan.dueDay) || 1, daysInMonth(ym))
  const informDay = Math.min(Number(loan.informDay) || dueDay, daysInMonth(ym))
  const dueDate = new Date(year, month - 1, dueDay)
  const informDate = new Date(year, month - 1, informDay)
  const today = localToday()
  const viewingCurrent = ym === currentMonthKey()

  if (viewingCurrent) {
    if (today > dueDate) return { key: 'overdue', label: 'Overdue', color: 'error' }
    if (today >= informDate) return { key: 'due', label: 'Due soon', color: 'warning' }
    return { key: 'upcoming', label: 'Upcoming', color: 'default' }
  }

  const viewEnd = new Date(year, month, 0)
  if (viewEnd < today) return { key: 'overdue', label: 'Unpaid', color: 'error' }
  return { key: 'upcoming', label: 'Upcoming', color: 'default' }
}
