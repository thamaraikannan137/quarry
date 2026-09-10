import { DataTypes, Model, type Optional } from 'sequelize'

import { dateonlyAttribute } from '../../lib/isoDate.js'
import { newId } from '../../lib/marking.js'
import { sequelize } from '../sequelize.js'

export interface LoanPaymentAttributes {
  id: string
  loanId: string
  quarryId: string
  ym: string
  date: string
  amount: number
  transactionId: string
  createdAt: Date
  updatedAt: Date
}

type LoanPaymentCreation = Optional<LoanPaymentAttributes, 'id' | 'createdAt' | 'updatedAt'>

export class LoanPayment
  extends Model<LoanPaymentAttributes, LoanPaymentCreation>
  implements LoanPaymentAttributes
{
  declare id: string
  declare loanId: string
  declare quarryId: string
  declare ym: string
  declare date: string
  declare amount: number
  declare transactionId: string
  declare createdAt: Date
  declare updatedAt: Date
}

LoanPayment.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    loanId: { type: DataTypes.STRING, allowNull: false },
    quarryId: { type: DataTypes.STRING, allowNull: false },
    ym: { type: DataTypes.STRING(7), allowNull: false },
    date: dateonlyAttribute('date'),
    amount: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
    transactionId: { type: DataTypes.STRING, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'LoanPayment',
    indexes: [
      { fields: ['loanId'] },
      { fields: ['quarryId'] },
      { fields: ['transactionId'] },
      { unique: true, name: 'loan_payment_loan_ym', fields: ['loanId', 'ym'] },
    ],
  },
)

LoanPayment.beforeCreate((row) => {
  if (!row.id) row.id = newId('lp')
})
