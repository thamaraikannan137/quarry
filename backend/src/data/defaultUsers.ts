import { hashPassword } from '../lib/password.js'
import { User, type UserRole } from '../db/models/User.js'

export const DEFAULT_USERS: {
  id: string
  name: string
  username: string
  password: string
  role: UserRole
  quarryIds: string[]
  lastQuarryId: string
}[] = [
  {
    id: 'u_owner',
    name: 'B. Arun',
    username: 'owner',
    password: 'owner123',
    role: 'Owner',
    quarryIds: ['*'],
    lastQuarryId: 'q_chitha',
  },
  {
    id: 'u_acc',
    name: 'Thalapathi',
    username: 'accounts',
    password: 'acc123',
    role: 'Accountant',
    quarryIds: ['q_chitha', 'q_ariyur'],
    lastQuarryId: 'q_chitha',
  },
  {
    id: 'u_chitha',
    name: 'Chithanavasal office',
    username: 'chitha',
    password: 'chitha123',
    role: 'Accountant',
    quarryIds: ['q_chitha'],
    lastQuarryId: 'q_chitha',
  },
  {
    id: 'u_view',
    name: 'Office Viewer',
    username: 'view',
    password: 'view123',
    role: 'Viewer',
    quarryIds: ['q_chitha'],
    lastQuarryId: 'q_chitha',
  },
]

export async function ensureDefaultUsers() {
  await User.sync()
  const existing = await User.findAll({ attributes: ['id', 'username'] })
  const haveId = new Set(existing.map((row) => row.id))
  const haveName = new Set(existing.map((row) => row.username))
  for (const row of DEFAULT_USERS) {
    if (haveId.has(row.id) || haveName.has(row.username)) continue
    await User.create({
      id: row.id,
      name: row.name,
      username: row.username,
      passwordHash: await hashPassword(row.password),
      role: row.role,
      quarryIds: row.quarryIds,
      lastQuarryId: row.lastQuarryId,
      active: true,
    })
  }
}
