import { Navigate, Outlet } from 'react-router'

import { useAuth } from '@/contexts/AuthContext'

export function Protected() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
