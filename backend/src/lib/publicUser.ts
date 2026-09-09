import { User } from '../db/models/User.js'
import type { UserRole } from '../db/models/User.js'

export type PublicUser = {
  id: string
  name: string
  username: string
  role: UserRole
  quarryIds: string[]
  lastQuarryId: string
  active: boolean
}

export function publicUser(row: User): PublicUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    quarryIds: Array.isArray(row.quarryIds) ? row.quarryIds : [],
    lastQuarryId: row.lastQuarryId,
    active: row.active,
  }
}
