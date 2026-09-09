export const ROLES = ['Owner', 'Accountant', 'Viewer'] as const
export type Role = (typeof ROLES)[number]

export type ThemeMode = 'system' | 'light' | 'dark'

export type LayoutMode = 'vertical' | 'collapsed'

export type Settings = {
  mode: ThemeMode
  layout: LayoutMode
  primaryColor: string
}

export type Quarry = {
  id: string
  name: string
  code: string
  place: string
  gstPct: number
}

export type SessionUser = {
  id: string
  name: string
  username: string
  role: Role
  quarryIds: string[]
  lastQuarryId: string
}

export type AppUser = SessionUser & {
  active: boolean
}

export type DemoUser = AppUser & {
  password: string
}

export type NavItem = {
  label: string
  path: string
  icon: string
  ownerOnly?: boolean
  viewerAllowed?: boolean
}

export type NavGroup = {
  id: string
  label: string
  items: NavItem[]
}
