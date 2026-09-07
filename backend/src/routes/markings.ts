import { Op } from 'sequelize'
import { Router } from 'express'
import { z } from 'zod'

import {
  BlockMarking,
  DispatchTripBlock,
  Party,
  sequelize,
} from '../db/models/index.js'
import { asyncHandler, badRequest, notFound, routeParam } from '../lib/http.js'
import { isoDateSchema } from '../lib/isoDate.js'
import { markGross, markGstAmt, markTotal, newId, volCbm } from '../lib/marking.js'
import { nextMarkingNo } from '../lib/markingNo.js'

export const markingsRouter = Router()

const gstTypeSchema = z.enum(['none', 'intra', 'igst', 'gst'])

const lineSchema = z.object({
  id: z.string().optional(),
  blockNo: z.string().min(1),
  choice: z.string().default('I'),
  l: z.number().positive(),
  w: z.number().positive(),
  h: z.number().positive(),
  rate: z.number().nonnegative(),
  gstPct: z.number().nonnegative().default(18),
  gstType: gstTypeSchema.default('intra'),
  markerName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const batchSchema = z.object({
  date: isoDateSchema,
  partyId: z.string().min(1),
  quarryId: z.string().min(1),
  markerName: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
})

function serializeBlock(block: BlockMarking) {
  const loads = block.loads ?? []
  const cbm = volCbm(block.l, block.w, block.h)
  const gross = markGross(block.l, block.w, block.h, block.rate)
  const gstAmt = markGstAmt(block.l, block.w, block.h, block.rate, block.gstPct)
  const total = markTotal(block.l, block.w, block.h, block.rate, block.gstPct)
  const loadOk = loads.length > 0
  return {
    id: block.id,
    batchId: block.batchId,
    markingNo: block.markingNo,
    quarryId: block.quarryId,
    partyId: block.partyId,
    date: block.date,
    blockNo: block.blockNo,
    choice: block.choice,
    l: block.l,
    w: block.w,
    h: block.h,
    rate: block.rate,
    gstPct: block.gstPct,
    gstType: block.gstType || (block.gstPct > 0 ? 'intra' : 'none'),
    markerName: block.markerName,
    notes: block.notes,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
    loads: loads.map((row) => ({ tripId: row.tripId })),
    cbm,
    gross,
    gstAmt,
    total,
    load: loadOk ? 'OK' : 'Pending',
    tripId: loads[0]?.tripId ?? null,
  }
}

function summarizeBatch(batchId: string, blocks: ReturnType<typeof serializeBlock>[]) {
  const first = blocks[0]
  return {
    batchId,
    markingNo: first.markingNo ?? undefined,
    quarryId: first.quarryId,
    date: first.date,
    partyId: first.partyId,
    markerName: first.markerName ?? undefined,
    blockCount: blocks.length,
    cbm: blocks.reduce((s, b) => s + b.cbm, 0),
    gross: blocks.reduce((s, b) => s + b.gross, 0),
    gstAmt: blocks.reduce((s, b) => s + b.gstAmt, 0),
    total: blocks.reduce((s, b) => s + b.total, 0),
    loadOk: blocks.filter((b) => b.load === 'OK').length,
    loadPending: blocks.filter((b) => b.load === 'Pending').length,
    blocks,
  }
}

async function findBatchBlocks(batchId: string) {
  return BlockMarking.findAll({
    where: { batchId },
    include: [
      { model: DispatchTripBlock, as: 'loads', attributes: ['tripId'] },
      { model: Party, as: 'party' },
    ],
    order: [['blockNo', 'ASC']],
  })
}

markingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const quarryId = typeof req.query.quarryId === 'string' ? req.query.quarryId : undefined
    const partyId = typeof req.query.partyId === 'string' ? req.query.partyId : undefined
    const asBatches = req.query.as !== 'blocks'

    const where: Record<string, string> = {}
    if (quarryId) where.quarryId = quarryId
    if (partyId) where.partyId = partyId

    const blocks = await BlockMarking.findAll({
      where,
      include: [{ model: DispatchTripBlock, as: 'loads', attributes: ['tripId'] }],
      order: [
        ['date', 'DESC'],
        ['batchId', 'DESC'],
        ['blockNo', 'ASC'],
      ],
    })

    const serialized = blocks.map(serializeBlock)
    if (!asBatches) {
      res.json(serialized)
      return
    }

    const byBatch = new Map<string, ReturnType<typeof serializeBlock>[]>()
    for (const block of serialized) {
      const list = byBatch.get(block.batchId) ?? []
      list.push(block)
      byBatch.set(block.batchId, list)
    }

    res.json([...byBatch.entries()].map(([batchId, rows]) => summarizeBatch(batchId, rows)))
  }),
)

