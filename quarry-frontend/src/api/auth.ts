import { api } from '@/api/http'
import type { AppUser, SessionUser } from '@/types/app'

export async function loginUser(username: string, password: string) {
  return api<AppUser>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function toSessionUser(user: AppUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    quarryIds: user.quarryIds,
    lastQuarryId: user.lastQuarryId,
  }
}
