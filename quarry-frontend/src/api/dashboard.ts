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
  inLedgers: number
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

export type DashboardLedgerHolder = {
  id: string
  holderName: string
  in: number
  out: number
  balance: number
}

export type DashboardLedgers = {
  openCount: number
  in: number
  out: number
  balance: number
  holders: DashboardLedgerHolder[]
}

export type DashboardPayload = {
  quarryId: string
  quarryName: string
  month: string
  periodLabel: string
  months: DashboardMonth[]
  summary: DashboardSummary
  ledgers: DashboardLedgers
  monthlyFlow: DashboardFlowPoint[]
  categories: DashboardCategory[]
  recent: Transaction[]
  production: {
    blocks: number
    cbm: number
  }
}

const EMPTY_LEDGERS: DashboardLedgers = {
  openCount: 0,
  in: 0,
  out: 0,
  balance: 0,
  holders: [],
}

export async function getDashboard(quarryId: string, month = 'all') {
  const params = new URLSearchParams({ quarryId })
  if (month && month !== 'all') params.set('month', month)
  const payload = await api<DashboardPayload>(`/api/dashboard?${params.toString()}`)
  return {
    ...payload,
    summary: {
      ...payload.summary,
      inLedgers: Number(payload.summary?.inLedgers) || Number(payload.ledgers?.balance) || 0,
    },
    ledgers: payload.ledgers ?? EMPTY_LEDGERS,
    recent: payload.recent.map((row) => ({ ...row, date: isoDateOnly(row.date) })),
  }
}
