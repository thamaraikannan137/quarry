import { QueryTypes } from 'sequelize'

import { sequelize } from '../db/models/index.js'

type ColumnInfo = {
  data_type: string
  udt_name: string
  is_nullable: string
}

async function columnInfo(table: string, column: string) {
  const rows = await sequelize.query<ColumnInfo>(
    `SELECT data_type, udt_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = :table
       AND column_name = :column`,
    { replacements: { table, column }, type: QueryTypes.SELECT },
  )
  return rows[0] ?? null
}

function isDateType(info: ColumnInfo) {
  return info.data_type === 'date' || info.udt_name === 'date'
}

function isVarcharType(info: ColumnInfo) {
  return (
    info.data_type === 'character varying' ||
    info.data_type === 'text' ||
    info.udt_name === 'varchar' ||
    info.udt_name === 'text'
  )
}

async function invalidVarcharCount(table: string, column: string, allowEmpty: boolean) {
  const emptySql = allowEmpty
    ? `"${column}" IS NOT NULL AND btrim("${column}") <> '' AND "${column}" !~ '^\\d{4}-\\d{2}-\\d{2}'`
    : `"${column}" IS NULL OR btrim("${column}") = '' OR "${column}" !~ '^\\d{4}-\\d{2}-\\d{2}'`
  const rows = await sequelize.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM "${table}" WHERE ${emptySql}`,
    { type: QueryTypes.SELECT },
  )
  return Number(rows[0]?.n) || 0
}

async function migrateRequiredDate(table: string, column: string) {
  const info = await columnInfo(table, column)
  if (!info || isDateType(info)) return
  if (!isVarcharType(info)) {
    console.warn(`Skipping ${table}.${column}: unexpected type ${info.data_type}`)
    return
  }

  const invalid = await invalidVarcharCount(table, column, false)
  if (invalid > 0) {
    throw new Error(`Cannot convert ${table}.${column} to DATE: ${invalid} invalid value(s)`)
  }

  await sequelize.query(
    `ALTER TABLE "${table}"
       ALTER COLUMN "${column}" TYPE DATE
       USING SUBSTRING("${column}" FROM 1 FOR 10)::date`,
  )
  console.log(`Converted ${table}.${column} VARCHAR → DATE`)
}

async function migrateOptionalDate(table: string, column: string) {
  const info = await columnInfo(table, column)
  if (!info || isDateType(info)) return
  if (!isVarcharType(info)) {
    console.warn(`Skipping ${table}.${column}: unexpected type ${info.data_type}`)
    return
  }

  const invalid = await invalidVarcharCount(table, column, true)
  if (invalid > 0) {
    throw new Error(`Cannot convert ${table}.${column} to DATE: ${invalid} invalid value(s)`)
  }

  await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT`)
  if (info.is_nullable === 'NO') {
    await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL`)
  }
  await sequelize.query(
    `UPDATE "${table}"
     SET "${column}" = NULL
     WHERE "${column}" IS NULL OR btrim("${column}") = ''`,
  )
  await sequelize.query(
    `ALTER TABLE "${table}"
       ALTER COLUMN "${column}" TYPE DATE
       USING CASE
         WHEN "${column}" IS NULL OR btrim("${column}") = '' THEN NULL
         ELSE SUBSTRING("${column}" FROM 1 FOR 10)::date
       END`,
  )
  console.log(`Converted ${table}.${column} VARCHAR → DATE (nullable)`)
}

export async function ensureDateColumns() {
  await migrateRequiredDate('Transaction', 'date')
  await migrateRequiredDate('BlockMarking', 'date')
  await migrateRequiredDate('AttendanceMark', 'date')
  await migrateRequiredDate('DispatchTrip', 'date')
  await migrateOptionalDate('Customer', 'asOf')
}
