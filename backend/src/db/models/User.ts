import { DataTypes, Model, type Optional } from 'sequelize'

import { newId } from '../../lib/marking.js'
import { sequelize } from '../sequelize.js'

export const USER_ROLES = ['Owner', 'Accountant', 'Viewer'] as const
export type UserRole = (typeof USER_ROLES)[number]

export interface UserAttributes {
  id: string
  name: string
  username: string
  passwordHash: string
  role: UserRole
  quarryIds: string[]
  lastQuarryId: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

type UserCreation = Optional<UserAttributes, 'id' | 'lastQuarryId' | 'active' | 'createdAt' | 'updatedAt'>

export class User extends Model<UserAttributes, UserCreation> implements UserAttributes {
  declare id: string
  declare name: string
  declare username: string
  declare passwordHash: string
  declare role: UserRole
  declare quarryIds: string[]
  declare lastQuarryId: string
  declare active: boolean
  declare createdAt: Date
  declare updatedAt: Date
}

User.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
    quarryIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    lastQuarryId: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'User',
    indexes: [{ unique: true, fields: ['username'] }, { fields: ['role'] }, { fields: ['active'] }],
  },
)

User.beforeCreate((row) => {
  if (!row.id) row.id = newId('u')
})
