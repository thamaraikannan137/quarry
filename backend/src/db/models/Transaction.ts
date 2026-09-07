import { DataTypes, Model, type Optional } from 'sequelize'

import { newId } from '../../lib/marking.js'
import { sequelize } from '../sequelize.js'

export interface TransactionAttributes {
  id: string
  quarryId: string
  date: string
  type: string
  head: string
  particulars: string
  debit: number
  credit: number
  partyId: string | null
  personId: string | null
  labourId: string | null
  litres: number | null
  refNote: string | null
  markingBatchId: string | null
  paymentMethod: string | null
  createdAt: Date
  updatedAt: Date
}

type TransactionCreation = Optional<
  TransactionAttributes,
  | 'id'
  | 'particulars'
  | 'debit'
  | 'credit'
  | 'partyId'
  | 'personId'
  | 'labourId'
  | 'litres'
  | 'refNote'
  | 'markingBatchId'
  | 'paymentMethod'
  | 'createdAt'
  | 'updatedAt'
>

export class Transaction
  extends Model<TransactionAttributes, TransactionCreation>
  implements TransactionAttributes
{
  declare id: string
  declare quarryId: string
  declare date: string
  declare type: string
  declare head: string
  declare particulars: string
  declare debit: number
  declare credit: number
  declare partyId: string | null
  declare personId: string | null
  declare labourId: string | null
  declare litres: number | null
  declare refNote: string | null
  declare markingBatchId: string | null
  declare paymentMethod: string | null
  declare createdAt: Date
  declare updatedAt: Date
}

Transaction.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    quarryId: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    head: { type: DataTypes.STRING, allowNull: false },
    particulars: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    debit: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
    credit: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
    partyId: { type: DataTypes.STRING, allowNull: true },
    personId: { type: DataTypes.STRING, allowNull: true },
    labourId: { type: DataTypes.STRING, allowNull: true },
    litres: { type: DataTypes.DOUBLE, allowNull: true },
    refNote: { type: DataTypes.STRING, allowNull: true },
    markingBatchId: { type: DataTypes.STRING, allowNull: true },
    paymentMethod: { type: DataTypes.STRING, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'Transaction',
    indexes: [
      { fields: ['quarryId'] },
      { fields: ['partyId'] },
      { fields: ['markingBatchId'] },
      { fields: ['date'] },
      { fields: ['head'] },
    ],
  },
)

Transaction.beforeCreate((row) => {
  if (!row.id) row.id = newId('tx')
})
