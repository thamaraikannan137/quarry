import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { loginUser, toSessionUser } from '@/api/auth'
import { errorMessage } from '@/api/http'
import { listQuarries } from '@/api/quarries'
import { themeConfig } from '@/configs/themeConfig'
import { DEMO_QUARRIES } from '@/data/demoUsers'
import type { Quarry, SessionUser } from '@/types/app'

type SignInResult = { ok: true } | { ok: false; message: string }

type AuthContextValue = {
  user: SessionUser | null
  quarries: Quarry[]
  allowedQuarries: Quarry[]
  activeQuarry: Quarry | undefined
  signIn: (username: string, password: string, remember?: boolean) => Promise<SignInResult>
  signOut: () => void
  setActiveQuarry: (quarryId: string) => void
  addQuarry: (quarry: Quarry) => void
  updateQuarry: (id: string, patch: Partial<Quarry>) => void
  patchSession: (patch: Partial<SessionUser>) => void
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

function sessionRemembered() {
  return Boolean(localStorage.getItem(themeConfig.sessionStorageKey))
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

  const signIn = useCallback(async (username: string, password: string, remember = true): Promise<SignInResult> => {
    try {
      const found = await loginUser(username.trim(), password)
      const session = toSessionUser(found)
      persistSession(session, remember)
      setUser(session)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: errorMessage(error, 'Invalid username or password') ?? 'Invalid username or password' }
    }
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
      persistSession(next, sessionRemembered())
      return next
    })
  }, [])

  const patchSession = useCallback((patch: Partial<SessionUser>) => {
    setUser((current) => {
      if (!current) return current
      const next = { ...current, ...patch }
      persistSession(next, sessionRemembered())
      return next
    })
  }, [])

  const addQuarry = useCallback((quarry: Quarry) => {
    setQuarries((current) => (current.some((row) => row.id === quarry.id) ? current : [...current, quarry]))
    setUser((current) => {
      if (!current) return current
      const hasAll = current.role === 'Owner' || current.quarryIds.includes('*')
      const quarryIds = hasAll || current.quarryIds.includes(quarry.id) ? current.quarryIds : [...current.quarryIds, quarry.id]
      const next = { ...current, quarryIds, lastQuarryId: quarry.id }
      persistSession(next, sessionRemembered())
      return next
    })
  }, [])

  const updateQuarry = useCallback((id: string, patch: Partial<Quarry>) => {
    setQuarries((current) => current.map((quarry) => (quarry.id === id ? { ...quarry, ...patch } : quarry)))
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
      addQuarry,
      updateQuarry,
      patchSession,
    }),
    [user, quarries, allowedQuarries, activeQuarry, signIn, signOut, setActiveQuarry, addQuarry, updateQuarry, patchSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function quarryAccessLabel(user: SessionUser, quarries: Quarry[] = DEMO_QUARRIES) {
  if (user.role === 'Owner' || user.quarryIds.includes('*')) return 'All quarries'
  const names = quarries.filter((quarry) => user.quarryIds.includes(quarry.id)).map((quarry) => quarry.name)
  return names.join(', ') || 'No quarry access'
}
