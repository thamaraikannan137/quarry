import { DataTypes, Model, type Optional } from 'sequelize'

import { newId } from '../../lib/marking.js'
import { sequelize } from '../sequelize.js'

export interface StaffAttributes {
  id: string
  quarryId: string
  name: string
  designation: string
  kind: string
  basicSalary: number
  phone: string
  bankName: string
  accountNumber: string
  ifsc: string
  branch: string
  status: string
  notes: string
  createdAt: Date
  updatedAt: Date
}

type StaffCreation = Optional<
  StaffAttributes,
  | 'id'
  | 'designation'
  | 'kind'
  | 'basicSalary'
  | 'phone'
  | 'bankName'
  | 'accountNumber'
  | 'ifsc'
  | 'branch'
  | 'status'
  | 'notes'
  | 'createdAt'
  | 'updatedAt'
>

export class Staff extends Model<StaffAttributes, StaffCreation> implements StaffAttributes {
  declare id: string
  declare quarryId: string
  declare name: string
  declare designation: string
  declare kind: string
  declare basicSalary: number
  declare phone: string
  declare bankName: string
  declare accountNumber: string
  declare ifsc: string
  declare branch: string
  declare status: string
  declare notes: string
  declare createdAt: Date
  declare updatedAt: Date
}

Staff.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    quarryId: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    designation: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    kind: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Staff' },
    basicSalary: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
    phone: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    bankName: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    accountNumber: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    ifsc: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    branch: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Active' },
    notes: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'Staff',
    indexes: [{ fields: ['quarryId'] }, { fields: ['kind'] }, { fields: ['status'] }, { fields: ['name'] }],
  },
)

Staff.beforeCreate((row) => {
  if (!row.id) row.id = newId('st')
})
