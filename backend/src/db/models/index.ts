import { AttendanceMark } from './AttendanceMark.js'
import { BlockMarking } from './BlockMarking.js'
import { DispatchTrip } from './DispatchTrip.js'
import { DispatchTripBlock } from './DispatchTripBlock.js'
import { Party } from './Party.js'
import { Quarry } from './Quarry.js'
import { Staff } from './Staff.js'
import { Transaction } from './Transaction.js'

Quarry.hasMany(Party, { foreignKey: 'quarryId' })
Party.belongsTo(Quarry, { foreignKey: 'quarryId' })

Quarry.hasMany(BlockMarking, { foreignKey: 'quarryId' })
BlockMarking.belongsTo(Quarry, { foreignKey: 'quarryId' })

Party.hasMany(BlockMarking, { foreignKey: 'partyId' })
BlockMarking.belongsTo(Party, { foreignKey: 'partyId', as: 'party' })

Quarry.hasMany(DispatchTrip, { foreignKey: 'quarryId' })
DispatchTrip.belongsTo(Quarry, { foreignKey: 'quarryId' })

DispatchTrip.hasMany(DispatchTripBlock, {
  foreignKey: 'tripId',
  as: 'blocks',
  onDelete: 'CASCADE',
})
DispatchTripBlock.belongsTo(DispatchTrip, { foreignKey: 'tripId', as: 'trip' })

BlockMarking.hasMany(DispatchTripBlock, { foreignKey: 'blockId', as: 'loads' })
DispatchTripBlock.belongsTo(BlockMarking, { foreignKey: 'blockId', as: 'block' })

Quarry.hasMany(Transaction, { foreignKey: 'quarryId' })
Transaction.belongsTo(Quarry, { foreignKey: 'quarryId' })

Party.hasMany(Transaction, { foreignKey: 'partyId' })
Transaction.belongsTo(Party, { foreignKey: 'partyId' })

Quarry.hasMany(Staff, { foreignKey: 'quarryId' })
Staff.belongsTo(Quarry, { foreignKey: 'quarryId' })

Staff.hasMany(AttendanceMark, { foreignKey: 'staffId' })
AttendanceMark.belongsTo(Staff, { foreignKey: 'staffId' })
Quarry.hasMany(AttendanceMark, { foreignKey: 'quarryId' })
AttendanceMark.belongsTo(Quarry, { foreignKey: 'quarryId' })

export { sequelize } from '../sequelize.js'
export { AttendanceMark, BlockMarking, DispatchTrip, DispatchTripBlock, Party, Quarry, Staff, Transaction }
