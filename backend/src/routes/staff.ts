import { Op, type WhereOptions } from 'sequelize'
import { Router } from 'express'
import { z } from 'zod'

import { Quarry, Staff, Transaction } from '../db/models/index.js'
import { asyncHandler, badRequest, notFound, routeParam } from '../lib/http.js'

export const staffRouter = Router()

const staffSchema = z.object({
  name: z.string().min(1),
  designation: z.string().optional().default(''),
  kind: z.enum(['Staff']).optional().default('Staff'),
  basicSalary: z.number().optional().default(0),
  phone: z.string().optional().default(''),
  bankName: z.string().optional().default(''),
  accountNumber: z.string().optional().default(''),
  ifsc: z.string().optional().default(''),
  branch: z.string().optional().default(''),
  status: z.enum(['Active', 'Inactive']).optional().default('Active'),
  notes: z.string().optional().default(''),
  quarryId: z.string().min(1),
})

staffRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const quarryId = typeof req.query.quarryId === 'string' ? req.query.quarryId : undefined
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''

    const filters: WhereOptions[] = []
    if (quarryId) filters.push({ quarryId })
    filters.push({ kind: 'Staff' })
    if (status) filters.push({ status })
    if (q) {
      filters.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { designation: { [Op.iLike]: `%${q}%` } },
          { phone: { [Op.iLike]: `%${q}%` } },
        ],
      })
    }

    const rows = await Staff.findAll({
      where: filters.length ? { [Op.and]: filters } : undefined,
      order: [
        ['status', 'ASC'],
        ['name', 'ASC'],
      ],
    })
    res.json(rows)
  }),
)

staffRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Staff.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Staff not found')
    res.json(row)
  }),
)

staffRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = staffSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    const quarry = await Quarry.findByPk(parsed.data.quarryId)
    if (!quarry) return badRequest(res, 'Invalid quarryId')

    const row = await Staff.create(parsed.data)
    res.status(201).json(row)
  }),
)

staffRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await Staff.findByPk(routeParam(req, 'id'))
    if (!existing) return notFound(res, 'Staff not found')

    const parsed = staffSchema.partial().safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    if (parsed.data.quarryId) {
      const quarry = await Quarry.findByPk(parsed.data.quarryId)
      if (!quarry) return badRequest(res, 'Invalid quarryId')
    }

    await existing.update(parsed.data)
    res.json(existing)
  }),
)

staffRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await Staff.findByPk(routeParam(req, 'id'))
    if (!existing) return notFound(res, 'Staff not found')

    const txnCount = await Transaction.count({ where: { personId: existing.id } })
    if (txnCount > 0) {
      return badRequest(res, `Cannot delete: ${txnCount} salary / advance entry(ies) linked to this person`)
    }

    await existing.destroy()
    res.status(204).send()
  }),
)
