import { Router } from 'express'
import { Op, type Transaction as SequelizeTransaction } from 'sequelize'
import { z } from 'zod'

import { Ledger, Quarry, Staff, Transaction, sequelize } from '../db/models/index.js'
import {
  LEDGER_IN_HEAD,
  LEDGER_OUT_HEAD,
  LEGACY_LEDGER_IN_HEAD,
  LEGACY_LEDGER_RETURN_HEAD,
  LEGACY_LEDGER_TRANSFER_HEAD,
  isLedgerExpenseHead,
} from '../lib/ledgerHeads.js'
import { asyncHandler, badRequest, notFound, routeParam } from '../lib/http.js'
import { isoDateSchema } from '../lib/isoDate.js'
import { newId } from '../lib/marking.js'

export const ledgersRouter = Router()

const LEGACY_LEDGER_HEADS = [LEGACY_LEDGER_IN_HEAD, LEGACY_LEDGER_RETURN_HEAD, LEGACY_LEDGER_TRANSFER_HEAD]

const ledgerSchema = z.object({
  quarryId: z.string().min(1),
  holderName: z.string().trim().min(1, 'Holder name is required'),
  personId: z.string().optional().nullable(),
  date: isoDateSchema,
  amount: z.number().positive('Amount required'),
  notes: z.string().trim().optional().default(''),
  status: z.enum(['open', 'closed']).optional().default('open'),
  returnedAmount: z.number().nonnegative().optional().default(0),
  closedDate: isoDateSchema.optional().nullable(),
})

const returnSchema = z.object({
  amount: z.number().positive('Return amount required'),
  date: isoDateSchema.optional(),
  close: z.boolean().optional().default(false),
})

const transferSchema = z
  .object({
    amount: z.number().positive('Transfer amount required'),
    date: isoDateSchema.optional(),
    notes: z.string().trim().optional().default(''),
    close: z.boolean().optional().default(false),
    toLedgerId: z.string().min(1).optional(),
    toHolderName: z.string().trim().min(1).optional(),
    toPersonId: z.string().optional().nullable(),
  })
  .refine((data) => Boolean(data.toLedgerId) || Boolean(data.toHolderName), {
    message: 'Select a destination ledger or enter a holder name',
  })

const closeSchema = z.object({
  returnedAmount: z.number().nonnegative().optional(),
  date: isoDateSchema.optional(),
})

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function normalizeHolder(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

type LedgerTotals = {
  amount: number
  spent: number
  returnedAmount: number
  balance: number
}

function emptyTotals(): LedgerTotals {
  return { amount: 0, spent: 0, returnedAmount: 0, balance: 0 }
}

/** In = credits; Out = expense debits + ledger-out transfers. */
async function totalsByLedgerIds(ids: string[]) {
  const map = new Map<string, LedgerTotals>()
  for (const id of ids) map.set(id, emptyTotals())
  if (!ids.length) return map

  const rows = await Transaction.findAll({
    where: {
      ledgerId: { [Op.in]: ids },
      head: { [Op.notIn]: LEGACY_LEDGER_HEADS },
    },
    attributes: ['ledgerId', 'type', 'head', 'debit', 'credit'],
  })

  for (const row of rows) {
    if (!row.ledgerId) continue
    const cur = map.get(row.ledgerId) ?? emptyTotals()
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
  return map
}

function summarize(row: Ledger, totals: LedgerTotals) {
  return {
    ...row.toJSON(),
    amount: totals.amount,
    returnedAmount: totals.returnedAmount,
    spent: totals.spent,
    balance: totals.balance,
  }
}

async function createLedgerIn(
  ledger: Ledger,
  opts: { amount: number; date: string; notes?: string; transaction?: SequelizeTransaction },
) {
  return Transaction.create(
    {
      id: newId('tx'),
      quarryId: ledger.quarryId,
      date: opts.date,
      type: 'Credit',
      head: LEDGER_IN_HEAD,
      particulars: opts.notes?.trim() || `Cash given to ${ledger.holderName}`,
      debit: 0,
      credit: opts.amount,
      ledgerId: ledger.id,
    },
    opts.transaction ? { transaction: opts.transaction } : undefined,
  )
}

async function createLedgerOut(
  ledger: Ledger,
  opts: {
    amount: number
    date: string
    notes?: string
    transaction?: SequelizeTransaction
  },
) {
  return Transaction.create(
    {
      id: newId('tx'),
      quarryId: ledger.quarryId,
      date: opts.date,
      type: 'Debit',
      head: LEDGER_OUT_HEAD,
      particulars: opts.notes?.trim() || `Transfer from ${ledger.holderName}`,
      debit: opts.amount,
      credit: 0,
      ledgerId: ledger.id,
    },
    opts.transaction ? { transaction: opts.transaction } : undefined,
  )
}

ledgersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const quarryId = typeof req.query.quarryId === 'string' ? req.query.quarryId : undefined
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const where: Record<string, string> = {}
    if (quarryId) where.quarryId = quarryId
    if (status === 'open' || status === 'closed') where.status = status

    const rows = await Ledger.findAll({
      where,
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    })
    const totals = await totalsByLedgerIds(rows.map((row) => row.id))
    res.json(rows.map((row) => summarize(row, totals.get(row.id) ?? emptyTotals())))
  }),
)

ledgersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Ledger.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Ledger entry not found')
    const totals = await totalsByLedgerIds([row.id])
    const transactions = await Transaction.findAll({
      where: {
        ledgerId: row.id,
        head: { [Op.notIn]: LEGACY_LEDGER_HEADS },
      },
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    })
    res.json({
      ...summarize(row, totals.get(row.id) ?? emptyTotals()),
      transactions: transactions.map((item) => item.toJSON()),
    })
  }),
)

/** Give cash — one open ledger per holder; each give is a Credit (In) line. */
ledgersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = ledgerSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message ?? parsed.error.message)

    const quarry = await Quarry.findByPk(parsed.data.quarryId)
    if (!quarry) return badRequest(res, 'Invalid quarryId')

    if (parsed.data.personId) {
      const staff = await Staff.findByPk(parsed.data.personId)
      if (!staff) return badRequest(res, 'Invalid personId')
    }

    const holderName = parsed.data.holderName.trim()
    const holderKey = normalizeHolder(holderName)

    const result = await sequelize.transaction(async (t) => {
      const openRows = await Ledger.findAll({
        where: { quarryId: parsed.data.quarryId, status: 'open' },
        transaction: t,
      })
      let ledger =
        openRows.find((row) => normalizeHolder(row.holderName) === holderKey) ?? null

      if (!ledger) {
        ledger = await Ledger.create(
          {
            id: newId('ldg'),
            quarryId: parsed.data.quarryId,
            holderName,
            personId: parsed.data.personId ?? null,
            date: parsed.data.date,
            amount: parsed.data.amount,
            notes: parsed.data.notes ?? '',
            status: 'open',
            returnedAmount: 0,
            closedDate: null,
          },
          { transaction: t },
        )
      } else {
        await ledger.update(
          {
            amount: roundMoney((Number(ledger.amount) || 0) + parsed.data.amount),
            personId: parsed.data.personId ?? ledger.personId,
            notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : ledger.notes,
          },
          { transaction: t },
        )
      }

      await createLedgerIn(ledger, {
        amount: parsed.data.amount,
        date: parsed.data.date,
        notes: parsed.data.notes,
        transaction: t,
      })

      return ledger
    })

    const totals = await totalsByLedgerIds([result.id])
    res.status(201).json(summarize(result, totals.get(result.id) ?? emptyTotals()))
  }),
)

ledgersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Ledger.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Ledger entry not found')

    const parsed = ledgerSchema.partial().safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message ?? parsed.error.message)

    if (parsed.data.quarryId) {
      const quarry = await Quarry.findByPk(parsed.data.quarryId)
      if (!quarry) return badRequest(res, 'Invalid quarryId')
    }

    if (parsed.data.personId) {
      const staff = await Staff.findByPk(parsed.data.personId)
      if (!staff) return badRequest(res, 'Invalid personId')
    }

    const totalsBefore = (await totalsByLedgerIds([row.id])).get(row.id) ?? emptyTotals()

    const nextStatus = parsed.data.status ?? row.status
    let nextClosedDate =
      parsed.data.closedDate === undefined ? row.closedDate : parsed.data.closedDate
    if (nextStatus === 'open') nextClosedDate = null
    if (nextStatus === 'closed' && !nextClosedDate) {
      nextClosedDate = parsed.data.date ?? new Date().toISOString().slice(0, 10)
    }

    try {
      await sequelize.transaction(async (t) => {
        await row.update(
          {
            quarryId: parsed.data.quarryId,
            holderName: parsed.data.holderName,
            personId: parsed.data.personId === undefined ? undefined : parsed.data.personId,
            date: parsed.data.date,
            notes: parsed.data.notes,
            status: parsed.data.status,
            closedDate: nextClosedDate,
          },
          { transaction: t },
        )

        if (parsed.data.amount != null) {
          const delta = roundMoney(parsed.data.amount - totalsBefore.amount)
          if (delta > 0.01) {
            await createLedgerIn(row, {
              amount: delta,
              date: parsed.data.date ?? row.date,
              notes: 'Amount adjustment',
              transaction: t,
            })
            await row.update(
              { amount: roundMoney((Number(row.amount) || 0) + delta) },
              { transaction: t },
            )
          } else if (delta < -0.01) {
            throw new Error('REDUCE_IN')
          }
        }
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'REDUCE_IN') {
        return badRequest(res, 'To reduce balance, add an expense or transfer — cannot lower In directly')
      }
      throw error
    }

    await row.reload()
    const totals = await totalsByLedgerIds([row.id])
    res.json(summarize(row, totals.get(row.id) ?? emptyTotals()))
  }),
)

ledgersRouter.post(
  '/:id/return',
  asyncHandler(async (req, res) => {
    const row = await Ledger.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Ledger entry not found')
    if (row.status === 'closed') return badRequest(res, 'Ledger entry is already closed')

    const parsed = returnSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message ?? parsed.error.message)

    const totals = (await totalsByLedgerIds([row.id])).get(row.id) ?? emptyTotals()
    if (parsed.data.amount > totals.balance + 0.01) {
      return badRequest(res, `Return cannot exceed remaining balance ${totals.balance}`)
    }

    const returnDate = parsed.data.date ?? row.date
    await sequelize.transaction(async (t) => {
      await createLedgerOut(row, {
        amount: parsed.data.amount,
        date: returnDate,
        notes: 'Returned to owner',
        transaction: t,
      })
      const nextReturned = roundMoney(totals.returnedAmount + parsed.data.amount)
      const nextBalance = roundMoney(totals.amount - totals.spent - nextReturned)
      const shouldClose = parsed.data.close || nextBalance <= 0.01
      await row.update(
        {
          returnedAmount: nextReturned,
          status: shouldClose ? 'closed' : 'open',
          closedDate: shouldClose ? returnDate : null,
        },
        { transaction: t },
      )
    })

    await row.reload()
    const next = await totalsByLedgerIds([row.id])
    res.json(summarize(row, next.get(row.id) ?? emptyTotals()))
  }),
)

