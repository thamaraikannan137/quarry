import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '@/contexts/AuthContext'

export function Protected() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
