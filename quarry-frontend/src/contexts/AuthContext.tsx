import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { listQuarries } from '@/api/quarries'
import { themeConfig } from '@/configs/themeConfig'
import { DEMO_QUARRIES, DEMO_USERS } from '@/data/demoUsers'
import type { Quarry, SessionUser } from '@/types/app'

type SignInResult = { ok: true } | { ok: false; message: string }

type AuthContextValue = {
  user: SessionUser | null
  quarries: Quarry[]
  allowedQuarries: Quarry[]
  activeQuarry: Quarry | undefined
  signIn: (username: string, password: string, remember?: boolean) => SignInResult
  signOut: () => void
  setActiveQuarry: (quarryId: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(themeConfig.sessionStorageKey) ?? sessionStorage.getItem(themeConfig.sessionStorageKey)
    if (!raw) return null
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

function persistSession(user: SessionUser, remember: boolean) {
  const payload = JSON.stringify(user)
  localStorage.removeItem(themeConfig.sessionStorageKey)
  sessionStorage.removeItem(themeConfig.sessionStorageKey)
  if (remember) localStorage.setItem(themeConfig.sessionStorageKey, payload)
  else sessionStorage.setItem(themeConfig.sessionStorageKey, payload)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readSession)
  const [quarries, setQuarries] = useState<Quarry[]>(DEMO_QUARRIES)

  useEffect(() => {
    listQuarries()
      .then((rows) => {
        if (rows.length) setQuarries(rows)
      })
      .catch(() => undefined)
  }, [])

  const allowedQuarries = useMemo(() => {
    if (!user) return []
    if (user.role === 'Owner' || user.quarryIds.includes('*')) return quarries
    return quarries.filter((quarry) => user.quarryIds.includes(quarry.id))
  }, [user, quarries])
  const activeQuarry = useMemo(
    () => allowedQuarries.find((quarry) => quarry.id === user?.lastQuarryId) ?? allowedQuarries[0],
    [allowedQuarries, user?.lastQuarryId],
  )

  const signIn = useCallback((username: string, password: string, remember = true): SignInResult => {
    const found = DEMO_USERS.find(
      (demo) => demo.active && demo.username === username.trim() && demo.password === password,
    )
    if (!found) return { ok: false, message: 'Invalid username or password' }

    const session: SessionUser = {
      id: found.id,
      name: found.name,
      username: found.username,
      role: found.role,
      quarryIds: found.quarryIds,
      lastQuarryId: found.lastQuarryId,
    }
    persistSession(session, remember)
    setUser(session)
    return { ok: true }
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(themeConfig.sessionStorageKey)
    sessionStorage.removeItem(themeConfig.sessionStorageKey)
    setUser(null)
  }, [])

  const setActiveQuarry = useCallback((quarryId: string) => {
    setUser((current) => {
      if (!current) return current
      const next = { ...current, lastQuarryId: quarryId }
      const remember = Boolean(localStorage.getItem(themeConfig.sessionStorageKey))
      persistSession(next, remember)
      return next
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      quarries,
      allowedQuarries,
      activeQuarry,
      signIn,
      signOut,
      setActiveQuarry,
    }),
    [user, quarries, allowedQuarries, activeQuarry, signIn, signOut, setActiveQuarry],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function quarryAccessLabel(user: SessionUser) {
  if (user.role === 'Owner' || user.quarryIds.includes('*')) return 'All quarries'
  const names = DEMO_QUARRIES.filter((quarry) => user.quarryIds.includes(quarry.id)).map((quarry) => quarry.name)
  return names.join(', ') || 'No quarry access'
}
