import { sequelize } from './db/models/index.js'
import { DEFAULT_QUARRIES, ensureDefaultQuarries } from './data/defaultQuarries.js'
import { DEFAULT_STAFF, ensureDefaultStaff } from './data/defaultStaff.js'
import { DEFAULT_USERS, ensureDefaultUsers } from './data/defaultUsers.js'
import { ensureDateColumns } from './lib/ensureDateColumns.js'
import { ensureSplitParties } from './lib/ensureSplitParties.js'

async function main() {
  await sequelize.authenticate()
  await sequelize.sync()
  await ensureSplitParties()
  await ensureDateColumns()
  await ensureDefaultQuarries()
  await ensureDefaultStaff()
  await ensureDefaultUsers()

  console.log('Seeded quarries:', DEFAULT_QUARRIES.map((row) => row.id).join(', '))
  console.log('Seeded staff:', DEFAULT_STAFF.length)
  console.log('Seeded users:', DEFAULT_USERS.map((row) => row.username).join(', '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await sequelize.close()
  })
