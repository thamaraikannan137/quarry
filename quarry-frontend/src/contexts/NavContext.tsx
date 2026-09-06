import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { NAV_BREAKPOINT } from '@/configs/themeConfig'

type NavContextValue = {
  isMobile: boolean
  mobileOpen: boolean
  openMobile: () => void
  closeMobile: () => void
  toggleMobile: () => void
}

const NavContext = createContext<NavContextValue | null>(null)

function readIsMobile() {
  return typeof window !== 'undefined' && window.innerWidth < NAV_BREAKPOINT
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(readIsMobile)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onResize = () => {
      const next = window.innerWidth < NAV_BREAKPOINT
      setIsMobile(next)
      if (!next) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const openMobile = useCallback(() => setMobileOpen(true), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])
  const toggleMobile = useCallback(() => setMobileOpen((open) => !open), [])

  const value = useMemo<NavContextValue>(
    () => ({ isMobile, mobileOpen, openMobile, closeMobile, toggleMobile }),
    [isMobile, mobileOpen, openMobile, closeMobile, toggleMobile],
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}
