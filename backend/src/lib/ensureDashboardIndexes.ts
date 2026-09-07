import { sequelize } from '../db/models/index.js'

export async function ensureDashboardIndexes() {
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS idx_transaction_quarry_date ON "Transaction" ("quarryId", "date")',
  )
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS idx_block_marking_quarry_date ON "BlockMarking" ("quarryId", "date")',
  )
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS idx_dispatch_trip_quarry_date ON "DispatchTrip" ("quarryId", "date")',
  )
}
