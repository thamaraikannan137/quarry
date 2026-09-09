import { Op, col, fn, where as sqlWhere, type WhereOptions } from 'sequelize'
import { Router } from 'express'
import { z } from 'zod'

import { BlockMarking, Customer, Quarry, Transaction } from '../db/models/index.js'
import { asyncHandler, badRequest, notFound, routeParam } from '../lib/http.js'
import { optionalIsoDateSchema } from '../lib/isoDate.js'

export const customersRouter = Router()

const customerSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  gstin: z.string().optional().default(''),
  gstType: z.string().optional().default('Unregistered/Consumer'),
  state: z.string().optional().default('Tamil Nadu'),
  billingAddress: z.string().optional().default(''),
  shippingAddress: z.string().optional().default(''),
  openingBalance: z.number().optional().default(0),
  asOf: optionalIsoDateSchema,
  creditLimit: z.number().optional().default(0),
  contact: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  quarryId: z.string().min(1),
})

function toCustomer(row: Customer) {
  const json = row.toJSON()
  return { ...json, type: 'Customer' as const, asOf: json.asOf ?? '', quarryIds: [json.quarryId] }
}

async function findDuplicateCustomer(quarryId: string, name: string, excludeId?: string) {
  const trimmed = name.trim()
  if (!trimmed) return null
  const filters: WhereOptions[] = [
    { quarryId },
    sqlWhere(fn('lower', col('name')), trimmed.toLowerCase()),
  ]
  if (excludeId) filters.push({ id: { [Op.ne]: excludeId } })
  return Customer.findOne({ where: { [Op.and]: filters } })
}

customersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const quarryId = typeof req.query.quarryId === 'string' ? req.query.quarryId : undefined
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''

    const filters: WhereOptions[] = []
    if (quarryId) filters.push({ quarryId })
    if (q) {
      filters.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { phone: { [Op.iLike]: `%${q}%` } },
          { contact: { [Op.iLike]: `%${q}%` } },
        ],
      })
    }

    const rows = await Customer.findAll({
      where: filters.length ? { [Op.and]: filters } : undefined,
      order: [['name', 'ASC']],
    })
    res.json(rows.map(toCustomer))
  }),
)

customersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Customer.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Customer not found')
    res.json(toCustomer(row))
  }),
)

customersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = customerSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    const quarry = await Quarry.findByPk(parsed.data.quarryId)
    if (!quarry) return badRequest(res, 'Invalid quarryId')

    const duplicate = await findDuplicateCustomer(parsed.data.quarryId, parsed.data.name)
    if (duplicate) return badRequest(res, `Customer "${duplicate.name}" already exists in this quarry`)

    const row = await Customer.create(parsed.data)
    res.status(201).json(toCustomer(row))
  }),
)

customersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await Customer.findByPk(routeParam(req, 'id'))
    if (!existing) return notFound(res, 'Customer not found')

    const parsed = customerSchema.partial().safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    if (parsed.data.quarryId) {
      const quarry = await Quarry.findByPk(parsed.data.quarryId)
      if (!quarry) return badRequest(res, 'Invalid quarryId')
    }

    const nextName = parsed.data.name ?? existing.name
    const nextQuarryId = parsed.data.quarryId ?? existing.quarryId
    const duplicate = await findDuplicateCustomer(nextQuarryId, nextName, existing.id)
    if (duplicate) return badRequest(res, `Customer "${duplicate.name}" already exists in this quarry`)

    await existing.update(parsed.data)
    res.json(toCustomer(existing))
  }),
)

customersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await Customer.findByPk(routeParam(req, 'id'))
    if (!existing) return notFound(res, 'Customer not found')

    const markingCount = await BlockMarking.count({ where: { partyId: existing.id } })
    if (markingCount > 0) {
      return badRequest(res, `Cannot delete: ${markingCount} marking(s) linked to this customer`)
    }
    const txnCount = await Transaction.count({ where: { partyId: existing.id } })
    if (txnCount > 0) {
      return badRequest(res, `Cannot delete: ${txnCount} transaction(s) linked to this customer`)
    }

    await existing.destroy()
    res.status(204).send()
  }),
)
