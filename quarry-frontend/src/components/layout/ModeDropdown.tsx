import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import type { ReactNode } from 'react'

import { useSettings } from '@/contexts/SettingsContext'
import type { ThemeMode } from '@/types/app'

const modes: { key: ThemeMode; label: string; icon: ReactNode }[] = [
  { key: 'light', label: 'Light', icon: <SunOutlined /> },
  { key: 'dark', label: 'Dark', icon: <MoonOutlined /> },
  { key: 'system', label: 'System', icon: <DesktopOutlined /> },
]

function modeIcon(mode: ThemeMode) {
  if (mode === 'dark') return <MoonOutlined />
  if (mode === 'system') return <DesktopOutlined />
  return <SunOutlined />
}

export function ModeDropdown() {
  const { settings, updateSettings } = useSettings()

  const items: MenuProps['items'] = modes.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    onClick: () => updateSettings({ mode: item.key }),
  }))

  return (
    <Dropdown menu={{ items, selectedKeys: [settings.mode] }} placement="bottomRight" trigger={['click']}>
      <Button type="text" icon={modeIcon(settings.mode)} aria-label="Theme mode" />
    </Dropdown>
  )
}
