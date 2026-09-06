import { Navigate, Outlet } from 'react-router'

import { BlankLayout } from '@/layouts/BlankLayout'
import { useAuth } from '@/contexts/AuthContext'

export function GuestOnly() {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return (
    <BlankLayout>
      <Outlet />
    </BlankLayout>
  )
}
