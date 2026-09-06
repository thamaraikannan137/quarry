import { ConfigProvider, theme as antdTheme, App as AntApp } from 'antd'
import { useMemo, type ReactNode } from 'react'

import { useSettings } from '@/contexts/SettingsContext'

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { settings, resolvedMode } = useSettings()

  const theme = useMemo(
    () => ({
      algorithm: resolvedMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: settings.primaryColor,
        borderRadius: 8,
        fontFamily: '"Public Sans", system-ui, -apple-system, sans-serif',
      },
      components: {
        Layout: {
          headerBg: resolvedMode === 'dark' ? '#141414' : '#ffffff',
          siderBg: resolvedMode === 'dark' ? '#141414' : '#001529',
          bodyBg: resolvedMode === 'dark' ? '#000000' : '#f5f5f5',
        },
      },
    }),
    [resolvedMode, settings.primaryColor],
  )

  return (
    <ConfigProvider theme={theme}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  )
}
