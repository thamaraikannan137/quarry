import { QueryTypes } from 'sequelize'

import { sequelize } from '../db/models/index.js'

async function hasColumn(table: string, column: string) {
  const rows = await sequelize.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = :table
       AND column_name = :column`,
    { replacements: { table, column }, type: QueryTypes.SELECT },
  )
  return Number(rows[0]?.n) > 0
}

export async function ensureGstSettings() {
  if (!(await hasColumn('Quarry', 'gstPct'))) {
    await sequelize.query(
      `ALTER TABLE "Quarry" ADD COLUMN "gstPct" DOUBLE PRECISION NOT NULL DEFAULT 18`,
    )
    console.log('Added Quarry.gstPct')
  }

  if (!(await hasColumn('BlockMarking', 'gstType'))) {
    await sequelize.query(
      `ALTER TABLE "BlockMarking" ADD COLUMN "gstType" VARCHAR NOT NULL DEFAULT 'intra'`,
    )
    await sequelize.query(
      `UPDATE "BlockMarking" SET "gstType" = 'none' WHERE "gstPct" = 0`,
    )
    console.log('Added BlockMarking.gstType')
  }
}
