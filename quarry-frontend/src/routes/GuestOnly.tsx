import { Navigate, Outlet, useLocation } from 'react-router'

import { BlankLayout } from '@/layouts/BlankLayout'
import { useAuth } from '@/contexts/AuthContext'

export function GuestOnly() {
  const { user } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  if (user) return <Navigate to={from && from !== '/login' ? from : '/'} replace />
  return (
    <BlankLayout>
      <Outlet />
    </BlankLayout>
  )
}
