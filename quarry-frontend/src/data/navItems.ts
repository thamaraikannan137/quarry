import type { NavGroup, NavItem, Role } from '@/types/app'

export const navGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: 'DashboardOutlined', viewerAllowed: true },
      { label: 'All Transactions', path: '/transactions', icon: 'SwapOutlined' },
      { label: 'Reports / P&L', path: '/reports', icon: 'BarChartOutlined', viewerAllowed: true },
    ],
  },
  {
    id: 'procurement',
    label: 'Procurement & Sale',
    items: [
      { label: 'Block Marking', path: '/marking', icon: 'AppstoreOutlined' },
      { label: 'Block Load', path: '/loads', icon: 'CarOutlined' },
      { label: 'Procurement & Sale', path: '/sale', icon: 'ShoppingOutlined' },
      { label: 'Proforma Invoice', path: '/invoices', icon: 'FileTextOutlined' },
      { label: 'Customer', path: '/customers', icon: 'UserOutlined' },
    ],
  },
  {
    id: 'purchase',
    label: 'Purchase & Expense',
    items: [
      { label: 'Purchase & Expense', path: '/purchase', icon: 'ShoppingCartOutlined' },
      { label: 'Finance / Loan', path: '/finance', icon: 'CreditCardOutlined' },
      { label: 'Monthly Gift', path: '/gift', icon: 'GiftOutlined' },
      { label: 'Royalty', path: '/royalty', icon: 'BankOutlined' },
      { label: 'Machinery', path: '/machinery', icon: 'CarOutlined' },
      { label: 'Vendor', path: '/vendors', icon: 'ShopOutlined' },
    ],
  },
  {
    id: 'hr',
    label: 'HR & Payroll',
    items: [
      { label: 'Staff Management', path: '/staff', icon: 'TeamOutlined' },
      { label: 'Attendance', path: '/attendance', icon: 'CalendarOutlined' },
      { label: 'Salary Sheet', path: '/salary', icon: 'DollarOutlined' },
      { label: 'Payroll', path: '/payroll', icon: 'AccountBookOutlined' },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    items: [
      { label: 'Masters', path: '/masters', icon: 'SettingOutlined' },
      { label: 'Users & roles', path: '/users', icon: 'UserSwitchOutlined', ownerOnly: true },
    ],
  },
]

export function flattenNav(groups: NavGroup[] = navGroups): NavItem[] {
  return groups.flatMap((group) => group.items)
}

export function filterNav(role: Role, groups: NavGroup[] = navGroups): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.ownerOnly && role !== 'Owner') return false
        if (role === 'Viewer') return Boolean(item.viewerAllowed)
        return true
      }),
    }))
    .filter((group) => group.items.length > 0)
}

export function findNavItem(pathname: string, groups: NavGroup[] = navGroups): NavItem | undefined {
  const items = flattenNav(groups)
  return items.find((item) => item.path === pathname) ?? items.find((item) => item.path === '/')
}
