import { QueryTypes } from 'sequelize'

import { Loan, LoanPayment, sequelize } from '../db/models/index.js'
import { logger } from './logger.js'

async function missingTable(name: string) {
  const rows = await sequelize.query<{ rel: string | null }>(
    `SELECT to_regclass('public."${name}"') AS rel`,
    { type: QueryTypes.SELECT },
  )
  return !rows[0]?.rel
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

  await sequelize.query(`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "loanId" VARCHAR(255)`)
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_transaction_loan ON "Transaction" ("loanId")`,
  )
}
