import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { DispatchProvider } from '@/contexts/DispatchContext'
import { LoansProvider } from '@/contexts/LoansContext'
import { MarkingsProvider } from '@/contexts/MarkingsContext'
import { NavProvider } from '@/contexts/NavContext'
import { PartiesProvider } from '@/contexts/PartiesContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { StaffProvider } from '@/contexts/StaffContext'
import { TransactionsProvider } from '@/contexts/TransactionsContext'
import { AppThemeProvider } from '@/theme/AppThemeProvider'

import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <AppThemeProvider>
          <AuthProvider>
            <PartiesProvider>
              <StaffProvider>
                <TransactionsProvider>
                  <LoansProvider>
                    <MarkingsProvider>
                      <DispatchProvider>
                        <NavProvider>
                          <App />
                        </NavProvider>
                      </DispatchProvider>
                    </MarkingsProvider>
                  </LoansProvider>
                </TransactionsProvider>
              </StaffProvider>
            </PartiesProvider>
          </AuthProvider>
        </AppThemeProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
