import { Router } from 'express'
import { z } from 'zod'

import { Quarry } from '../db/models/index.js'
import { asyncHandler, badRequest, notFound, routeParam } from '../lib/http.js'

export const quarriesRouter = Router()

quarriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await Quarry.findAll({ order: [['name', 'ASC']] })
    res.json(rows)
  }),
)

quarriesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Quarry.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Quarry not found')
    res.json(row)
  }),
)

const quarrySchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  code: z.string().min(1),
  place: z.string().optional().nullable(),
  gstPct: z.number().nonnegative().max(100).optional(),
})

const quarryPatchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  place: z.string().optional().nullable(),
  gstPct: z.number().nonnegative().max(100).optional(),
})

quarriesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = quarrySchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)
    const id = parsed.data.id ?? `q_${parsed.data.code.toLowerCase()}`
    const row = await Quarry.create({
      id,
      name: parsed.data.name,
      code: parsed.data.code,
      place: parsed.data.place ?? null,
      gstPct: parsed.data.gstPct ?? 18,
    })
    res.status(201).json(row)
  }),
)

quarriesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Quarry.findByPk(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Quarry not found')
    const parsed = quarryPatchSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)
    if (Object.keys(parsed.data).length === 0) return badRequest(res, 'No fields to update')
    await row.update(parsed.data)
    res.json(row)
  }),
)
