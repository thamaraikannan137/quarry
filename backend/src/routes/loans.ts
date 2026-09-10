import { UniqueConstraintError } from 'sequelize'
import { Router } from 'express'
import { z } from 'zod'

import { Loan, LoanPayment, Quarry, Transaction, sequelize } from '../db/models/index.js'
import { asyncHandler, badRequest, notFound, routeParam } from '../lib/http.js'
import { isoDateSchema } from '../lib/isoDate.js'
import { newId } from '../lib/marking.js'

export const loansRouter = Router()

const FINANCE_HEAD = 'Finance / EMI'

const daySchema = z.number().int().min(1).max(31)

const loanSchema = z.object({
  vehicleNo: z.string().trim().min(1, 'Vehicle / asset is required'),
  borrower: z.string().trim().optional().default(''),
  loanNo: z.string().trim().optional().default(''),
  bank: z.string().trim().optional().default(''),
  informDay: daySchema.optional().default(1),
  dueDay: daySchema.optional().default(5),
  emiAmount: z.number().nonnegative().optional().default(0),
  active: z.boolean().optional().default(true),
})

const paySchema = z.object({
  quarryId: z.string().min(1),
  date: isoDateSchema,
  amount: z.number().positive('Amount required'),
})

function withPayments(loan: Loan, payments: LoanPayment[]) {
  return {
    ...loan.toJSON(),
    payments: payments.map((row) => row.toJSON()),
  }
}

loansRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [loans, payments] = await Promise.all([
      Loan.findAll({
        order: [
          ['dueDay', 'ASC'],
          ['vehicleNo', 'ASC'],
        ],
      }),
      LoanPayment.findAll({
        order: [
          ['date', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      }),
    ])
    const byLoan = new Map<string, LoanPayment[]>()
    for (const pay of payments) {
      const list = byLoan.get(pay.loanId) ?? []
      list.push(pay)
      byLoan.set(pay.loanId, list)
    }
    res.json(loans.map((loan) => withPayments(loan, byLoan.get(loan.id) ?? [])))
  }),
)

loansRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const loan = await Loan.findByPk(routeParam(req, 'id'))
    if (!loan) return notFound(res, 'Loan not found')
    const payments = await LoanPayment.findAll({
      where: { loanId: loan.id },
      order: [
        ['date', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    })
    res.json(withPayments(loan, payments))
  }),
)

loansRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = loanSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message ?? parsed.error.message)
    const loan = await Loan.create(parsed.data)
    res.status(201).json(withPayments(loan, []))
  }),
)

loansRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const loan = await Loan.findByPk(routeParam(req, 'id'))
    if (!loan) return notFound(res, 'Loan not found')
    const parsed = loanSchema.partial().safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message ?? parsed.error.message)
    await loan.update(parsed.data)
    const payments = await LoanPayment.findAll({
      where: { loanId: loan.id },
      order: [
        ['date', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    })
    res.json(withPayments(loan, payments))
  }),
)

loansRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const loan = await Loan.findByPk(routeParam(req, 'id'))
    if (!loan) return notFound(res, 'Loan not found')
    const paid = await LoanPayment.count({ where: { loanId: loan.id } })
    if (paid > 0) {
      return badRequest(res, `Cannot delete: ${paid} EMI payment(s) recorded. Mark the loan inactive instead.`)
    }
    await loan.destroy()
    res.status(204).send()
  }),
)

loansRouter.post(
  '/:id/pay',
  asyncHandler(async (req, res) => {
    const loan = await Loan.findByPk(routeParam(req, 'id'))
    if (!loan) return notFound(res, 'Loan not found')

    const parsed = paySchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message ?? parsed.error.message)

    const quarry = await Quarry.findByPk(parsed.data.quarryId)
    if (!quarry) return badRequest(res, 'Invalid quarryId')

    const ym = parsed.data.date.slice(0, 7)
    const existing = await LoanPayment.findOne({ where: { loanId: loan.id, ym } })
    if (existing) return badRequest(res, `Already paid for ${ym}`)

    const transactionId = newId('tx')
    const paymentId = newId('lp')
    const vehicle = loan.vehicleNo
    const bank = loan.bank || '—'
    const loanNo = loan.loanNo || '—'

    try {
      const result = await sequelize.transaction(async (t) => {
        const txn = await Transaction.create(
          {
            id: transactionId,
            quarryId: parsed.data.quarryId,
            date: parsed.data.date,
            type: 'Debit',
            head: FINANCE_HEAD,
            particulars: `EMI — ${vehicle} · ${bank} · ${loanNo}`,
            debit: parsed.data.amount,
            credit: 0,
            refNote: vehicle,
            loanId: loan.id,
          },
          { transaction: t },
        )
        const payment = await LoanPayment.create(
          {
            id: paymentId,
            loanId: loan.id,
            quarryId: parsed.data.quarryId,
            ym,
            date: parsed.data.date,
            amount: parsed.data.amount,
            transactionId: txn.id,
          },
          { transaction: t },
        )
        return { payment, transaction: txn }
      })
      res.status(201).json({
        payment: result.payment.toJSON(),
        transaction: result.transaction.toJSON(),
      })
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return badRequest(res, `Already paid for ${ym}`)
      }
      throw error
    }
  }),
)

loansRouter.delete(
  '/:id/payments/:paymentId',
  asyncHandler(async (req, res) => {
    const loan = await Loan.findByPk(routeParam(req, 'id'))
    if (!loan) return notFound(res, 'Loan not found')
    const payment = await LoanPayment.findByPk(routeParam(req, 'paymentId'))
    if (!payment || payment.loanId !== loan.id) return notFound(res, 'Payment not found')

    await sequelize.transaction(async (t) => {
      await payment.destroy({ transaction: t })
      await Transaction.destroy({ where: { id: payment.transactionId }, transaction: t })
    })
    res.status(204).send()
  }),
)