ledgersRouter.post(
  '/:id/transfer',
  asyncHandler(async (req, res) => {
    const from = await Ledger.findByPk(routeParam(req, 'id'))
    if (!from) return notFound(res, 'Ledger entry not found')
    if (from.status === 'closed') return badRequest(res, 'Cannot transfer from a closed entry')

    const parsed = transferSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message ?? parsed.error.message)

    if (parsed.data.toLedgerId && parsed.data.toLedgerId === from.id) {
      return badRequest(res, 'Cannot transfer to the same ledger')
    }

    const fromTotals = (await totalsByLedgerIds([from.id])).get(from.id) ?? emptyTotals()
    if (parsed.data.amount > fromTotals.balance + 0.01) {
      return badRequest(res, `Transfer cannot exceed remaining balance ${fromTotals.balance}`)
    }

    const transferDate = parsed.data.date ?? from.date
    const note = parsed.data.notes?.trim() || ''

    let to = parsed.data.toLedgerId ? await Ledger.findByPk(parsed.data.toLedgerId) : null
    if (parsed.data.toLedgerId) {
      if (!to) return badRequest(res, 'Destination ledger not found')
      if (to.quarryId !== from.quarryId) return badRequest(res, 'Destination ledger is on a different quarry')
      if (to.status === 'closed') return badRequest(res, 'Destination ledger is closed')
    }

    if (parsed.data.toPersonId) {
      const staff = await Staff.findByPk(parsed.data.toPersonId)
      if (!staff) return badRequest(res, 'Invalid personId')
    }

    const result = await sequelize.transaction(async (t) => {
      const nextFromReturned = roundMoney(fromTotals.returnedAmount + parsed.data.amount)
      const nextFromBal = roundMoney(fromTotals.amount - fromTotals.spent - nextFromReturned)
      const shouldClose = parsed.data.close || nextFromBal <= 0.01

      await createLedgerOut(from, {
        amount: parsed.data.amount,
        date: transferDate,
        notes: note || `Transfer to ${to?.holderName ?? parsed.data.toHolderName}`,
        transaction: t,
      })

      await from.update(
        {
          returnedAmount: nextFromReturned,
          status: shouldClose ? 'closed' : 'open',
          closedDate: shouldClose ? transferDate : null,
        },
        { transaction: t },
      )

      let createdNew = false
      if (!to) {
        const holderName = parsed.data.toHolderName!.trim()
        const openRows = await Ledger.findAll({
          where: { quarryId: from.quarryId, status: 'open' },
          transaction: t,
        })
        to =
          openRows.find((row) => normalizeHolder(row.holderName) === normalizeHolder(holderName)) ?? null

        if (!to) {
          to = await Ledger.create(
            {
              id: newId('ldg'),
              quarryId: from.quarryId,
              holderName,
              personId: parsed.data.toPersonId ?? null,
              date: transferDate,
              amount: parsed.data.amount,
              notes: note || `Transfer from ${from.holderName}`,
              status: 'open',
              returnedAmount: 0,
              closedDate: null,
            },
            { transaction: t },
          )
          createdNew = true
        } else {
          await to.update(
            { amount: roundMoney((Number(to.amount) || 0) + parsed.data.amount) },
            { transaction: t },
          )
        }
      } else {
        await to.update(
          { amount: roundMoney((Number(to.amount) || 0) + parsed.data.amount) },
          { transaction: t },
        )
      }

      await createLedgerIn(to, {
        amount: parsed.data.amount,
        date: transferDate,
        notes: note || `Transfer from ${from.holderName}`,
        transaction: t,
      })

      return { to, createdNew }
    })

    const totals = await totalsByLedgerIds([from.id, result.to.id])
    res.status(201).json({
      from: summarize(from, totals.get(from.id) ?? emptyTotals()),
      to: summarize(result.to, totals.get(result.to.id) ?? emptyTotals()),
      createdNew: result.createdNew,
    })
  }),
)

ledgersRouter.post(
  '/:id/close',
  asyncHandler(async (req, res) => {
    const row = await Ledger.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Ledger entry not found')

    const parsed = closeSchema.safeParse(req.body ?? {})
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message ?? parsed.error.message)

    const totals = (await totalsByLedgerIds([row.id])).get(row.id) ?? emptyTotals()
    const returnedAmount =
      parsed.data.returnedAmount != null ? roundMoney(parsed.data.returnedAmount) : totals.returnedAmount

    if (returnedAmount > totals.amount - totals.spent + 0.01) {
      return badRequest(res, 'Out amount cannot exceed given minus spent')
    }

    await row.update({
      returnedAmount,
      status: 'closed',
      closedDate: parsed.data.date ?? new Date().toISOString().slice(0, 10),
    })

    const next = await totalsByLedgerIds([row.id])
    res.json(summarize(row, next.get(row.id) ?? emptyTotals()))
  }),
)

ledgersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Ledger.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Ledger entry not found')

    const linked = await Transaction.findAll({
      where: {
        ledgerId: row.id,
        head: { [Op.notIn]: LEGACY_LEDGER_HEADS },
      },
      attributes: ['id', 'head', 'type'],
    })
    const expenseCount = linked.filter((item) => item.type === 'Debit' && isLedgerExpenseHead(item.head)).length
    if (expenseCount > 0) {
      return badRequest(res, `Cannot delete: ${expenseCount} expense(s) linked. Unlink or close instead.`)
    }

    await sequelize.transaction(async (t) => {
      await Transaction.destroy({
        where: {
          ledgerId: row.id,
          head: { [Op.in]: [LEDGER_IN_HEAD, LEDGER_OUT_HEAD, ...LEGACY_LEDGER_HEADS] },
        },
        transaction: t,
      })
      await row.destroy({ transaction: t })
    })
    res.status(204).send()
  }),
)
