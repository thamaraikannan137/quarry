import { ArrowLeftOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Col, Descriptions, List, Popconfirm, Row, Space, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'

import { StatCard } from '@/components/common'
import { CustomerFormModal } from '@/components/customers/CustomerFormModal'
import { useAuth } from '@/contexts/AuthContext'
import { useParties } from '@/contexts/PartiesContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import { isCustomerParty, isVendorParty } from '@/types/party'
import { formatDate, money, compareByDateThenTime } from '@/utils/money'
import { vendorBalance, vendorPaid } from '@/utils/partyBalance'

import '@/styles/marking.css'

export function VendorDetailPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { getParty, updateParty, deleteParty } = useParties()
  const { transactions } = useTransactions()
  const [formOpen, setFormOpen] = useState(false)

  const canEdit = user?.role !== 'Viewer'
  const party = getParty(partyId)
  const quarryId = activeQuarry?.id

  const linkedTxns = useMemo(() => {
    if (!party || !quarryId) return []
    return transactions
      .filter((row) => row.partyId === party.id && row.quarryId === quarryId)
      .sort((a, b) => compareByDateThenTime(b, a))
  }, [party, transactions, quarryId])

  const paid = party ? vendorPaid(party.id, linkedTxns) : 0
  const pending = party ? vendorBalance(party, linkedTxns) : 0

  if (!partyId) return <Navigate to="/vendors" replace />
  if (party && isCustomerParty(party) && !isVendorParty(party)) {
    return <Navigate to={`/customers/${party.id}`} replace />
  }
  if (!party) {
    return (
      <div>
        <p>Vendor not found.</p>
        <Button type="primary" onClick={() => navigate('/vendors')}>
          Back to vendors
        </Button>
      </div>
    )
  }

  if (!activeQuarry) {
    return <div>Select a quarry to view this vendor.</div>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <Space size={8} align="center" style={{ marginBottom: 4 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/vendors')} aria-label="Back" />
            <h1 style={{ margin: 0 }}>{party.name}</h1>
          </Space>
          <p>{activeQuarry.name}</p>
        </div>
        {canEdit && (
          <Space wrap>
            <Button icon={<EditOutlined />} onClick={() => setFormOpen(true)}>
              Edit
            </Button>
            <Popconfirm
              title={`Delete ${party.name}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                try {
                  await deleteParty(party.id)
                  message.success('Vendor deleted')
                  navigate('/vendors')
                } catch (error) {
                  message.error(error instanceof Error ? error.message : 'Could not delete vendor')
                  throw error
                }
              }}
            >
              <Button danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        )}
      </div>

      <Row gutter={[12, 12]} className="page-stats-row">
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Paid" value={paid} formatter={(value) => money(Number(value))} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Pending payable"
            value={pending}
            formatter={(value) => (Number(value) > 0 ? money(Number(value)) : '—')}
            valueColor={pending > 0 ? '#cf1322' : undefined}
          />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Entries" value={linkedTxns.length} />
        </Col>
      </Row>

      <Descriptions column={{ xs: 1, sm: 1 }} size="small" bordered style={{ marginBottom: 20 }}>
        <Descriptions.Item label="Phone">{party.phone || '—'}</Descriptions.Item>
        <Descriptions.Item label="Address">{party.billingAddress || '—'}</Descriptions.Item>
      </Descriptions>

      <Typography.Title level={5}>Purchases & payments</Typography.Title>
      {linkedTxns.length === 0 ? (
        <Typography.Text type="secondary">
          No expenses linked yet. Choose this vendor as supplier on diesel or purchase.
        </Typography.Text>
      ) : (
        <List
          size="small"
          bordered
          dataSource={linkedTxns}
          renderItem={(row) => {
            const isCredit = row.type === 'Credit'
            const amount = isCredit ? row.credit : row.debit
            return (
              <List.Item
                actions={[
                  <Typography.Text
                    key="a"
                    type={isCredit ? undefined : 'danger'}
                    style={isCredit ? { color: '#389e0d' } : undefined}
                  >
                    {isCredit ? '+' : '−'}
                    {money(amount)}
                  </Typography.Text>,
                ]}
              >
                <List.Item.Meta
                  title={row.particulars || row.head}
                  description={`${formatDate(row.date)} · ${row.head} · ${row.type}${
                    row.litres ? ` · ${row.litres} L` : ''
                  }`}
                />
              </List.Item>
            )
          }}
        />
      )}

      {formOpen && (
        <CustomerFormModal
          open
          quarryId={activeQuarry.id}
          initial={party}
          defaultType="Vendor"
          onClose={() => setFormOpen(false)}
          onSave={async (draft) => {
            await updateParty(party.id, draft)
            message.success('Vendor updated')
            setFormOpen(false)
          }}
        />
      )}
    </div>
  )
}
