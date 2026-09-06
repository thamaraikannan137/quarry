import {
  AccountBookOutlined,
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CarOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileTextOutlined,
  GiftOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

const icons: Record<string, ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  SwapOutlined: <SwapOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  ShoppingOutlined: <ShoppingOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  UserOutlined: <UserOutlined />,
  ShoppingCartOutlined: <ShoppingCartOutlined />,
  CreditCardOutlined: <CreditCardOutlined />,
  GiftOutlined: <GiftOutlined />,
  BankOutlined: <BankOutlined />,
  CarOutlined: <CarOutlined />,
  ShopOutlined: <ShopOutlined />,
  TeamOutlined: <TeamOutlined />,
  CalendarOutlined: <CalendarOutlined />,
  DollarOutlined: <DollarOutlined />,
  AccountBookOutlined: <AccountBookOutlined />,
  SettingOutlined: <SettingOutlined />,
  UserSwitchOutlined: <UserSwitchOutlined />,
}

export function navIcon(name: string): ReactNode {
  return icons[name] ?? <AppstoreOutlined />
}
