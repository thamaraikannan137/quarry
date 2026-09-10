import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Button, Drawer, Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { Logo } from '@/components/layout/Logo'
import { navIcon } from '@/components/layout/navIcons'
import { NAV_COLLAPSED_WIDTH, NAV_WIDTH } from '@/configs/themeConfig'
import { useAuth } from '@/contexts/AuthContext'
import { useNav } from '@/contexts/NavContext'
import { useSettings } from '@/contexts/SettingsContext'
import { filterNav } from '@/data/navItems'
import type { NavGroup } from '@/types/app'

type SidebarProps = {
  inDrawer?: boolean
}

const OPEN_KEYS_STORAGE = 'quarry-nav-open-v2'

const GROUP_ICONS: Record<string, string> = {
  overview: 'DashboardOutlined',
  cash: 'WalletOutlined',
  production: 'AppstoreOutlined',
  expenses: 'ShoppingCartOutlined',
  hr: 'TeamOutlined',
  setup: 'SettingOutlined',
}

function menuSelectedKey(pathname: string) {
  if (pathname.startsWith('/marking')) return '/marking'
  if (pathname.startsWith('/loads')) return '/loads'
  if (pathname.startsWith('/customers')) return '/customers'
  if (pathname.startsWith('/vendors')) return '/vendors'
  if (pathname.startsWith('/staff')) return '/staff'
  if (pathname.startsWith('/finance')) return '/finance'
  if (pathname.startsWith('/ledger') || pathname.startsWith('/cash-float')) return '/ledger'
  return pathname
}

function groupIdForPath(pathname: string, groups: NavGroup[]) {
  const selected = menuSelectedKey(pathname)
  return groups.find((group) =>
    group.items.some((item) => item.path === selected || (selected !== '/' && selected.startsWith(`${item.path}/`))),
  )?.id
}

function readOpenKeys(fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(OPEN_KEYS_STORAGE)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function Sidebar({ inDrawer = false }: SidebarProps) {
  const { user } = useAuth()
  const { isMobile, mobileOpen, closeMobile } = useNav()
  const { settings, updateSettings } = useSettings()
  const location = useLocation()
  const navigate = useNavigate()
  const collapsed = !isMobile && !inDrawer && settings.layout === 'collapsed'

  const groups = useMemo(() => (user ? filterNav(user.role) : []), [user])
  const groupKeySet = useMemo(() => new Set(groups.map((group) => group.id)), [groups])
  const activeGroupId = useMemo(
    () => groupIdForPath(location.pathname, groups),
    [location.pathname, groups],
  )
  const selectedKey = menuSelectedKey(location.pathname)

  const [openKeys, setOpenKeys] = useState<string[]>(() =>
    readOpenKeys(activeGroupId ? [activeGroupId] : groups[0] ? [groups[0].id] : []),
  )

  // Keep the section for the current page open
  useEffect(() => {
    if (!activeGroupId || collapsed) return
    setOpenKeys((current) => (current.includes(activeGroupId) ? current : [...current, activeGroupId]))
  }, [activeGroupId, collapsed])

  useEffect(() => {
    if (collapsed) return
    localStorage.setItem(OPEN_KEYS_STORAGE, JSON.stringify(openKeys))
  }, [openKeys, collapsed])

  const items: MenuProps['items'] = useMemo(
    () =>
      groups.map((group) => ({
        key: group.id,
        icon: navIcon(GROUP_ICONS[group.id] ?? 'AppstoreOutlined'),
        label: group.label,
        children: group.items.map((item) => ({
          key: item.path,
          icon: navIcon(item.icon),
          label: item.label,
        })),
      })),
    [groups],
  )

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
        selectedKeys={[selectedKey]}
        openKeys={collapsed ? undefined : openKeys}
        onOpenChange={(keys) => {
          // Only section keys (not leaf paths)
          setOpenKeys(keys.filter((key) => groupKeySet.has(String(key))))
        }}
        inlineCollapsed={collapsed}
        items={items}
        style={{ flex: 1, borderInlineEnd: 'none', overflow: 'auto' }}
        onClick={({ key }) => {
          if (groupKeySet.has(String(key))) return
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
