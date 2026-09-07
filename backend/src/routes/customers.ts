import { Op, type WhereOptions } from 'sequelize'
import { Router } from 'express'
import { z } from 'zod'

import { BlockMarking, Party, Quarry } from '../db/models/index.js'
import { asyncHandler, badRequest, notFound, routeParam } from '../lib/http.js'

export const customersRouter = Router()

const partySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['Customer', 'Vendor', 'Both']).default('Customer'),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  gstin: z.string().optional().default(''),
  gstType: z.string().optional().default('Unregistered/Consumer'),
  state: z.string().optional().default('Tamil Nadu'),
  billingAddress: z.string().optional().default(''),
  shippingAddress: z.string().optional().default(''),
  openingBalance: z.number().optional().default(0),
  asOf: z.string().optional().default(''),
  creditLimit: z.number().optional().default(0),
  contact: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  quarryId: z.string().min(1),
})

function toCustomer(row: Party) {
  const json = row.toJSON()
  return { ...json, quarryIds: [json.quarryId] }
}

customersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const quarryId = typeof req.query.quarryId === 'string' ? req.query.quarryId : undefined
    const type = typeof req.query.type === 'string' ? req.query.type : undefined
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''

    const filters: WhereOptions[] = []
    if (quarryId) filters.push({ quarryId })

    if (type === 'Customer') {
      filters.push({ type: { [Op.in]: ['Customer', 'Both'] } })
    } else if (type === 'Vendor') {
      filters.push({ type: { [Op.in]: ['Vendor', 'Both'] } })
    } else if (type) {
      filters.push({ type })
    }

    if (q) {
      filters.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { phone: { [Op.iLike]: `%${q}%` } },
          { contact: { [Op.iLike]: `%${q}%` } },
        ],
      })
    }

    const rows = await Party.findAll({
      where: filters.length ? { [Op.and]: filters } : undefined,
      order: [['name', 'ASC']],
    })

    res.json(rows.map(toCustomer))
  }),
)

customersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Party.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Customer not found')
    res.json(toCustomer(row))
  }),
)

customersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = partySchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    const quarry = await Quarry.findByPk(parsed.data.quarryId)
    if (!quarry) return badRequest(res, 'Invalid quarryId')

    const row = await Party.create(parsed.data)
    res.status(201).json(toCustomer(row))
  }),
)

customersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await Party.findByPk(routeParam(req, 'id'))
    if (!existing) return notFound(res, 'Customer not found')

    const parsed = partySchema.partial().safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    if (parsed.data.quarryId) {
      const quarry = await Quarry.findByPk(parsed.data.quarryId)
      if (!quarry) return badRequest(res, 'Invalid quarryId')
    }

    await existing.update(parsed.data)
    res.json(toCustomer(existing))
  }),
)

customersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await Party.findByPk(routeParam(req, 'id'))
    if (!existing) return notFound(res, 'Customer not found')

    const markingCount = await BlockMarking.count({ where: { partyId: existing.id } })
    if (markingCount > 0) {
      return badRequest(res, `Cannot delete: ${markingCount} marking(s) linked to this party`)
    }

    await existing.destroy()
    res.status(204).send()
  }),
)
