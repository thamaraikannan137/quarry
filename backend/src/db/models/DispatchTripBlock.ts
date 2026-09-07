import { DataTypes, Model } from 'sequelize'

import { sequelize } from '../sequelize.js'
import type { BlockMarking } from './BlockMarking.js'
import type { DispatchTrip } from './DispatchTrip.js'

export interface DispatchTripBlockAttributes {
  tripId: string
  blockId: string
}

export class DispatchTripBlock
  extends Model<DispatchTripBlockAttributes>
  implements DispatchTripBlockAttributes
{
  declare tripId: string
  declare blockId: string
  declare trip?: DispatchTrip
  declare block?: BlockMarking
}

DispatchTripBlock.init(
  {
    tripId: { type: DataTypes.STRING, primaryKey: true },
    blockId: { type: DataTypes.STRING, primaryKey: true },
  },
  {
    sequelize,
    tableName: 'DispatchTripBlock',
    timestamps: false,
    indexes: [{ fields: ['blockId'] }],
  },
)
