import { DataTypes, Model, type Optional } from 'sequelize'

import { newId } from '../../lib/marking.js'
import { sequelize } from '../sequelize.js'

export interface LoanAttributes {
  id: string
  vehicleNo: string
  borrower: string
  loanNo: string
  bank: string
  informDay: number
  dueDay: number
  emiAmount: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

type LoanCreation = Optional<
  LoanAttributes,
  'id' | 'borrower' | 'loanNo' | 'bank' | 'informDay' | 'dueDay' | 'emiAmount' | 'active' | 'createdAt' | 'updatedAt'
>

export class Loan extends Model<LoanAttributes, LoanCreation> implements LoanAttributes {
  declare id: string
  declare vehicleNo: string
  declare borrower: string
  declare loanNo: string
  declare bank: string
  declare informDay: number
  declare dueDay: number
  declare emiAmount: number
  declare active: boolean
  declare createdAt: Date
  declare updatedAt: Date
}

Loan.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    vehicleNo: { type: DataTypes.STRING, allowNull: false },
    borrower: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    loanNo: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    bank: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    informDay: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    dueDay: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    emiAmount: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'Loan',
    indexes: [{ fields: ['active'] }, { fields: ['dueDay'] }, { fields: ['vehicleNo'] }],
  },
)

Loan.beforeCreate((row) => {
  if (!row.id) row.id = newId('ln')
})
