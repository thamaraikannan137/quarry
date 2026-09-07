import { api } from '@/api/http'
import type { Transaction } from '@/types/transaction'
import { isoDateOnly } from '@/utils/money'

export type DashboardMonth = {
  key: string
  label: string
}

export type DashboardSummary = {
  balance: number
  debit: number
  credit: number
  debitCount: number
  creditCount: number
  entries: number
  totalEntries: number
}

export type DashboardFlowPoint = {
  key: string
  label: string
  debit: number
  credit: number
}

export type DashboardCategory = {
  name: string
  value: number
}

export type DashboardPayload = {
  quarryId: string
  quarryName: string
  month: string
  periodLabel: string
  months: DashboardMonth[]
  summary: DashboardSummary
  monthlyFlow: DashboardFlowPoint[]
  categories: DashboardCategory[]
  recent: Transaction[]
  production: {
    blocks: number
    cbm: number
  }
}

export async function getDashboard(quarryId: string, month = 'all') {
  const params = new URLSearchParams({ quarryId })
  if (month && month !== 'all') params.set('month', month)
  const payload = await api<DashboardPayload>(`/api/dashboard?${params.toString()}`)
  return {
    ...payload,
    recent: payload.recent.map((row) => ({ ...row, date: isoDateOnly(row.date) })),
  }
}
