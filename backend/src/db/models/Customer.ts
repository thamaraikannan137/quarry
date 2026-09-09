import { DataTypes, Model, type Optional } from 'sequelize'

import { dateonlyAttribute } from '../../lib/isoDate.js'
import { newId } from '../../lib/marking.js'
import { sequelize } from '../sequelize.js'

export interface CustomerAttributes {
  id: string
  name: string
  phone: string
  email: string
  gstin: string
  gstType: string
  state: string
  billingAddress: string
  shippingAddress: string
  openingBalance: number
  asOf: string | null
  creditLimit: number
  contact: string
  notes: string
  quarryId: string
  createdAt: Date
  updatedAt: Date
}

type CustomerCreation = Optional<
  CustomerAttributes,
  | 'id'
  | 'phone'
  | 'email'
  | 'gstin'
  | 'gstType'
  | 'state'
  | 'billingAddress'
  | 'shippingAddress'
  | 'openingBalance'
  | 'asOf'
  | 'creditLimit'
  | 'contact'
  | 'notes'
  | 'createdAt'
  | 'updatedAt'
>

export class Customer extends Model<CustomerAttributes, CustomerCreation> implements CustomerAttributes {
  declare id: string
  declare name: string
  declare phone: string
  declare email: string
  declare gstin: string
  declare gstType: string
  declare state: string
  declare billingAddress: string
  declare shippingAddress: string
  declare openingBalance: number
  declare asOf: string | null
  declare creditLimit: number
  declare contact: string
  declare notes: string
  declare quarryId: string
  declare createdAt: Date
  declare updatedAt: Date
}

Customer.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    email: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    gstin: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    gstType: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Unregistered/Consumer' },
    state: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Tamil Nadu' },
    billingAddress: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shippingAddress: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    openingBalance: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
    asOf: dateonlyAttribute('asOf', { allowNull: true }),
    creditLimit: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
    contact: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    notes: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    quarryId: { type: DataTypes.STRING, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'Customer',
    indexes: [{ fields: ['quarryId'] }, { fields: ['name'] }],
  },
)

Customer.beforeCreate((row) => {
  if (!row.id) row.id = newId('cu')
})
