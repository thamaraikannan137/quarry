import { Router } from 'express'

import { BlockMarking, Quarry, Transaction } from '../db/models/index.js'
import { asyncHandler, badRequest, notFound } from '../lib/http.js'
import { netVolCbm } from '../lib/marking.js'

export const dashboardRouter = Router()

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthKey(date: string) {
  return date.slice(0, 7)
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  if (!year || !month || month < 1 || month > 12) return key
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function inMonth(date: string, month: string) {
  if (!month || month === 'all') return true
  return monthKey(date) === month
}

dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const quarryId = typeof req.query.quarryId === 'string' ? req.query.quarryId : ''
    const monthRaw = typeof req.query.month === 'string' ? req.query.month : 'all'
    const month = monthRaw === 'all' || /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : 'all'

    if (!quarryId) return badRequest(res, 'quarryId is required')

    const quarry = await Quarry.findByPk(quarryId)
    if (!quarry) return notFound(res, 'Quarry not found')

    const [transactions, markings] = await Promise.all([
      Transaction.findAll({
        where: { quarryId },
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      }),
      BlockMarking.findAll({ where: { quarryId } }),
    ])

    const monthKeys = [...new Set(transactions.map((row) => monthKey(row.date)))]
      .filter((key) => /^\d{4}-\d{2}$/.test(key))
      .sort()
      .reverse()

    const filtered = transactions.filter((row) => inMonth(row.date, month))
    const debit = filtered.reduce((sum, row) => sum + (Number(row.debit) || 0), 0)
    const credit = filtered.reduce((sum, row) => sum + (Number(row.credit) || 0), 0)

    const flowMap = new Map<string, { key: string; label: string; debit: number; credit: number }>()
    for (const row of transactions) {
      const key = monthKey(row.date)
      const current = flowMap.get(key) ?? { key, label: monthLabel(key), debit: 0, credit: 0 }
      current.debit += Number(row.debit) || 0
      current.credit += Number(row.credit) || 0
      flowMap.set(key, current)
    }

    const categoryMap = new Map<string, number>()
    for (const row of filtered) {
      const amount = Number(row.debit) || 0
      if (amount <= 0) continue
      const name = row.head?.trim() || 'Other'
      categoryMap.set(name, (categoryMap.get(name) ?? 0) + amount)
    }

    const periodMarkings = markings.filter((row) => inMonth(row.date, month))
    const cbm = periodMarkings.reduce((sum, row) => sum + netVolCbm(row.l, row.w, row.h), 0)

    res.json({
      quarryId,
      quarryName: quarry.name,
      month,
      periodLabel: month === 'all' ? 'All months' : monthLabel(month),
      months: monthKeys.map((key) => ({ key, label: monthLabel(key) })),
      summary: {
        balance: Math.round((credit - debit) * 100) / 100,
        debit: Math.round(debit * 100) / 100,
        credit: Math.round(credit * 100) / 100,
        debitCount: filtered.filter((row) => (Number(row.debit) || 0) > 0).length,
        creditCount: filtered.filter((row) => (Number(row.credit) || 0) > 0).length,
        entries: filtered.length,
        totalEntries: transactions.length,
      },
      monthlyFlow: [...flowMap.values()].sort((a, b) => a.key.localeCompare(b.key)),
      categories: [...categoryMap.entries()]
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      recent: filtered.slice(0, 8),
      production: {
        blocks: periodMarkings.length,
        cbm: Math.round(cbm * 1000) / 1000,
      },
    })
  }),
)
