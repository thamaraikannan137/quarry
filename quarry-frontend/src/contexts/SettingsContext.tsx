import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { defaultSettings, themeConfig } from '@/configs/themeConfig'
import type { Settings, ThemeMode } from '@/types/app'

type SettingsContextValue = {
  settings: Settings
  resolvedMode: 'light' | 'dark'
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function readSystemMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredSettings(): Settings {
  try {
    const raw = localStorage.getItem(themeConfig.settingsStorageKey)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      mode: parsed.mode ?? defaultSettings.mode,
      layout: parsed.layout ?? defaultSettings.layout,
      primaryColor: parsed.primaryColor ?? defaultSettings.primaryColor,
    }
  } catch {
    return defaultSettings
  }
}

function resolveMode(mode: ThemeMode, systemMode: 'light' | 'dark'): 'light' | 'dark' {
  return mode === 'system' ? systemMode : mode
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(readStoredSettings)
  const [systemMode, setSystemMode] = useState<'light' | 'dark'>(readSystemMode)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemMode(media.matches ? 'dark' : 'light')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    localStorage.setItem(themeConfig.settingsStorageKey, JSON.stringify(settings))
  }, [settings])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      resolvedMode: resolveMode(settings.mode, systemMode),
      updateSettings,
      resetSettings,
    }),
    [settings, systemMode, updateSettings, resetSettings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
