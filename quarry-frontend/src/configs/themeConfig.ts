import type { LayoutMode, Settings, ThemeMode } from '@/types/app'

export const NAV_WIDTH = 240
export const NAV_COLLAPSED_WIDTH = 80
export const NAV_BREAKPOINT = 1200

export const PRIMARY_COLORS = [
  { name: 'Blue', value: '#1677ff' },
  { name: 'Teal', value: '#13c2c2' },
  { name: 'Red', value: '#f5222d' },
  { name: 'Orange', value: '#fa8c16' },
  { name: 'Purple', value: '#722ed1' },
] as const

export const themeConfig = {
  templateName: 'Arun Granites',
  homePageUrl: '/',
  settingsStorageKey: 'quarry-settings-antd',
  sessionStorageKey: 'quarry-session',
  mode: 'system' as ThemeMode,
  layout: 'vertical' as LayoutMode,
  primaryColor: '#1677ff',
}

export const defaultSettings: Settings = {
  mode: themeConfig.mode,
  layout: themeConfig.layout,
  primaryColor: themeConfig.primaryColor,
}
