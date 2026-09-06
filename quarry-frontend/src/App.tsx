import { Navigate, Route, Routes } from 'react-router'

import { VerticalLayout } from '@/layouts/VerticalLayout'
import { AddLoadPage } from '@/pages/AddLoadPage'
import { AddMarkingPage } from '@/pages/AddMarkingPage'
import { CustomerDetailPage } from '@/pages/CustomerDetailPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EditMarkingPage } from '@/pages/EditMarkingPage'
import { EditLoadPage } from '@/pages/EditLoadPage'
import { LoadDetailPage } from '@/pages/LoadDetailPage'
import { LoadsPage } from '@/pages/LoadsPage'
import { Login } from '@/pages/Login'
import { MarkingDetailPage } from '@/pages/MarkingDetailPage'
import { MarkingPage } from '@/pages/MarkingPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { GuestOnly } from '@/routes/GuestOnly'
import { Protected } from '@/routes/Protected'
import { flattenNav } from '@/data/navItems'

const READY_PATHS = new Set(['/', '/transactions', '/customers', '/marking', '/loads'])

export default function App() {
  const stubs = flattenNav().filter((item) => !READY_PATHS.has(item.path))

  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<Login />} />
      </Route>
      <Route element={<Protected />}>
        <Route element={<VerticalLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:partyId" element={<CustomerDetailPage />} />
          <Route path="/marking" element={<MarkingPage />} />
          <Route path="/marking/new" element={<AddMarkingPage />} />
          <Route path="/marking/:batchId/edit" element={<EditMarkingPage />} />
          <Route path="/marking/:batchId" element={<MarkingDetailPage />} />
          <Route path="/loads" element={<LoadsPage />} />
          <Route path="/loads/new" element={<AddLoadPage />} />
          <Route path="/loads/:tripId/edit" element={<EditLoadPage />} />
          <Route path="/loads/:tripId" element={<LoadDetailPage />} />
          {stubs.map((item) => (
            <Route key={item.path} path={item.path} element={<PlaceholderPage />} />
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
