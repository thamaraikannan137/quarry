import { Op, col, fn, where as sqlWhere, type WhereOptions } from 'sequelize'
import { Router } from 'express'
import { z } from 'zod'

import { Quarry, Transaction, Vendor } from '../db/models/index.js'
import { asyncHandler, badRequest, notFound, routeParam } from '../lib/http.js'

export const vendorsRouter = Router()

const vendorSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().optional().default(''),
  billingAddress: z.string().optional().default(''),
  openingBalance: z.number().optional().default(0),
  notes: z.string().optional().default(''),
  quarryId: z.string().min(1),
})

function toVendor(row: Vendor) {
  const json = row.toJSON()
  return {
    ...json,
    type: 'Vendor' as const,
    email: '',
    gstin: '—',
    gstType: 'Unregistered/Consumer',
    state: '',
    shippingAddress: '',
    asOf: '',
    creditLimit: 0,
    contact: '',
    quarryIds: [json.quarryId],
  }
}

async function findDuplicateVendor(quarryId: string, name: string, excludeId?: string) {
  const trimmed = name.trim()
  if (!trimmed) return null
  const filters: WhereOptions[] = [
    { quarryId },
    sqlWhere(fn('lower', col('name')), trimmed.toLowerCase()),
  ]
  if (excludeId) filters.push({ id: { [Op.ne]: excludeId } })
  return Vendor.findOne({ where: { [Op.and]: filters } })
}

vendorsRouter.get(
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
        ],
      })
    }

    const rows = await Vendor.findAll({
      where: filters.length ? { [Op.and]: filters } : undefined,
      order: [['name', 'ASC']],
    })
    res.json(rows.map(toVendor))
  }),
)

vendorsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Vendor.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Vendor not found')
    res.json(toVendor(row))
  }),
)

vendorsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = vendorSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    const quarry = await Quarry.findByPk(parsed.data.quarryId)
    if (!quarry) return badRequest(res, 'Invalid quarryId')

    const duplicate = await findDuplicateVendor(parsed.data.quarryId, parsed.data.name)
    if (duplicate) return badRequest(res, `Vendor "${duplicate.name}" already exists in this quarry`)

    const row = await Vendor.create(parsed.data)
    res.status(201).json(toVendor(row))
  }),
)

vendorsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await Vendor.findByPk(routeParam(req, 'id'))
    if (!existing) return notFound(res, 'Vendor not found')

    const parsed = vendorSchema.partial().safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    if (parsed.data.quarryId) {
      const quarry = await Quarry.findByPk(parsed.data.quarryId)
      if (!quarry) return badRequest(res, 'Invalid quarryId')
    }

    const nextName = parsed.data.name ?? existing.name
    const nextQuarryId = parsed.data.quarryId ?? existing.quarryId
    const duplicate = await findDuplicateVendor(nextQuarryId, nextName, existing.id)
    if (duplicate) return badRequest(res, `Vendor "${duplicate.name}" already exists in this quarry`)

    await existing.update(parsed.data)
    res.json(toVendor(existing))
  }),
)

vendorsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await Vendor.findByPk(routeParam(req, 'id'))
    if (!existing) return notFound(res, 'Vendor not found')

    const txnCount = await Transaction.count({ where: { partyId: existing.id } })
    if (txnCount > 0) {
      return badRequest(res, `Cannot delete: ${txnCount} transaction(s) linked to this vendor`)
    }

    await existing.destroy()
    res.status(204).send()
  }),
)
