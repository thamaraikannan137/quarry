import { DataTypes, Model, type Optional } from 'sequelize'

import { sequelize } from '../sequelize.js'

export interface QuarryAttributes {
  id: string
  name: string
  code: string
  place: string | null
  createdAt: Date
  updatedAt: Date
}

type QuarryCreation = Optional<QuarryAttributes, 'place' | 'createdAt' | 'updatedAt'>

export class Quarry extends Model<QuarryAttributes, QuarryCreation> implements QuarryAttributes {
  declare id: string
  declare name: string
  declare code: string
  declare place: string | null
  declare createdAt: Date
  declare updatedAt: Date
}

Quarry.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    place: { type: DataTypes.STRING, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'Quarry' },
)
