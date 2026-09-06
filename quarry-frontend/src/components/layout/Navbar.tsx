import { MenuOutlined } from '@ant-design/icons'
import { Button, Layout, Space } from 'antd'

import { ModeDropdown } from '@/components/layout/ModeDropdown'
import { QuarrySwitcher } from '@/components/layout/QuarrySwitcher'
import { UserDropdown } from '@/components/layout/UserDropdown'
import { useNav } from '@/contexts/NavContext'
import { useSettings } from '@/contexts/SettingsContext'

const { Header } = Layout

export function Navbar() {
  const { isMobile, toggleMobile } = useNav()
  const { resolvedMode } = useSettings()

  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '0 16px',
        background: resolvedMode === 'dark' ? '#141414' : '#fff',
        borderBottom: `1px solid ${resolvedMode === 'dark' ? '#303030' : '#f0f0f0'}`,
        height: 64,
        lineHeight: '64px',
      }}
    >
      <Space size={12}>
        {isMobile && (
          <Button type="text" icon={<MenuOutlined />} onClick={toggleMobile} aria-label="Open menu" />
        )}
        <QuarrySwitcher />
      </Space>
      <Space size={8}>
        <ModeDropdown />
        <UserDropdown />
      </Space>
    </Header>
  )
}
