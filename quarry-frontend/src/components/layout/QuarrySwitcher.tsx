import { DownOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { Button, Dropdown, Typography } from 'antd'
import type { MenuProps } from 'antd'

import { useAuth } from '@/contexts/AuthContext'

export function QuarrySwitcher() {
  const { allowedQuarries, activeQuarry, setActiveQuarry } = useAuth()

  if (!activeQuarry) return null

  const items: MenuProps['items'] = allowedQuarries.map((quarry) => ({
    key: quarry.id,
    label: (
      <div>
        <div>{quarry.name}</div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {quarry.code} · {quarry.place}
        </Typography.Text>
      </div>
    ),
    onClick: () => setActiveQuarry(quarry.id),
  }))

  return (
    <Dropdown menu={{ items, selectedKeys: [activeQuarry.id] }} trigger={['click']}>
      <Button>
        <EnvironmentOutlined />
        <span className="quarry-label">{activeQuarry.name}</span>
        <DownOutlined style={{ fontSize: 10 }} />
      </Button>
    </Dropdown>
  )
}
