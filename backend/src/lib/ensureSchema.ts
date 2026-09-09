import { QueryTypes } from 'sequelize'

import { sequelize } from '../db/models/index.js'
import { isLocalDatabase } from '../db/sequelize.js'
import { logger } from './logger.js'

async function missingTable(name: string) {
  const rows = await sequelize.query<{ rel: string | null }>(
    `SELECT to_regclass('public."${name}"') AS rel`,
    { type: QueryTypes.SELECT },
  )
  return !rows[0]?.rel
}

export async function ensureSchema() {
  const missingCore = await missingTable('AttendanceMark')
  const missingSplit = (await missingTable('Customer')) || (await missingTable('Vendor'))
  const shouldSync = process.env.DB_SYNC === '1' || isLocalDatabase() || missingCore || missingSplit
  if (!shouldSync) return
  await sequelize.sync()
  if (missingCore || missingSplit) logger.info('Created missing database tables')
}
