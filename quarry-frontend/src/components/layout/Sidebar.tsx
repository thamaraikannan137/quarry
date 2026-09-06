import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Button, Drawer, Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { Logo } from '@/components/layout/Logo'
import { navIcon } from '@/components/layout/navIcons'
import { NAV_COLLAPSED_WIDTH, NAV_WIDTH } from '@/configs/themeConfig'
import { useAuth } from '@/contexts/AuthContext'
import { useNav } from '@/contexts/NavContext'
import { useSettings } from '@/contexts/SettingsContext'
import { filterNav } from '@/data/navItems'

type SidebarProps = {
  inDrawer?: boolean
}

export function Sidebar({ inDrawer = false }: SidebarProps) {
  const { user } = useAuth()
  const { isMobile, mobileOpen, closeMobile } = useNav()
  const { settings, updateSettings } = useSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const collapsed = !isMobile && !inDrawer && settings.layout === 'collapsed'

  const items: MenuProps['items'] = useMemo(() => {
    const groups = user ? filterNav(user.role) : []
    return groups.map((group) => ({
      type: 'group' as const,
      key: group.id,
      label: collapsed ? null : group.label,
      children: group.items.map((item) => ({
        key: item.path,
        icon: navIcon(item.icon),
        label: item.label,
      })),
    }))
  }, [user, collapsed])

  const menu = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 8px' : '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Logo collapsed={collapsed} light />
        {!isMobile && !inDrawer && (
          <Button
            type="text"
            size="small"
            style={{ color: 'rgba(255,255,255,0.75)' }}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => updateSettings({ layout: collapsed ? 'vertical' : 'collapsed' })}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          />
        )}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[
          location.pathname.startsWith('/marking')
            ? '/marking'
            : location.pathname.startsWith('/loads')
              ? '/loads'
              : location.pathname.startsWith('/customers')
                ? '/customers'
                : location.pathname,
        ]}
        inlineCollapsed={collapsed}
        items={items}
        style={{ flex: 1, borderInlineEnd: 'none', overflow: 'auto' }}
        onClick={({ key }) => {
          navigate(String(key))
          closeMobile()
        }}
      />
    </div>
  )

  if (inDrawer || isMobile) {
    return (
      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={closeMobile}
        width={NAV_WIDTH}
        styles={{ body: { padding: 0, background: '#001529' }, header: { display: 'none' } }}
      >
        {menu}
      </Drawer>
    )
  }

  return (
    <Layout.Sider
      theme="dark"
      width={NAV_WIDTH}
      collapsedWidth={NAV_COLLAPSED_WIDTH}
      collapsed={collapsed}
      trigger={null}
      style={{
        overflow: 'auto',
        height: '100dvh',
        position: 'sticky',
        insetInlineStart: 0,
        top: 0,
      }}
    >
      {menu}
    </Layout.Sider>
  )
}
