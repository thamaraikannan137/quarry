import { QueryTypes } from 'sequelize'

import { sequelize } from '../db/models/index.js'
import { isLocalDatabase } from '../db/sequelize.js'

export async function ensureSchema() {
  const rows = await sequelize.query<{ rel: string | null }>(
    `SELECT to_regclass('public."AttendanceMark"') AS rel`,
    { type: QueryTypes.SELECT },
  )
  const missing = !rows[0]?.rel
  const shouldSync = process.env.DB_SYNC === '1' || isLocalDatabase() || missing
  if (!shouldSync) return
  await sequelize.sync()
  if (missing) console.log('Created missing database tables')
}
