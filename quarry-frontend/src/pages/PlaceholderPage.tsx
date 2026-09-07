import { Card, Typography } from 'antd'
import { useLocation } from 'react-router'

import { useAuth } from '@/contexts/AuthContext'
import { findNavItem } from '@/data/navItems'

export function PlaceholderPage() {
  const location = useLocation()
  const { user, activeQuarry } = useAuth()
  const item = findNavItem(location.pathname)

  return (
    <Card>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {item?.label ?? 'Page'}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        {activeQuarry ? `${activeQuarry.name} · ${user?.role}` : user?.role}
      </Typography.Paragraph>
      <Typography.Paragraph>
        This module will be built in a later phase. Dashboard, All Transactions, Customers, Vendors, Staff Management, Attendance, Salary Sheet, Block Marking, Block Load, Purchase & Expense, Monthly Gift, Royalty, and Machinery Rent are ready.
      </Typography.Paragraph>
    </Card>
  )
}
