import type { DemoUser, Quarry } from '@/types/app'

export const DEMO_QUARRIES: Quarry[] = [
  {
    id: 'q_chitha',
    name: 'Chithanavasal',
    code: 'CHITHA',
    place: 'Illuppur / Pudukkottai',
  },
  {
    id: 'q_ariyur',
    name: 'Ariyur',
    code: 'ARIYUR',
    place: 'Madurai Dist',
  },
]

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'u_owner',
    name: 'B. Arun',
    username: 'owner',
    password: 'owner123',
    role: 'Owner',
    quarryIds: ['*'],
    lastQuarryId: 'q_chitha',
    active: true,
  },
  {
    id: 'u_acc',
    name: 'Thalapathi',
    username: 'accounts',
    password: 'acc123',
    role: 'Accountant',
    quarryIds: ['q_chitha', 'q_ariyur'],
    lastQuarryId: 'q_chitha',
    active: true,
  },
  {
    id: 'u_chitha',
    name: 'Chithanavasal office',
    username: 'chitha',
    password: 'chitha123',
    role: 'Accountant',
    quarryIds: ['q_chitha'],
    lastQuarryId: 'q_chitha',
    active: true,
  },
  {
    id: 'u_view',
    name: 'Office Viewer',
    username: 'view',
    password: 'view123',
    role: 'Viewer',
    quarryIds: ['q_chitha'],
    lastQuarryId: 'q_chitha',
    active: true,
  },
]

export const DEMO_LOGINS = [
  { username: 'owner', password: 'owner123', hint: 'all quarries' },
  { username: 'accounts', password: 'acc123', hint: 'both quarries' },
  { username: 'chitha', password: 'chitha123', hint: 'Chithanavasal only' },
  { username: 'view', password: 'view123', hint: 'Dashboard & P&L only' },
] as const
