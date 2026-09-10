import { AttendanceMark } from './AttendanceMark.js'
import { BlockMarking } from './BlockMarking.js'
import { Customer } from './Customer.js'
import { DispatchTrip } from './DispatchTrip.js'
import { DispatchTripBlock } from './DispatchTripBlock.js'
import { Loan } from './Loan.js'
import { LoanPayment } from './LoanPayment.js'
import { Quarry } from './Quarry.js'
import { Staff } from './Staff.js'
import { Transaction } from './Transaction.js'
import { User } from './User.js'
import { Vendor } from './Vendor.js'

Quarry.hasMany(Customer, { foreignKey: 'quarryId' })
Customer.belongsTo(Quarry, { foreignKey: 'quarryId' })

Quarry.hasMany(Vendor, { foreignKey: 'quarryId' })
Vendor.belongsTo(Quarry, { foreignKey: 'quarryId' })

Quarry.hasMany(BlockMarking, { foreignKey: 'quarryId' })
BlockMarking.belongsTo(Quarry, { foreignKey: 'quarryId' })

Customer.hasMany(BlockMarking, { foreignKey: 'partyId' })
BlockMarking.belongsTo(Customer, { foreignKey: 'partyId', as: 'party' })

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

Quarry.hasMany(Staff, { foreignKey: 'quarryId' })
Staff.belongsTo(Quarry, { foreignKey: 'quarryId' })

Staff.hasMany(AttendanceMark, { foreignKey: 'staffId' })
AttendanceMark.belongsTo(Staff, { foreignKey: 'staffId' })
Quarry.hasMany(AttendanceMark, { foreignKey: 'quarryId' })
AttendanceMark.belongsTo(Quarry, { foreignKey: 'quarryId' })

Loan.hasMany(LoanPayment, { foreignKey: 'loanId', as: 'payments', onDelete: 'CASCADE' })
LoanPayment.belongsTo(Loan, { foreignKey: 'loanId' })
Quarry.hasMany(LoanPayment, { foreignKey: 'quarryId' })
LoanPayment.belongsTo(Quarry, { foreignKey: 'quarryId' })
Transaction.hasMany(LoanPayment, { foreignKey: 'transactionId' })
LoanPayment.belongsTo(Transaction, { foreignKey: 'transactionId' })
Loan.hasMany(Transaction, { foreignKey: 'loanId' })
Transaction.belongsTo(Loan, { foreignKey: 'loanId' })

export { sequelize } from '../sequelize.js'
export {
  AttendanceMark,
  BlockMarking,
  Customer,
  DispatchTrip,
  DispatchTripBlock,
  Loan,
  LoanPayment,
  Quarry,
  Staff,
  Transaction,
  User,
  Vendor,
}
