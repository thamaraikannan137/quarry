import { Op, type Transaction } from 'sequelize'

import { BlockMarking, sequelize } from '../db/models/index.js'

export const MARKING_NO_PREFIX = 'MK-'

export function formatMarkingNo(seq: number) {
  return `${MARKING_NO_PREFIX}${String(seq).padStart(3, '0')}`
}

export function parseMarkingSeq(markingNo: string | null | undefined) {
  const match = /^MK-(\d+)$/i.exec(markingNo?.trim() ?? '')
  return match ? Number(match[1]) : 0
}

export async function nextMarkingNo(quarryId: string, transaction?: Transaction) {
  const rows = await BlockMarking.findAll({
    where: {
      quarryId,
      markingNo: { [Op.ne]: null },
    },
    attributes: ['markingNo'],
    transaction,
  })
  const max = rows.reduce((n, row) => Math.max(n, parseMarkingSeq(row.markingNo)), 0)
  return formatMarkingNo(max + 1)
}

/** Add MK-001 style numbers to existing batches (same idea as LD-001 on loads). */
export async function ensureMarkingNumbers() {
  const [columns] = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'BlockMarking' AND column_name = 'markingNo'
     LIMIT 1`,
  )
  if (!Array.isArray(columns) || columns.length === 0) {
    await sequelize.query('ALTER TABLE "BlockMarking" ADD COLUMN IF NOT EXISTS "markingNo" VARCHAR')
  }

  const missing = await BlockMarking.findAll({
    where: {
      [Op.or]: [{ markingNo: null }, { markingNo: '' }],
    },
    attributes: ['batchId', 'quarryId', 'date', 'createdAt'],
    order: [
      ['date', 'ASC'],
      ['createdAt', 'ASC'],
      ['batchId', 'ASC'],
    ],
  })

  const seen = new Set<string>()
  const batches: Array<{ batchId: string; quarryId: string }> = []
  for (const row of missing) {
    if (seen.has(row.batchId)) continue
    seen.add(row.batchId)
    batches.push({ batchId: row.batchId, quarryId: row.quarryId })
  }
  if (!batches.length) return

  const numbered = await BlockMarking.findAll({
    where: { markingNo: { [Op.ne]: null } },
    attributes: ['quarryId', 'markingNo'],
  })
  const maxByQuarry = new Map<string, number>()
  for (const row of numbered) {
    maxByQuarry.set(row.quarryId, Math.max(maxByQuarry.get(row.quarryId) ?? 0, parseMarkingSeq(row.markingNo)))
  }

  for (const batch of batches) {
    const next = (maxByQuarry.get(batch.quarryId) ?? 0) + 1
    maxByQuarry.set(batch.quarryId, next)
    await BlockMarking.update({ markingNo: formatMarkingNo(next) }, { where: { batchId: batch.batchId } })
  }
}
