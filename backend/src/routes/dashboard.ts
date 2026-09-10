import { Op, QueryTypes } from 'sequelize'
import { Router } from 'express'

import { Ledger, Quarry, Transaction, sequelize } from '../db/models/index.js'
import { asyncHandler, badRequest, notFound } from '../lib/http.js'
import { toIsoDate } from '../lib/isoDate.js'
import {
  LEDGER_IN_HEAD,
  LEDGER_OUT_HEAD,
  LEGACY_LEDGER_IN_HEAD,
  LEGACY_LEDGER_RETURN_HEAD,
  LEGACY_LEDGER_TRANSFER_HEAD,
  isLedgerExpenseHead,
} from '../lib/ledgerHeads.js'
import { NET_CBM_SQL } from '../lib/marking.js'

export const dashboardRouter = Router()

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Statement-only heads — excluded from cash-book dashboard totals. */
const LEDGER_BOOK_HEADS = [
  LEDGER_IN_HEAD,
  LEDGER_OUT_HEAD,
  LEGACY_LEDGER_IN_HEAD,
  LEGACY_LEDGER_RETURN_HEAD,
  LEGACY_LEDGER_TRANSFER_HEAD,
]

const LEDGER_BOOK_HEADS_SQL = LEDGER_BOOK_HEADS.map((head) => `'${head.replace(/'/g, "''")}'`).join(', ')

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  if (!year || !month || month < 1 || month > 12) return key
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100
}

/** Inclusive start / exclusive end for YYYY-MM-DD date strings. */
function getMonthRange(month: string) {
  if (month === 'all') return null

  const [year, monthNumber] = month.split('-').map(Number)
  const start = `${year}-${String(monthNumber).padStart(2, '0')}-01`
  const nextYear = monthNumber === 12 ? year + 1 : year
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  return { start, end }
}

function getPeriodWhere(quarryId: string, month: string) {
  const range = getMonthRange(month)
  if (!range) {
    return {
      quarryId,
      head: { [Op.notIn]: LEDGER_BOOK_HEADS },
    }
  }
  return {
    quarryId,
    head: { [Op.notIn]: LEDGER_BOOK_HEADS },
    date: {
      [Op.gte]: range.start,
      [Op.lt]: range.end,
    },
  }
}

type SummaryRow = {
  totalEntries: string | number
  entries: string | number
  debit: string | number
  credit: string | number
  debitCount: string | number
  creditCount: string | number
}

type FlowRow = { key: string; debit: string | number; credit: string | number }
type CategoryRow = { name: string; value: string | number }
type ProductionRow = { blocks: string | number; cbm: string | number }

type LedgerTotals = {
  amount: number
  spent: number
  returnedAmount: number
  balance: number
}

function emptyLedgerTotals(): LedgerTotals {
  return { amount: 0, spent: 0, returnedAmount: 0, balance: 0 }
}

async function openLedgerSummary(quarryId: string) {
  const openRows = await Ledger.findAll({
    where: { quarryId, status: 'open' },
    order: [['holderName', 'ASC']],
  })
  const ids = openRows.map((row) => row.id)
  const map = new Map<string, LedgerTotals>()
  for (const id of ids) map.set(id, emptyLedgerTotals())

  if (ids.length) {
    const txns = await Transaction.findAll({
      where: {
        ledgerId: { [Op.in]: ids },
        head: { [Op.notIn]: [LEGACY_LEDGER_IN_HEAD, LEGACY_LEDGER_RETURN_HEAD, LEGACY_LEDGER_TRANSFER_HEAD] },
      },
      attributes: ['ledgerId', 'type', 'head', 'debit', 'credit'],
    })

    for (const row of txns) {
      if (!row.ledgerId) continue
      const cur = map.get(row.ledgerId) ?? emptyLedgerTotals()
      if (row.type === 'Credit') {
        cur.amount = roundMoney(cur.amount + (Number(row.credit) || 0))
      } else if (row.type === 'Debit') {
        const debit = Number(row.debit) || 0
        if (row.head.trim().toLowerCase() === LEDGER_OUT_HEAD.toLowerCase()) {
          cur.returnedAmount = roundMoney(cur.returnedAmount + debit)
        } else if (isLedgerExpenseHead(row.head)) {
          cur.spent = roundMoney(cur.spent + debit)
        }
      }
      cur.balance = roundMoney(cur.amount - cur.spent - cur.returnedAmount)
      map.set(row.ledgerId, cur)
    }
  }

  const holders = openRows
    .map((row) => {
      const totals = map.get(row.id) ?? emptyLedgerTotals()
      return {
        id: row.id,
        holderName: row.holderName,
        in: totals.amount,
        out: roundMoney(totals.spent + totals.returnedAmount),
        balance: totals.balance,
      }
    })
    .sort((a, b) => b.balance - a.balance || a.holderName.localeCompare(b.holderName))

  const inTotal = roundMoney(holders.reduce((sum, row) => sum + row.in, 0))
  const outTotal = roundMoney(holders.reduce((sum, row) => sum + row.out, 0))
  const balance = roundMoney(holders.reduce((sum, row) => sum + row.balance, 0))

  return {
    openCount: holders.length,
    in: inTotal,
    out: outTotal,
    balance,
    holders: holders.slice(0, 6),
  }
}

dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const quarryId = typeof req.query.quarryId === 'string' ? req.query.quarryId : ''
    const monthRaw = typeof req.query.month === 'string' ? req.query.month : 'all'
    const month = monthRaw === 'all' || /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : 'all'

    if (!quarryId) return badRequest(res, 'quarryId is required')

    const range = getMonthRange(month)
    const periodSql = range ? 'AND "date" >= :startDate AND "date" < :endDate' : ''
    const bookFilterSql = `AND TRIM(head) NOT IN (${LEDGER_BOOK_HEADS_SQL})`
    const replacements = range
      ? { quarryId, startDate: range.start, endDate: range.end }
      : { quarryId }

    const summarySql = range
      ? `SELECT
           (SELECT COUNT(*)::int FROM "Transaction"
              WHERE "quarryId" = :quarryId
                AND TRIM(head) NOT IN (${LEDGER_BOOK_HEADS_SQL})) AS "totalEntries",
           COUNT(*)::int AS entries,
           COALESCE(SUM(debit), 0) AS debit,
           COALESCE(SUM(credit), 0) AS credit,
           COUNT(*) FILTER (WHERE debit > 0)::int AS "debitCount",
           COUNT(*) FILTER (WHERE credit > 0)::int AS "creditCount"
         FROM "Transaction"
         WHERE "quarryId" = :quarryId
           AND "date" >= :startDate
           AND "date" < :endDate
           ${bookFilterSql}`
      : `SELECT
           COUNT(*)::int AS "totalEntries",
           COUNT(*)::int AS entries,
           COALESCE(SUM(debit), 0) AS debit,
           COALESCE(SUM(credit), 0) AS credit,
           COUNT(*) FILTER (WHERE debit > 0)::int AS "debitCount",
           COUNT(*) FILTER (WHERE credit > 0)::int AS "creditCount"
         FROM "Transaction"
         WHERE "quarryId" = :quarryId
           ${bookFilterSql}`

    const [quarry, summaryRows, flowRows, categoryRows, recent, productionRows, ledgers] = await Promise.all([
      Quarry.findByPk(quarryId),
      sequelize.query<SummaryRow>(summarySql, { replacements, type: QueryTypes.SELECT }),
      sequelize.query<FlowRow>(
        `SELECT TO_CHAR(DATE_TRUNC('month', "date"), 'YYYY-MM') AS key,
                COALESCE(SUM(debit), 0) AS debit,
                COALESCE(SUM(credit), 0) AS credit
         FROM "Transaction"
         WHERE "quarryId" = :quarryId
           ${bookFilterSql}
         GROUP BY DATE_TRUNC('month', "date")
         ORDER BY DATE_TRUNC('month', "date") ASC`,
        { replacements: { quarryId }, type: QueryTypes.SELECT },
      ),
      sequelize.query<CategoryRow>(
        `SELECT COALESCE(NULLIF(TRIM(head), ''), 'Other') AS name,
                SUM(debit) AS value
         FROM "Transaction"
         WHERE "quarryId" = :quarryId
           ${periodSql}
           ${bookFilterSql}
         GROUP BY 1
         HAVING SUM(debit) > 0
         ORDER BY value DESC
         LIMIT 8`,
        { replacements, type: QueryTypes.SELECT },
      ),
      Transaction.findAll({
        where: getPeriodWhere(quarryId, month),
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit: 8,
      }),
      sequelize.query<ProductionRow>(
        `SELECT COUNT(*)::int AS blocks,
                COALESCE(SUM(${NET_CBM_SQL}), 0) AS cbm
         FROM "BlockMarking"
         WHERE "quarryId" = :quarryId
           ${periodSql}`,
        { replacements, type: QueryTypes.SELECT },
      ),
      openLedgerSummary(quarryId),
    ])
    if (!quarry) return notFound(res, 'Quarry not found')

    const summary = summaryRows[0] ?? {
      totalEntries: 0,
      entries: 0,
      debit: 0,
      credit: 0,
      debitCount: 0,
      creditCount: 0,
    }
    const debit = roundMoney(Number(summary.debit))
    const credit = roundMoney(Number(summary.credit))
    const production = productionRows[0] ?? { blocks: 0, cbm: 0 }

    const monthlyFlow = flowRows
      .filter((row) => /^\d{4}-\d{2}$/.test(row.key))
      .map((row) => ({
        key: row.key,
        label: monthLabel(row.key),
        debit: roundMoney(Number(row.debit)),
        credit: roundMoney(Number(row.credit)),
      }))

    res.json({
      quarryId,
      quarryName: quarry.name,
      month,
      periodLabel: month === 'all' ? 'All months' : monthLabel(month),
      months: [...monthlyFlow].reverse().map((row) => ({ key: row.key, label: row.label })),
      summary: {
        balance: roundMoney(credit - debit),
        debit,
        credit,
        debitCount: Number(summary.debitCount) || 0,
        creditCount: Number(summary.creditCount) || 0,
        entries: Number(summary.entries) || 0,
        totalEntries: Number(summary.totalEntries) || 0,
        inLedgers: ledgers.balance,
      },
      ledgers,
      monthlyFlow,
      categories: categoryRows.map((row) => ({
        name: row.name,
        value: roundMoney(Number(row.value)),
      })),
      recent: recent.map((row) => {
        const json = row.toJSON()
        return { ...json, date: toIsoDate(json.date) ?? json.date }
      }),
      production: {
        blocks: Number(production.blocks) || 0,
        cbm: Math.round((Number(production.cbm) || 0) * 1000) / 1000,
      },
    })
  }),
)
