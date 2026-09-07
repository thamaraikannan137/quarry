import 'dotenv/config'
import { Sequelize } from 'sequelize'

function databaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')
  return url
    .replace(/[?&]schema=[^&]*/g, '')
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/\?$/, '')
}

function needsSsl(url: string) {
  return /sslmode=require/i.test(url) || !/localhost|127\.0\.0\.1/.test(url)
}

const url = databaseUrl()

export const sequelize = new Sequelize(url, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: needsSsl(url)
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : undefined,
  define: {
    freezeTableName: true,
  },
})
