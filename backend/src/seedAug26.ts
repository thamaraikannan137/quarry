import { Op } from 'sequelize'

import { BlockMarking, Party, Quarry, sequelize } from './db/models/index.js'
import { newId } from './lib/marking.js'
import { ensureMarkingNumbers, nextMarkingNo } from './lib/markingNo.js'

const QUARRY_ID = 'q_chitha'
const DEFAULT_RATE = 18_000
const GST_PCT = 12

type Line = { blockNo: string; choice: string; l: number; w: number; h: number }

type Batch = {
  date: string
  party: string
  marker: string
  lines: Line[]
}

/** Parsed from MARKING DETAILS.xlsx sheet Aug-26 (Chithanavasal). */
const BATCHES: Batch[] = [
  {
    date: '2026-08-04',
    party: 'PR Granites',
    marker: 'Kannan',
    lines: [
      { blockNo: 'PPR-01', choice: 'I', l: 210, w: 150, h: 90 },
      { blockNo: 'PPR-02', choice: 'I', l: 280, w: 135, h: 100 },
      { blockNo: 'PPR-03', choice: 'I', l: 270, w: 160, h: 70 },
      { blockNo: 'PPR-04', choice: 'I', l: 280, w: 90, h: 100 },
      { blockNo: 'PPR-05', choice: 'I', l: 240, w: 160, h: 125 },
      { blockNo: 'PPR-06', choice: 'I', l: 290, w: 90, h: 120 },
      { blockNo: 'PPR-07', choice: 'I', l: 260, w: 100, h: 90 },
      { blockNo: 'PPR-08', choice: 'I', l: 260, w: 90, h: 90 },
    ],
  },
  {
    date: '2026-08-08',
    party: 'Sri Mahadev Granites',
    marker: 'Sivaraj',
    lines: [
      { blockNo: 'SMG-01', choice: 'Tile', l: 305, w: 100, h: 60 },
      { blockNo: 'SMG-02', choice: 'Tile', l: 280, w: 170, h: 95 },
      { blockNo: 'SMG-03', choice: 'Tile', l: 300, w: 145, h: 60 },
      { blockNo: 'SMG-04', choice: 'Tile', l: 290, w: 150, h: 55 },
      { blockNo: 'SMG-05', choice: 'Tile', l: 310, w: 90, h: 45 },
    ],
  },
  {
    date: '2026-08-10',
    party: 'Jeevan Ram Granites',
    marker: 'Vinai',
    lines: [
      { blockNo: 'SJR-37', choice: 'I', l: 305, w: 150, h: 150 },
      { blockNo: 'SJR-38', choice: 'I', l: 280, w: 150, h: 100 },
      { blockNo: 'SJR-39', choice: 'I', l: 300, w: 150, h: 110 },
      { blockNo: 'SJR-42', choice: 'I', l: 300, w: 130, h: 85 },
      { blockNo: 'SJR-40', choice: 'Tile', l: 250, w: 125, h: 95 },
      { blockNo: 'SJR-41', choice: 'Tile', l: 290, w: 90, h: 90 },
    ],
  },
]

async function ensureParty(name: string) {
  const existing = await Party.findOne({
    where: {
      quarryId: QUARRY_ID,
      name: { [Op.iLike]: name },
    },
  })
  if (existing) {
    if (existing.name !== name) await existing.update({ name })
    return existing
  }
  return Party.create({
    name,
    type: 'Customer',
    quarryId: QUARRY_ID,
  })
}

async function importBatch(batch: Batch) {
  const party = await ensureParty(batch.party)
  const blockNos = batch.lines.map((line) => line.blockNo)

  const already = await BlockMarking.findAll({
    where: {
      quarryId: QUARRY_ID,
      date: batch.date,
      partyId: party.id,
      blockNo: { [Op.in]: blockNos },
    },
  })
  if (already.length === batch.lines.length) {
    console.log(`skip ${batch.date} ${batch.party} (${already.length} blocks already present)`)
    return { imported: 0, skipped: already.length }
  }

  if (already.length) {
    await BlockMarking.destroy({
      where: { id: { [Op.in]: already.map((row) => row.id) } },
    })
  }

  const batchId = already[0]?.batchId ?? newId('mb')
  const markingNo = already[0]?.markingNo || (await nextMarkingNo(QUARRY_ID))
  for (const line of batch.lines) {
    await BlockMarking.create({
      batchId,
      markingNo,
      quarryId: QUARRY_ID,
      partyId: party.id,
      date: batch.date,
      blockNo: line.blockNo,
      choice: line.choice,
      l: line.l,
      w: line.w,
      h: line.h,
      rate: DEFAULT_RATE,
      gstPct: GST_PCT,
      markerName: batch.marker,
    })
  }
  console.log(`imported ${batch.date} ${batch.party} · ${batch.lines.length} blocks · marker ${batch.marker}`)
  return { imported: batch.lines.length, skipped: 0 }
}

async function main() {
  await sequelize.authenticate()
  await sequelize.sync()
  await ensureMarkingNumbers()

  await Quarry.upsert({
    id: QUARRY_ID,
    name: 'Chithanavasal',
    code: 'CHITHA',
    place: 'Illuppur / Pudukkottai',
  })

  let imported = 0
  let skipped = 0
  for (const batch of BATCHES) {
    const result = await importBatch(batch)
    imported += result.imported
    skipped += result.skipped
  }

  console.log(`Aug-26 done. imported=${imported} skipped=${skipped}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await sequelize.close()
  })
