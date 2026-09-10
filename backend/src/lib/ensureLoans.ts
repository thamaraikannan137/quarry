import { QueryTypes } from 'sequelize'

import { Loan, LoanPayment, Quarry, sequelize } from '../db/models/index.js'
import { logger } from './logger.js'

async function missingTable(name: string) {
  const rows = await sequelize.query<{ rel: string | null }>(
    `SELECT to_regclass('public."${name}"') AS rel`,
    { type: QueryTypes.SELECT },
  )
  return !rows[0]?.rel
}

async function hasColumn(table: string, column: string) {
  const rows = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = :table AND column_name = :column
     ) AS exists`,
    { type: QueryTypes.SELECT, replacements: { table, column } },
  )
  return Boolean(rows[0]?.exists)
}

/** Backfill Loan.quarryId from EMI payments or default quarry (run after quarries exist). */
export async function ensureLoanQuarryScope() {
  if (await missingTable('Loan')) return

  if (!(await hasColumn('Loan', 'quarryId'))) {
    await sequelize.query(`ALTER TABLE "Loan" ADD COLUMN "quarryId" VARCHAR(255)`)
    logger.info('Added Loan.quarryId')
  }

  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_loan_quarry ON "Loan" ("quarryId")`)

  const defaultQuarry =
    (await Quarry.findByPk('q_chitha')) ?? (await Quarry.findOne({ order: [['createdAt', 'ASC']] }))
  if (!defaultQuarry) return

  const loans = await Loan.findAll()
  let patched = 0
  for (const loan of loans) {
    if (loan.quarryId) continue
    const payment = await LoanPayment.findOne({
      where: { loanId: loan.id },
      order: [
        ['date', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    })
    const quarryId = payment?.quarryId || defaultQuarry.id
    await loan.update({ quarryId })
    patched += 1
  }
  if (patched) logger.info(`Assigned quarryId on ${patched} loan(s)`)

  await sequelize.query(
    `
    UPDATE "Loan"
    SET "quarryId" = :fallback
    WHERE "quarryId" IS NULL OR TRIM("quarryId") = ''
  `,
    { replacements: { fallback: defaultQuarry.id } },
  )
}

export async function ensureLoans() {
  if (await missingTable('Loan')) {
    await Loan.sync()
    logger.info('Created Loan table')
  }
  if (await missingTable('LoanPayment')) {
    await LoanPayment.sync()
    logger.info('Created LoanPayment table')
  }

  // Add quarryId before sequelize.sync() in ensureSchema tries to use the model.
  if (!(await missingTable('Loan')) && !(await hasColumn('Loan', 'quarryId'))) {
    await sequelize.query(`ALTER TABLE "Loan" ADD COLUMN "quarryId" VARCHAR(255)`)
    logger.info('Added Loan.quarryId')
  }
  if (!(await missingTable('Loan'))) {
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_loan_quarry ON "Loan" ("quarryId")`)
  }

  await sequelize.query(`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "loanId" VARCHAR(255)`)
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_transaction_loan ON "Transaction" ("loanId")`,
  )
}
