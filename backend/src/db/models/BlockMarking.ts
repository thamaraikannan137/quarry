import { DataTypes, Model, type Optional } from 'sequelize'

import { newId } from '../../lib/marking.js'
import { sequelize } from '../sequelize.js'
import type { DispatchTripBlock } from './DispatchTripBlock.js'
import type { Party } from './Party.js'

export interface BlockMarkingAttributes {
  id: string
  batchId: string
  /** Human-facing id, e.g. MK-001 — same pattern as load LD-001. */
  markingNo: string | null
  quarryId: string
  partyId: string
  date: string
  blockNo: string
  choice: string
  l: number
  w: number
  h: number
  rate: number
  gstPct: number
  markerName: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

type BlockMarkingCreation = Optional<
  BlockMarkingAttributes,
  'id' | 'markingNo' | 'choice' | 'gstPct' | 'markerName' | 'notes' | 'createdAt' | 'updatedAt'
>

export class BlockMarking
  extends Model<BlockMarkingAttributes, BlockMarkingCreation>
  implements BlockMarkingAttributes
{
  declare id: string
  declare batchId: string
  declare markingNo: string | null
  declare quarryId: string
  declare partyId: string
  declare date: string
  declare blockNo: string
  declare choice: string
  declare l: number
  declare w: number
  declare h: number
  declare rate: number
  declare gstPct: number
  declare markerName: string | null
  declare notes: string | null
  declare createdAt: Date
  declare updatedAt: Date

  declare loads?: DispatchTripBlock[]
  declare party?: Party
}

BlockMarking.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    batchId: { type: DataTypes.STRING, allowNull: false },
    markingNo: { type: DataTypes.STRING, allowNull: true },
    quarryId: { type: DataTypes.STRING, allowNull: false },
    partyId: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    blockNo: { type: DataTypes.STRING, allowNull: false },
    choice: { type: DataTypes.STRING, allowNull: false, defaultValue: 'I' },
    l: { type: DataTypes.DOUBLE, allowNull: false },
    w: { type: DataTypes.DOUBLE, allowNull: false },
    h: { type: DataTypes.DOUBLE, allowNull: false },
    rate: { type: DataTypes.DOUBLE, allowNull: false },
    gstPct: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 18 },
    markerName: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'BlockMarking',
    indexes: [
      { fields: ['quarryId'] },
      { fields: ['partyId'] },
      { fields: ['batchId'] },
      { fields: ['date'] },
    ],
  },
)

BlockMarking.beforeCreate((row) => {
  if (!row.id) row.id = newId('bm')
})
