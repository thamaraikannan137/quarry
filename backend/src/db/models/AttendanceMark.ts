import { DataTypes, Model, type Optional } from 'sequelize'

import { newId } from '../../lib/marking.js'
import { sequelize } from '../sequelize.js'

export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'HalfDay'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export interface AttendanceMarkAttributes {
  id: string
  quarryId: string
  staffId: string
  date: string
  status: string
  createdAt: Date
  updatedAt: Date
}

type AttendanceMarkCreation = Optional<AttendanceMarkAttributes, 'id' | 'createdAt' | 'updatedAt'>

export class AttendanceMark
  extends Model<AttendanceMarkAttributes, AttendanceMarkCreation>
  implements AttendanceMarkAttributes
{
  declare id: string
  declare quarryId: string
  declare staffId: string
  declare date: string
  declare status: string
  declare createdAt: Date
  declare updatedAt: Date
}

AttendanceMark.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    quarryId: { type: DataTypes.STRING, allowNull: false },
    staffId: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'AttendanceMark',
    indexes: [
      { unique: true, fields: ['staffId', 'date'] },
      { fields: ['quarryId', 'date'] },
    ],
  },
)

AttendanceMark.beforeCreate((row) => {
  if (!row.id) row.id = newId('at')
})
