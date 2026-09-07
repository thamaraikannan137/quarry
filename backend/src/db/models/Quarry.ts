import { DataTypes, Model, type Optional } from 'sequelize'

import { sequelize } from '../sequelize.js'

export interface QuarryAttributes {
  id: string
  name: string
  code: string
  place: string | null
  gstPct: number
  createdAt: Date
  updatedAt: Date
}

type QuarryCreation = Optional<QuarryAttributes, 'place' | 'gstPct' | 'createdAt' | 'updatedAt'>

export class Quarry extends Model<QuarryAttributes, QuarryCreation> implements QuarryAttributes {
  declare id: string
  declare name: string
  declare code: string
  declare place: string | null
  declare gstPct: number
  declare createdAt: Date
  declare updatedAt: Date
}

Quarry.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    place: { type: DataTypes.STRING, allowNull: true },
    gstPct: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 18 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'Quarry' },
)
