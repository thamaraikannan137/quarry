import { DataTypes, Model, type Optional } from 'sequelize'

import { dateonlyAttribute } from '../../lib/isoDate.js'
import { newId } from '../../lib/marking.js'
import { sequelize } from '../sequelize.js'

export interface LedgerAttributes {
  id: string
  quarryId: string
  holderName: string
  personId: string | null
  date: string
  amount: number
  notes: string
  status: string
  returnedAmount: number
  closedDate: string | null
  createdAt: Date
  updatedAt: Date
}

type LedgerCreation = Optional<
  LedgerAttributes,
  | 'id'
  | 'personId'
  | 'notes'
  | 'status'
  | 'returnedAmount'
  | 'closedDate'
  | 'createdAt'
  | 'updatedAt'
>

export class Ledger extends Model<LedgerAttributes, LedgerCreation> implements LedgerAttributes {
  declare id: string
  declare quarryId: string
  declare holderName: string
  declare personId: string | null
  declare date: string
  declare amount: number
  declare notes: string
  declare status: string
  declare returnedAmount: number
  declare closedDate: string | null
  declare createdAt: Date
  declare updatedAt: Date
}

Ledger.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    quarryId: { type: DataTypes.STRING, allowNull: false },
    holderName: { type: DataTypes.STRING, allowNull: false },
    personId: { type: DataTypes.STRING, allowNull: true },
    date: dateonlyAttribute('date'),
    amount: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
    notes: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'open' },
    returnedAmount: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
    closedDate: dateonlyAttribute('closedDate', { allowNull: true, defaultValue: null }),
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'Ledger',
    indexes: [
      { fields: ['quarryId'] },
      { fields: ['status'] },
      { fields: ['date'] },
      { fields: ['personId'] },
    ],
  },
)

Ledger.beforeCreate((row) => {
  if (!row.id) row.id = newId('ldg')
})
