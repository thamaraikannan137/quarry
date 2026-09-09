import { Op } from 'sequelize'
import { Router } from 'express'
import { z } from 'zod'

import {
  BlockMarking,
  DispatchTrip,
  DispatchTripBlock,
  Customer,
  Quarry,
  sequelize,
} from '../db/models/index.js'
import { asyncHandler, badRequest, notFound, routeParam } from '../lib/http.js'
import { isoDateSchema } from '../lib/isoDate.js'
import { newId, volCbm } from '../lib/marking.js'

export const loadsRouter = Router()

const tripSchema = z.object({
  date: isoDateSchema,
  quarryId: z.string().min(1),
  lorryNo: z.string().min(1),
  fromLocation: z.string().min(1),
  toLocation: z.string().min(1),
  blockIds: z.array(z.string().min(1)).min(1),
  notes: z.string().optional().nullable(),
  loadNo: z.string().optional(),
})

async function nextLoadNo(quarryId: string) {
  const count = await DispatchTrip.count({ where: { quarryId } })
  return `LD-${String(count + 1).padStart(3, '0')}`
}

async function serializeTrip(tripId: string) {
  const trip = await DispatchTrip.findByPk(tripId, {
    include: [
      {
        model: DispatchTripBlock,
        as: 'blocks',
        include: [
          {
            model: BlockMarking,
            as: 'block',
            include: [{ model: Customer, as: 'party', attributes: ['id', 'name'] }],
          },
        ],
      },
    ],
  })
  if (!trip) return null

  const joinRows = trip.blocks ?? []
  const blockIds = joinRows.map((b) => b.blockId)
  const blocks = joinRows.flatMap((row) => {
    const b = row.block
    if (!b) return []
    return [
      {
        id: b.id,
        batchId: b.batchId,
        blockNo: b.blockNo,
        partyId: b.partyId,
        partyName: b.party?.name ?? '',
        date: b.date,
        choice: b.choice,
        l: b.l,
        w: b.w,
        h: b.h,
        cbm: volCbm(b.l, b.w, b.h),
      },
    ]
  })

  return {
    id: trip.id,
    loadNo: trip.loadNo,
    quarryId: trip.quarryId,
    date: trip.date,
    lorryNo: trip.lorryNo,
    fromLocation: trip.fromLocation,
    toLocation: trip.toLocation,
    notes: trip.notes,
    blockIds,
    blocks,
    blockCount: blocks.length,
    cbm: blocks.reduce((s, b) => s + b.cbm, 0),
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  }
}

loadsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const quarryId = typeof req.query.quarryId === 'string' ? req.query.quarryId : undefined
    const trips = await DispatchTrip.findAll({
      where: quarryId ? { quarryId } : undefined,
      order: [
        ['date', 'DESC'],
        ['loadNo', 'DESC'],
      ],
      attributes: ['id'],
    })
    const rows = []
    for (const t of trips) {
      const full = await serializeTrip(t.id)
      if (full) rows.push(full)
    }
    res.json(rows)
  }),
)

loadsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await serializeTrip(routeParam(req, 'id'))
    if (!row) return notFound(res, 'Load not found')
    res.json(row)
  }),
)

loadsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = tripSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    const { quarryId, date, lorryNo, fromLocation, toLocation, blockIds, notes } = parsed.data
    const uniqueBlockIds = [...new Set(blockIds)]

    const quarry = await Quarry.findByPk(quarryId)
    if (!quarry) return badRequest(res, 'Invalid quarryId')

    const blocks = await BlockMarking.findAll({ where: { id: { [Op.in]: uniqueBlockIds } } })
    if (blocks.length !== uniqueBlockIds.length) return badRequest(res, 'One or more blockIds are invalid')
    if (blocks.some((b) => b.quarryId !== quarryId)) {
      return badRequest(res, 'All blocks must belong to the same quarry')
    }

    const alreadyLoaded = await DispatchTripBlock.findAll({
      where: { blockId: { [Op.in]: uniqueBlockIds } },
    })
    if (alreadyLoaded.length) {
      return badRequest(res, `Block(s) already on a load: ${alreadyLoaded.map((r) => r.blockId).join(', ')}`)
    }

    const loadNo = parsed.data.loadNo?.trim() || (await nextLoadNo(quarryId))
    const id = newId('ld')

    await sequelize.transaction(async (t) => {
      await DispatchTrip.create(
        {
          id,
          loadNo,
          quarryId,
          date,
          lorryNo,
          fromLocation,
          toLocation,
          notes: notes ?? null,
        },
        { transaction: t },
      )
      await DispatchTripBlock.bulkCreate(
        uniqueBlockIds.map((blockId) => ({ tripId: id, blockId })),
        { transaction: t },
      )
    })

    const row = await serializeTrip(id)
    res.status(201).json(row)
  }),
)

loadsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await DispatchTrip.findByPk(routeParam(req, 'id'))
    if (!existing) return notFound(res, 'Load not found')

    const parsed = tripSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    const { quarryId, date, lorryNo, fromLocation, toLocation, blockIds, notes } = parsed.data
    const uniqueBlockIds = [...new Set(blockIds)]

    if (quarryId !== existing.quarryId) return badRequest(res, 'Cannot change quarry on a load')

    const blocks = await BlockMarking.findAll({ where: { id: { [Op.in]: uniqueBlockIds } } })
    if (blocks.length !== uniqueBlockIds.length) return badRequest(res, 'One or more blockIds are invalid')
    if (blocks.some((b) => b.quarryId !== quarryId)) {
      return badRequest(res, 'All blocks must belong to the same quarry')
    }

    const conflict = await DispatchTripBlock.findAll({
      where: {
        blockId: { [Op.in]: uniqueBlockIds },
        tripId: { [Op.ne]: existing.id },
      },
    })
    if (conflict.length) {
      return badRequest(res, `Block(s) already on another load: ${conflict.map((r) => r.blockId).join(', ')}`)
    }

    await sequelize.transaction(async (t) => {
      await DispatchTripBlock.destroy({ where: { tripId: existing.id }, transaction: t })
      await existing.update(
        {
          date,
          lorryNo,
          fromLocation,
          toLocation,
          notes: notes ?? null,
          ...(parsed.data.loadNo ? { loadNo: parsed.data.loadNo } : {}),
        },
        { transaction: t },
      )
      await DispatchTripBlock.bulkCreate(
        uniqueBlockIds.map((blockId) => ({ tripId: existing.id, blockId })),
        { transaction: t },
      )
    })

    const row = await serializeTrip(existing.id)
    res.json(row)
  }),
)

loadsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await DispatchTrip.findByPk(routeParam(req, 'id'))
    if (!existing) return notFound(res, 'Load not found')
    await sequelize.transaction(async (t) => {
      await DispatchTripBlock.destroy({ where: { tripId: existing.id }, transaction: t })
      await existing.destroy({ transaction: t })
    })
    res.status(204).send()
  }),
)
