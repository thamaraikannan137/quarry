import { Op, QueryTypes } from 'sequelize'

import { Ledger, Transaction, sequelize } from '../db/models/index.js'
import {
  LEDGER_IN_HEAD,
  LEDGER_OUT_HEAD,
  LEGACY_LEDGER_IN_HEAD,
  LEGACY_LEDGER_RETURN_HEAD,
  LEGACY_LEDGER_TRANSFER_HEAD,
} from './ledgerHeads.js'
import { logger } from './logger.js'
import { newId } from './marking.js'

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

/** Old float vouchers that polluted All Transactions. */
async function purgeLegacyLedgerVouchers() {
  const removed = await Transaction.destroy({
    where: {
      head: {
        [Op.in]: [LEGACY_LEDGER_IN_HEAD, LEGACY_LEDGER_RETURN_HEAD, LEGACY_LEDGER_TRANSFER_HEAD],
      },
    },
  })
  if (removed) logger.info(`Removed ${removed} legacy cash-holder ledger voucher(s)`)
}

/**
 * Existing ledgers stored a single `amount` / `returnedAmount` without statement rows.
 * Seed matching Ledger in / Ledger out once per ledger (skip if any statement rows exist).
 */
async function seedOpeningLedgerMoves() {
  const ledgers = await Ledger.findAll()
  let seeded = 0

  for (const ledger of ledgers) {
    const bookCount = await Transaction.count({
      where: {
        ledgerId: ledger.id,
        head: { [Op.in]: [LEDGER_IN_HEAD, LEDGER_OUT_HEAD] },
      },
    })
    if (bookCount > 0) continue

    const given = Number(ledger.amount) || 0
    const transferred = Number(ledger.returnedAmount) || 0

    if (given > 0.01) {
      await Transaction.create({
        id: newId('tx'),
        quarryId: ledger.quarryId,
        date: ledger.date,
        type: 'Credit',
        head: LEDGER_IN_HEAD,
        particulars: `Opening balance — ${ledger.holderName}`,
        debit: 0,
        credit: given,
        ledgerId: ledger.id,
      })
      seeded += 1
    }

    if (transferred > 0.01) {
      await Transaction.create({
        id: newId('tx'),
        quarryId: ledger.quarryId,
        date: ledger.closedDate || ledger.date,
        type: 'Debit',
        head: LEDGER_OUT_HEAD,
        particulars: `Opening transfers — ${ledger.holderName}`,
        debit: transferred,
        credit: 0,
        ledgerId: ledger.id,
      })
      seeded += 1
    }
  }

  if (seeded) logger.info(`Seeded ${seeded} ledger statement opening row(s)`)
}

/** Remove duplicate opening seeds from concurrent boots (keep earliest of each head). */
async function dedupeOpeningLedgerMoves() {
  const ledgers = await Ledger.findAll({ attributes: ['id', 'holderName'] })
  let removed = 0
  for (const ledger of ledgers) {
    for (const head of [LEDGER_IN_HEAD, LEDGER_OUT_HEAD]) {
      const rows = await Transaction.findAll({
        where: {
          ledgerId: ledger.id,
          head,
          particulars: { [Op.like]: 'Opening%' },
        },
        order: [
          ['createdAt', 'ASC'],
          ['id', 'ASC'],
        ],
      })
      if (rows.length <= 1) continue
      const extras = rows.slice(1)
      await Transaction.destroy({ where: { id: { [Op.in]: extras.map((row) => row.id) } } })
      removed += extras.length
    }
  }
  if (removed) logger.info(`Removed ${removed} duplicate ledger opening row(s)`)
}

export async function ensureLedgers() {
  if (!(await missingTable('CashFloat')) && (await missingTable('Ledger'))) {
    await sequelize.query(`ALTER TABLE "CashFloat" RENAME TO "Ledger"`)
    logger.info('Renamed CashFloat table to Ledger')
  }

  if (await missingTable('Ledger')) {
    await Ledger.sync()
    logger.info('Created Ledger table')
  }

  const hasCashFloatId = await hasColumn('Transaction', 'cashFloatId')
  const hasLedgerId = await hasColumn('Transaction', 'ledgerId')

  if (hasCashFloatId && !hasLedgerId) {
    try {
      await sequelize.query(`ALTER TABLE "Transaction" RENAME COLUMN "cashFloatId" TO "ledgerId"`)
      logger.info('Renamed Transaction.cashFloatId to ledgerId')
    } catch (error) {
      if (!(await hasColumn('Transaction', 'ledgerId'))) throw error
      logger.info('Transaction.ledgerId already present (skip rename)')
    }
  }

  await sequelize.query(`ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "ledgerId" VARCHAR(255)`)
  await sequelize.query(`DROP INDEX IF EXISTS idx_transaction_cash_float`)
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_transaction_ledger ON "Transaction" ("ledgerId")`)

  await purgeLegacyLedgerVouchers()
  await seedOpeningLedgerMoves()
  await dedupeOpeningLedgerMoves()
}
