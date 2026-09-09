import { api } from '@/api/http'
import type { AppUser, Role } from '@/types/app'

export type UserDraft = {
  name: string
  username: string
  password?: string
  role: Role
  quarryIds: string[]
  active: boolean
}

export async function listUsers() {
  return api<AppUser[]>('/api/users')
}

export async function createUser(input: UserDraft & { password: string }) {
  return api<AppUser>('/api/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateUser(id: string, input: UserDraft) {
  const body: Record<string, unknown> = {
    name: input.name,
    username: input.username,
    role: input.role,
    quarryIds: input.quarryIds,
    active: input.active,
  }
  if (input.password) body.password = input.password
  return api<AppUser>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteUser(id: string) {
  await api<void>(`/api/users/${id}`, { method: 'DELETE' })
}
