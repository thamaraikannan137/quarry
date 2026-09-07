import 'dotenv/config'
import pg from 'pg'
import { Sequelize } from 'sequelize'

// Keep DATE columns as YYYY-MM-DD strings so JSON/API never timezone-shift.
pg.types.setTypeParser(pg.types.builtins.DATE, (value: string) => value)

function databaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')
  return url
    .replace(/[?&]schema=[^&]*/g, '')
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/\?$/, '')
}

export function isLocalDatabase(url = databaseUrl()) {
  return /localhost|127\.0\.0\.1/.test(url)
}

function needsSsl(url: string) {
  return /sslmode=require/i.test(url) || !isLocalDatabase(url)
}

const url = databaseUrl()

export const sequelize = new Sequelize(url, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 8,
    min: isLocalDatabase(url) ? 0 : 1,
    acquire: 30_000,
    idle: 30_000,
  },
  dialectOptions: needsSsl(url)
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
        keepAlive: true,
      }
    : undefined,
  define: {
    freezeTableName: true,
  },
})
