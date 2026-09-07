import { DataTypes, type Model } from 'sequelize'
import { z } from 'zod'

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const isoDateSchema = z.string().regex(ISO_DATE_RE, 'Date must be YYYY-MM-DD')

export const optionalIsoDateSchema = z
  .union([isoDateSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null))

export function toIsoDate(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim())
    return match ? match[1] : null
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  return null
}

export function dateonlyAttribute(
  field: string,
  options: { allowNull?: boolean; defaultValue?: string | null } = {},
) {
  const allowNull = options.allowNull ?? false
  return {
    type: DataTypes.DATEONLY,
    allowNull,
    ...(Object.prototype.hasOwnProperty.call(options, 'defaultValue')
      ? { defaultValue: options.defaultValue }
      : {}),
    get(this: Model) {
      return toIsoDate(this.getDataValue(field))
    },
    set(this: Model, value: unknown) {
      const iso = toIsoDate(value)
      this.setDataValue(field, iso ?? (allowNull ? null : value))
    },
  }
}
