import { sequelize } from './db/models/index.js'
import { DEFAULT_QUARRIES, ensureDefaultQuarries } from './data/defaultQuarries.js'
import { DEFAULT_STAFF, ensureDefaultStaff } from './data/defaultStaff.js'
import { ensureDateColumns } from './lib/ensureDateColumns.js'

async function main() {
  await sequelize.authenticate()
  await sequelize.sync()
  await ensureDateColumns()
  await ensureDefaultQuarries()
  await ensureDefaultStaff()

  console.log('Seeded quarries:', DEFAULT_QUARRIES.map((row) => row.id).join(', '))
  console.log('Seeded staff:', DEFAULT_STAFF.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await sequelize.close()
  })
