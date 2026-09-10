import { Router } from 'express'
import { z } from 'zod'

import { BlockMarking, Ledger, Customer, LoanPayment, Quarry, Transaction, Vendor } from '../db/models/index.js'
import { asyncHandler, badRequest, notFound, routeParam } from '../lib/http.js'
import { isoDateSchema } from '../lib/isoDate.js'

export const transactionsRouter = Router()

const voucherSchema = z.object({
  quarryId: z.string().min(1),
  date: isoDateSchema,
  type: z.enum(['Debit', 'Credit']),
  head: z.string().min(1),
  particulars: z.string().trim().min(1, 'Description is required'),
  amount: z.number().positive().optional(),
  debit: z.number().nonnegative().optional(),
  credit: z.number().nonnegative().optional(),
  partyId: z.string().optional().nullable(),
  personId: z.string().optional().nullable(),
  labourId: z.string().optional().nullable(),
  litres: z.number().optional().nullable(),
  refNote: z.string().optional().nullable(),
  markingBatchId: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  ledgerId: z.string().optional().nullable(),
})

function resolveAmounts(data: z.infer<typeof voucherSchema>) {
  if (data.amount != null) {
    return data.type === 'Credit'
      ? { debit: 0, credit: data.amount }
      : { debit: data.amount, credit: 0 }
  }
  const debit = data.debit ?? 0
  const credit = data.credit ?? 0
  if (debit <= 0 && credit <= 0) throw new Error('Amount required')
  return { debit, credit }
}

async function assertPartyId(partyId: string | null | undefined) {
  if (!partyId) return true
  const customer = await Customer.findByPk(partyId)
  if (customer) return true
  const vendor = await Vendor.findByPk(partyId)
  return Boolean(vendor)
}

transactionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const quarryId = typeof req.query.quarryId === 'string' ? req.query.quarryId : undefined
    const partyId = typeof req.query.partyId === 'string' ? req.query.partyId : undefined
    const markingBatchId =
      typeof req.query.markingBatchId === 'string' ? req.query.markingBatchId : undefined
    const head = typeof req.query.head === 'string' ? req.query.head : undefined
    const type = typeof req.query.type === 'string' ? req.query.type : undefined
    const ledgerId = typeof req.query.ledgerId === 'string' ? req.query.ledgerId : undefined

    const where: Record<string, string> = {}
    if (quarryId) where.quarryId = quarryId
    if (partyId) where.partyId = partyId
    if (markingBatchId) where.markingBatchId = markingBatchId
    if (head) where.head = head
    if (type) where.type = type
    if (ledgerId) where.ledgerId = ledgerId

    const rows = await Transaction.findAll({
      where,
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    })
    res.json(rows)
  }),
)

transactionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Transaction.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Transaction not found')
    res.json(row)
  }),
)

transactionsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = voucherSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    let amounts: { debit: number; credit: number }
    try {
      amounts = resolveAmounts(parsed.data)
    } catch (e) {
      return badRequest(res, e instanceof Error ? e.message : 'Invalid amount')
    }

    const quarry = await Quarry.findByPk(parsed.data.quarryId)
    if (!quarry) return badRequest(res, 'Invalid quarryId')

    if (parsed.data.partyId) {
      if (!(await assertPartyId(parsed.data.partyId))) return badRequest(res, 'Invalid partyId')
    }

    if (parsed.data.markingBatchId) {
      const count = await BlockMarking.count({
        where: { batchId: parsed.data.markingBatchId },
      })
      if (!count) return badRequest(res, 'Invalid markingBatchId')
    }

    if (parsed.data.ledgerId) {
      const ledger = await Ledger.findByPk(parsed.data.ledgerId)
      if (!ledger) return badRequest(res, 'Invalid ledgerId')
      if (ledger.quarryId !== parsed.data.quarryId) {
        return badRequest(res, 'Ledger entry belongs to a different quarry')
      }
    }

    const row = await Transaction.create({
      quarryId: parsed.data.quarryId,
      date: parsed.data.date,
      type: parsed.data.type,
      head: parsed.data.head,
      particulars: parsed.data.particulars,
      debit: amounts.debit,
      credit: amounts.credit,
      partyId: parsed.data.partyId ?? null,
      personId: parsed.data.personId ?? null,
      labourId: parsed.data.labourId ?? null,
      litres: parsed.data.litres ?? null,
      refNote: parsed.data.refNote ?? null,
      markingBatchId: parsed.data.markingBatchId ?? null,
      paymentMethod: parsed.data.paymentMethod ?? null,
      ledgerId: parsed.data.ledgerId ?? null,
    })
    res.status(201).json(row)
  }),
)

transactionsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await Transaction.findByPk(routeParam(req, 'id'))
    if (!existing) return notFound(res, 'Transaction not found')

    const parsed = voucherSchema
      .partial()
      .extend({
        quarryId: z.string().min(1).optional(),
        date: isoDateSchema.optional(),
        type: z.enum(['Debit', 'Credit']).optional(),
        head: z.string().min(1).optional(),
      })
      .safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    const type = parsed.data.type ?? (existing.type as 'Debit' | 'Credit')
    let amounts = { debit: existing.debit, credit: existing.credit }
    if (parsed.data.amount != null || parsed.data.debit != null || parsed.data.credit != null) {
      try {
        amounts = resolveAmounts({
          quarryId: parsed.data.quarryId ?? existing.quarryId,
          date: parsed.data.date ?? existing.date,
          type,
          head: parsed.data.head ?? existing.head,
          particulars: parsed.data.particulars ?? existing.particulars,
          amount: parsed.data.amount,
          debit: parsed.data.debit,
          credit: parsed.data.credit,
        })
      } catch (e) {
        return badRequest(res, e instanceof Error ? e.message : 'Invalid amount')
      }
    }

    if (parsed.data.partyId) {
      if (!(await assertPartyId(parsed.data.partyId))) return badRequest(res, 'Invalid partyId')
    }

    if (parsed.data.ledgerId) {
      const ledger = await Ledger.findByPk(parsed.data.ledgerId)
      if (!ledger) return badRequest(res, 'Invalid ledgerId')
      const quarryId = parsed.data.quarryId ?? existing.quarryId
      if (ledger.quarryId !== quarryId) {
        return badRequest(res, 'Ledger entry belongs to a different quarry')
      }
    }

    await existing.update({
      quarryId: parsed.data.quarryId,
      date: parsed.data.date,
      type: parsed.data.type,
      head: parsed.data.head,
      particulars: parsed.data.particulars,
      debit: amounts.debit,
      credit: amounts.credit,
      partyId: parsed.data.partyId === undefined ? undefined : parsed.data.partyId,
      personId: parsed.data.personId === undefined ? undefined : parsed.data.personId,
      labourId: parsed.data.labourId === undefined ? undefined : parsed.data.labourId,
      litres: parsed.data.litres === undefined ? undefined : parsed.data.litres,
      refNote: parsed.data.refNote === undefined ? undefined : parsed.data.refNote,
      markingBatchId: parsed.data.markingBatchId === undefined ? undefined : parsed.data.markingBatchId,
      paymentMethod: parsed.data.paymentMethod === undefined ? undefined : parsed.data.paymentMethod,
      ledgerId: parsed.data.ledgerId === undefined ? undefined : parsed.data.ledgerId,
    })
    res.json(existing)
  }),
)

transactionsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await Transaction.findByPk(routeParam(req, 'id'))
    if (!existing) return notFound(res, 'Transaction not found')
    await LoanPayment.destroy({ where: { transactionId: existing.id } })
    await existing.destroy()
    res.status(204).send()
  }),
)