markingsRouter.get(
  '/:batchId',
  asyncHandler(async (req, res) => {
    const batchId = routeParam(req, 'batchId')
    const blocks = await findBatchBlocks(batchId)
    if (!blocks.length) return notFound(res, 'Marking batch not found')
    const serialized = blocks.map(serializeBlock)
    res.json({
      ...summarizeBatch(batchId, serialized),
      party: blocks[0].party?.toJSON() ?? null,
    })
  }),
)

markingsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = batchSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    const { date, partyId, quarryId, markerName, lines } = parsed.data
    const party = await Party.findByPk(partyId)
    if (!party) return badRequest(res, 'Invalid partyId')
    if (party.quarryId !== quarryId) return badRequest(res, 'Party does not belong to quarry')

    const batchId = newId('mb')
    const markingNo = await nextMarkingNo(quarryId)
    const created = await sequelize.transaction(async (t) => {
      const rows: BlockMarking[] = []
      for (const line of lines) {
        const row = await BlockMarking.create(
          {
            batchId,
            markingNo,
            quarryId,
            partyId,
            date,
            blockNo: line.blockNo,
            choice: line.choice,
            l: line.l,
            w: line.w,
            h: line.h,
            rate: line.rate,
            gstPct: line.gstType === 'none' ? 0 : line.gstPct,
            gstType: line.gstType,
            markerName: line.markerName ?? markerName ?? null,
            notes: line.notes ?? null,
          },
          { transaction: t },
        )
        rows.push(row)
      }
      return rows
    })

    res.status(201).json(summarizeBatch(batchId, created.map(serializeBlock)))
  }),
)

markingsRouter.put(
  '/:batchId',
  asyncHandler(async (req, res) => {
    const batchId = routeParam(req, 'batchId')
    const existing = await BlockMarking.findAll({ where: { batchId } })
    if (!existing.length) return notFound(res, 'Marking batch not found')

    const parsed = batchSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    const { date, partyId, quarryId, markerName, lines } = parsed.data
    const party = await Party.findByPk(partyId)
    if (!party) return badRequest(res, 'Invalid partyId')
    if (party.quarryId !== quarryId) return badRequest(res, 'Party does not belong to quarry')

    const markingNo = existing[0].markingNo || (await nextMarkingNo(quarryId))
    const keepIds = new Set(lines.map((l) => l.id).filter(Boolean) as string[])
    const toDelete = existing.filter((row) => !keepIds.has(row.id))

    for (const row of toDelete) {
      const onLoad = await DispatchTripBlock.count({ where: { blockId: row.id } })
      if (onLoad > 0) {
        return badRequest(res, `Cannot remove block ${row.blockNo}: already on a load`)
      }
    }

    await sequelize.transaction(async (t) => {
      if (toDelete.length) {
        await BlockMarking.destroy({
          where: { id: { [Op.in]: toDelete.map((r) => r.id) } },
          transaction: t,
        })
      }

      for (const line of lines) {
        const data = {
          batchId,
          markingNo,
          quarryId,
          partyId,
          date,
          blockNo: line.blockNo,
          choice: line.choice,
          l: line.l,
          w: line.w,
          h: line.h,
          rate: line.rate,
          gstPct: line.gstType === 'none' ? 0 : line.gstPct,
          gstType: line.gstType,
          markerName: line.markerName ?? markerName ?? null,
          notes: line.notes ?? null,
        }
        if (line.id && existing.some((e) => e.id === line.id)) {
          await BlockMarking.update(data, { where: { id: line.id }, transaction: t })
        } else {
          await BlockMarking.create(data, { transaction: t })
        }
      }
    })

    const blocks = await BlockMarking.findAll({
      where: { batchId },
      include: [{ model: DispatchTripBlock, as: 'loads', attributes: ['tripId'] }],
      order: [['blockNo', 'ASC']],
    })
    res.json(summarizeBatch(batchId, blocks.map(serializeBlock)))
  }),
)

markingsRouter.delete(
  '/:batchId',
  asyncHandler(async (req, res) => {
    const batchId = routeParam(req, 'batchId')
    const blocks = await BlockMarking.findAll({ where: { batchId } })
    if (!blocks.length) return notFound(res, 'Marking batch not found')

    const onLoad = await DispatchTripBlock.count({
      where: { blockId: { [Op.in]: blocks.map((b) => b.id) } },
    })
    if (onLoad > 0) return badRequest(res, 'Cannot delete batch: one or more blocks are on a load')

    await BlockMarking.destroy({ where: { batchId } })
    res.status(204).send()
  }),
)
