import cors from 'cors'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'

import { AttendanceMark, sequelize } from './db/models/index.js'
import { ensureDefaultQuarries } from './data/defaultQuarries.js'
import { ensureDefaultStaff } from './data/defaultStaff.js'
import { ensureDefaultUsers } from './data/defaultUsers.js'
import { ensureDashboardIndexes } from './lib/ensureDashboardIndexes.js'
import { ensureDateColumns } from './lib/ensureDateColumns.js'
import { ensureGstSettings } from './lib/ensureGstSettings.js'
import { ensureMarkingNumbers } from './lib/markingNo.js'
import { ensureSchema } from './lib/ensureSchema.js'
import { ensureSplitParties } from './lib/ensureSplitParties.js'
import { logger, requestLogger } from './lib/logger.js'
import { attendanceRouter } from './routes/attendance.js'
import { authRouter } from './routes/auth.js'
import { customersRouter } from './routes/customers.js'
import { vendorsRouter } from './routes/vendors.js'
import { dashboardRouter } from './routes/dashboard.js'
import { loadsRouter } from './routes/loads.js'
import { markingsRouter } from './routes/markings.js'
import { quarriesRouter } from './routes/quarries.js'
import { salaryRouter } from './routes/salary.js'
import { staffRouter } from './routes/staff.js'
import { transactionsRouter } from './routes/transactions.js'
import { usersRouter } from './routes/users.js'

const app = express()
const port = Number(process.env.PORT || 4000)

app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use(requestLogger)

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'quarry-api' })
})

app.get('/api', (_req, res) => {
  res.json({
    name: 'Quarry API',
    version: '0.1.0',
    endpoints: [
      'GET /api/dashboard',
      'GET /api/quarries',
      'GET|POST|PUT|DELETE /api/customers',
      'GET|POST|PUT|DELETE /api/vendors',
      'GET|POST|PUT|DELETE /api/markings',
      'GET|POST|PUT|DELETE /api/loads',
      'GET|POST|PUT|DELETE /api/staff',
      'GET|PUT /api/attendance',
      'GET /api/salary',
      'GET|POST|PUT|DELETE /api/transactions',
      'POST /api/auth/login',
      'GET|POST|PUT|DELETE /api/users',
    ],
  })
})

app.use('/api/dashboard', dashboardRouter)
app.use('/api/quarries', quarriesRouter)
app.use('/api/customers', customersRouter)
app.use('/api/vendors', vendorsRouter)
app.use('/api/markings', markingsRouter)
app.use('/api/loads', loadsRouter)
app.use('/api/staff', staffRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/salary', salaryRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Server error'
  logger.error(`${req.method} ${req.originalUrl || req.url} failed: ${message}`, err)
  res.status(500).json({ error: message })
})

async function main() {
  await sequelize.authenticate()
  await ensureSchema()
  await ensureSplitParties()
  await AttendanceMark.update({ status: 'HalfDay' }, { where: { status: 'Holiday' } })
  await ensureMarkingNumbers()
  await ensureDateColumns()
  await ensureGstSettings()
  await ensureDashboardIndexes()
  await ensureDefaultQuarries()
  await ensureDefaultStaff()
  await ensureDefaultUsers()
  app.listen(port, () => {
    logger.info(`Quarry API listening on http://localhost:${port}`)
  })
}

main().catch((err) => {
  logger.error('Failed to start API', err)
  process.exit(1)
})
