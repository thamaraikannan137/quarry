import { Op, QueryTypes } from 'sequelize'
import { Router } from 'express'

import { Quarry, Transaction, sequelize } from '../db/models/index.js'
import { asyncHandler, badRequest, notFound } from '../lib/http.js'
import { toIsoDate } from '../lib/isoDate.js'
import { NET_CBM_SQL } from '../lib/marking.js'

export const dashboardRouter = Router()

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
  if (!range) return { quarryId }
  return {
    quarryId,
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

dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const quarryId = typeof req.query.quarryId === 'string' ? req.query.quarryId : ''
    const monthRaw = typeof req.query.month === 'string' ? req.query.month : 'all'
    const month = monthRaw === 'all' || /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : 'all'

    if (!quarryId) return badRequest(res, 'quarryId is required')

    const range = getMonthRange(month)
    const periodSql = range ? 'AND "date" >= :startDate AND "date" < :endDate' : ''
    const replacements = range
      ? { quarryId, startDate: range.start, endDate: range.end }
      : { quarryId }

    const summarySql = range
      ? `SELECT
           (SELECT COUNT(*)::int FROM "Transaction" WHERE "quarryId" = :quarryId) AS "totalEntries",
           COUNT(*)::int AS entries,
           COALESCE(SUM(debit), 0) AS debit,
           COALESCE(SUM(credit), 0) AS credit,
           COUNT(*) FILTER (WHERE debit > 0)::int AS "debitCount",
           COUNT(*) FILTER (WHERE credit > 0)::int AS "creditCount"
         FROM "Transaction"
         WHERE "quarryId" = :quarryId
           AND "date" >= :startDate
           AND "date" < :endDate`
      : `SELECT
           COUNT(*)::int AS "totalEntries",
           COUNT(*)::int AS entries,
           COALESCE(SUM(debit), 0) AS debit,
           COALESCE(SUM(credit), 0) AS credit,
           COUNT(*) FILTER (WHERE debit > 0)::int AS "debitCount",
           COUNT(*) FILTER (WHERE credit > 0)::int AS "creditCount"
         FROM "Transaction"
         WHERE "quarryId" = :quarryId`

    const [quarry, summaryRows, flowRows, categoryRows, recent, productionRows] = await Promise.all([
      Quarry.findByPk(quarryId),
      sequelize.query<SummaryRow>(summarySql, { replacements, type: QueryTypes.SELECT }),
      sequelize.query<FlowRow>(
        `SELECT TO_CHAR(DATE_TRUNC('month', "date"), 'YYYY-MM') AS key,
                COALESCE(SUM(debit), 0) AS debit,
                COALESCE(SUM(credit), 0) AS credit
         FROM "Transaction"
         WHERE "quarryId" = :quarryId
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
      },
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
