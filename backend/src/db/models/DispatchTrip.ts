import { DataTypes, Model, type Optional } from 'sequelize'

import { dateonlyAttribute } from '../../lib/isoDate.js'
import { newId } from '../../lib/marking.js'
import { sequelize } from '../sequelize.js'
import type { DispatchTripBlock } from './DispatchTripBlock.js'

export interface DispatchTripAttributes {
  id: string
  loadNo: string
  quarryId: string
  date: string
  lorryNo: string
  fromLocation: string
  toLocation: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

type DispatchTripCreation = Optional<
  DispatchTripAttributes,
  'id' | 'notes' | 'createdAt' | 'updatedAt'
>

export class DispatchTrip
  extends Model<DispatchTripAttributes, DispatchTripCreation>
  implements DispatchTripAttributes
{
  declare id: string
  declare loadNo: string
  declare quarryId: string
  declare date: string
  declare lorryNo: string
  declare fromLocation: string
  declare toLocation: string
  declare notes: string | null
  declare createdAt: Date
  declare updatedAt: Date

  declare blocks?: DispatchTripBlock[]
}

DispatchTrip.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    loadNo: { type: DataTypes.STRING, allowNull: false },
    quarryId: { type: DataTypes.STRING, allowNull: false },
    date: dateonlyAttribute('date'),
    lorryNo: { type: DataTypes.STRING, allowNull: false },
    fromLocation: { type: DataTypes.STRING, allowNull: false },
    toLocation: { type: DataTypes.STRING, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'DispatchTrip',
    indexes: [
      { unique: true, fields: ['quarryId', 'loadNo'] },
      { fields: ['quarryId'] },
      { fields: ['date'] },
      { name: 'idx_dispatch_trip_quarry_date', fields: ['quarryId', 'date'] },
    ],
  },
)

DispatchTrip.beforeCreate((row) => {
  if (!row.id) row.id = newId('ld')
})
