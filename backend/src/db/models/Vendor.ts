import { DataTypes, Model, type Optional } from 'sequelize'

import { newId } from '../../lib/marking.js'
import { sequelize } from '../sequelize.js'

export interface VendorAttributes {
  id: string
  name: string
  phone: string
  billingAddress: string
  openingBalance: number
  notes: string
  quarryId: string
  createdAt: Date
  updatedAt: Date
}

type VendorCreation = Optional<
  VendorAttributes,
  'id' | 'phone' | 'billingAddress' | 'openingBalance' | 'notes' | 'createdAt' | 'updatedAt'
>

export class Vendor extends Model<VendorAttributes, VendorCreation> implements VendorAttributes {
  declare id: string
  declare name: string
  declare phone: string
  declare billingAddress: string
  declare openingBalance: number
  declare notes: string
  declare quarryId: string
  declare createdAt: Date
  declare updatedAt: Date
}

Vendor.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    billingAddress: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    openingBalance: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
    notes: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    quarryId: { type: DataTypes.STRING, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'Vendor',
    indexes: [{ fields: ['quarryId'] }, { fields: ['name'] }],
  },
)

Vendor.beforeCreate((row) => {
  if (!row.id) row.id = newId('vn')
})
