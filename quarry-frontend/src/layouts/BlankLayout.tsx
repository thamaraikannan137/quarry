import type { ReactNode } from 'react'

export function BlankLayout({ children }: { children: ReactNode }) {
  return <div style={{ minHeight: '100dvh' }}>{children}</div>
}
