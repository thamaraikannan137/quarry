import { Layout } from 'antd'
import { Outlet } from 'react-router'

import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { useNav } from '@/contexts/NavContext'

const { Content } = Layout

export function VerticalLayout() {
  const { isMobile } = useNav()

  return (
    <Layout style={{ minHeight: '100dvh' }}>
      {!isMobile && <Sidebar />}
      {isMobile && <Sidebar inDrawer />}
      <Layout style={{ minWidth: 0 }}>
        <Navbar />
        <Content
          style={{
            padding: isMobile ? 12 : 24,
            maxWidth: 1440,
            width: '100%',
            margin: '0 auto',
            minWidth: 0,
            overflowX: 'hidden',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
