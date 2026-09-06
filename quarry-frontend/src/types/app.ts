export type Role = 'Owner' | 'Accountant' | 'Viewer'

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
}

export type SessionUser = {
  id: string
  name: string
  username: string
  role: Role
  quarryIds: string[]
  lastQuarryId: string
}

export type DemoUser = SessionUser & {
  password: string
  active: boolean
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
