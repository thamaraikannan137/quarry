import { LogoutOutlined } from '@ant-design/icons'
import { Avatar, Dropdown, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'

import { PRIMARY_COLORS } from '@/configs/themeConfig'
import { quarryAccessLabel, useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'

export function UserDropdown() {
  const { user, quarries, signOut } = useAuth()
  const { settings, updateSettings } = useSettings()

  if (!user) return null

  const items: MenuProps['items'] = [
    {
      key: 'meta',
      label: (
        <div style={{ maxWidth: 220 }}>
          <Typography.Text strong>{user.name}</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {user.role} · @{user.username}
          </Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {quarryAccessLabel(user, quarries)}
          </Typography.Text>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'colors',
      label: 'Primary color',
      children: PRIMARY_COLORS.map((color) => ({
        key: color.value,
        label: (
          <Space>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: color.value,
                display: 'inline-block',
                border: settings.primaryColor === color.value ? '2px solid #000' : '1px solid #d9d9d9',
              }}
            />
            {color.name}
          </Space>
        ),
        onClick: () => updateSettings({ primaryColor: color.value }),
      })),
    },
    { type: 'divider' },
    {
      key: 'signout',
      icon: <LogoutOutlined />,
      label: 'Sign out',
      danger: true,
      onClick: () => signOut(),
    },
  ]

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      <Space className="user-chip" size={8} align="center" style={{ cursor: 'pointer', lineHeight: 1.2 }}>
        <Avatar style={{ backgroundColor: settings.primaryColor, flexShrink: 0 }}>
          {user.name.trim().charAt(0).toUpperCase()}
        </Avatar>
        <span className="user-chip-text">
          <Typography.Text strong style={{ display: 'block', lineHeight: 1.2 }}>
            {user.name}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.2 }}>
            {user.role}
          </Typography.Text>
        </span>
      </Space>
    </Dropdown>
  )
}
