import { QueryTypes } from 'sequelize'

import { sequelize } from '../db/models/index.js'
import { logger } from './logger.js'

async function tableExists(name: string) {
  const rows = await sequelize.query<{ rel: string | null }>(
    `SELECT to_regclass('public."${name}"') AS rel`,
    { type: QueryTypes.SELECT },
  )
  return Boolean(rows[0]?.rel)
}

async function rowCount(table: string) {
  const rows = await sequelize.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM "${table}"`, {
    type: QueryTypes.SELECT,
  })
  return Number(rows[0]?.n) || 0
}

/** Copy legacy Party rows into Customer + Vendor, then drop Party. */
export async function ensureSplitParties() {
  if (!(await tableExists('Party'))) return

  if (await tableExists('Customer')) {
    await sequelize.query(`
      INSERT INTO "Customer" (
        id, name, phone, email, gstin, "gstType", state, "billingAddress", "shippingAddress",
        "openingBalance", "asOf", "creditLimit", contact, notes, "quarryId", "createdAt", "updatedAt"
      )
      SELECT
        id, name, phone, email, gstin, "gstType", state, "billingAddress", "shippingAddress",
        "openingBalance", "asOf", "creditLimit", contact, notes, "quarryId", "createdAt", "updatedAt"
      FROM "Party"
      WHERE type IN ('Customer', 'Both')
      ON CONFLICT (id) DO NOTHING
    `)
  }

  if (await tableExists('Vendor')) {
    await sequelize.query(`
      INSERT INTO "Vendor" (
        id, name, phone, "billingAddress", "openingBalance", notes, "quarryId", "createdAt", "updatedAt"
      )
      SELECT
        id, name, phone, "billingAddress", "openingBalance", notes, "quarryId", "createdAt", "updatedAt"
      FROM "Party"
      WHERE type IN ('Vendor', 'Both')
      ON CONFLICT (id) DO NOTHING
    `)
  }

  const customers = (await tableExists('Customer')) ? await rowCount('Customer') : 0
  const vendors = (await tableExists('Vendor')) ? await rowCount('Vendor') : 0
  await sequelize.query('ALTER TABLE "BlockMarking" DROP CONSTRAINT IF EXISTS "BlockMarking_partyId_fkey"')
  await sequelize.query('ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_partyId_fkey"')
  await sequelize.query('DROP TABLE IF EXISTS "Party"')
  logger.info(`Split Party → Customer (${customers}) + Vendor (${vendors})`)
}
