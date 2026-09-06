import { ArrowLeftOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Col, Descriptions, List, Popconfirm, Row, Space, Tabs, Tag, Typography, message } from 'antd'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'

import { StatCard } from '@/components/common'
import { CustomerFormModal } from '@/components/customers/CustomerFormModal'
import { ReceivePaymentModal } from '@/components/marking/ReceivePaymentModal'
import { useAuth } from '@/contexts/AuthContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useParties } from '@/contexts/PartiesContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import { formatCbm } from '@/utils/marking'
import { batchBalance, batchPayStatus, batchReceived } from '@/utils/markingPayment'
import { money } from '@/utils/money'
import { partyBalance, partyMarkingPending } from '@/utils/partyBalance'

import '@/styles/marking.css'

function formatDate(value: string) {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD MMM YYYY') : value
}

export function CustomerDetailPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { getParty, updateParty, deleteParty } = useParties()
  const { batchesForQuarry } = useMarkings()
  const { transactions } = useTransactions()
  const [formOpen, setFormOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const canEdit = user?.role !== 'Viewer'
  const party = getParty(partyId)
  const quarryId = activeQuarry?.id

  const linkedMarkings = useMemo(() => {
    if (!party || !quarryId) return []
    return batchesForQuarry(quarryId)
      .filter((batch) => batch.partyId === party.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.batchId.localeCompare(a.batchId))
  }, [batchesForQuarry, party, quarryId])

  const unpaidMarkings = useMemo(
    () => linkedMarkings.filter((batch) => batchBalance(batch, transactions) > 0.5),
    [linkedMarkings, transactions],
  )

  const linkedTxns = useMemo(() => {
    if (!party || !quarryId) return []
    return transactions
      .filter((row) => row.partyId === party.id && row.quarryId === quarryId)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [party, transactions, quarryId])

  const received = linkedMarkings.reduce(
    (sum, batch) => sum + batchReceived(transactions, batch.batchId),
    0,
  )
  const invoiced = linkedMarkings.reduce((sum, batch) => sum + batch.total, 0)
  const markingPending = party ? partyMarkingPending(transactions, linkedMarkings) : 0
  const totalPending = party ? partyBalance(party, transactions, linkedMarkings) : 0
  const opening = party?.openingBalance ?? 0

  if (!partyId) return <Navigate to="/customers" replace />
  if (!party) {
    return (
      <div>
        <p>Customer not found.</p>
        <Button type="primary" onClick={() => navigate('/customers')}>
          Back to customers
        </Button>
      </div>
    )
  }

  if (!activeQuarry) {
    return <div>Select a quarry to view this customer.</div>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <Space size={8} align="center" style={{ marginBottom: 4 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')} aria-label="Back" />
            <h1 style={{ margin: 0 }}>{party.name}</h1>
          </Space>
          <p>
            {party.type}
            {party.contact ? ` · ${party.contact}` : ''} · {activeQuarry.name}
          </p>
        </div>
        {canEdit && (
          <Space wrap>
            {unpaidMarkings.length > 0 && (
              <Button type="primary" onClick={() => setPayOpen(true)}>
                Receive payment
              </Button>
            )}
            <Button icon={<EditOutlined />} onClick={() => setFormOpen(true)}>
              Edit
            </Button>
            <Popconfirm
              title={`Delete ${party.name}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => {
                deleteParty(party.id)
                message.success('Customer deleted')
                navigate('/customers')
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
          <StatCard title="Markings" value={linkedMarkings.length} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Invoiced" value={invoiced} formatter={(value) => money(Number(value))} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Received"
            value={received}
            formatter={(value) => money(Number(value))}
            valueColor="#389e0d"
          />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Opening" value={opening} formatter={(value) => money(Number(value))} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Marking pending"
            value={markingPending}
            formatter={(value) => money(Number(value))}
            valueColor={markingPending > 0 ? '#cf1322' : undefined}
          />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Total pending"
            value={totalPending}
            formatter={(value) => money(Number(value))}
            valueColor={totalPending > 0 ? '#cf1322' : undefined}
          />
        </Col>
      </Row>

      <Space wrap style={{ marginBottom: 12 }}>
        <Tag color={party.type === 'Vendor' ? 'orange' : 'blue'}>{party.type}</Tag>
        <Typography.Text type="secondary">
          {linkedMarkings.length} marking{linkedMarkings.length === 1 ? '' : 's'} · {linkedTxns.length} cash-book
          entries
        </Typography.Text>
      </Space>

      <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered style={{ marginBottom: 20 }}>
        <Descriptions.Item label="Phone">{party.phone || '—'}</Descriptions.Item>
        <Descriptions.Item label="Email">{party.email || '—'}</Descriptions.Item>
        <Descriptions.Item label="GSTIN">{party.gstin || '—'}</Descriptions.Item>
        <Descriptions.Item label="GST type">{party.gstType}</Descriptions.Item>
        <Descriptions.Item label="State">{party.state || '—'}</Descriptions.Item>
        <Descriptions.Item label="Contact">{party.contact || '—'}</Descriptions.Item>
        <Descriptions.Item label="Credit limit">{money(party.creditLimit)}</Descriptions.Item>
        <Descriptions.Item label="Opening bal.">{money(party.openingBalance)}</Descriptions.Item>
        <Descriptions.Item label="Billing address" span={2}>
          {party.billingAddress || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Shipping address" span={2}>
          {party.shippingAddress || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Notes" span={2}>
          {party.notes || '—'}
        </Descriptions.Item>
      </Descriptions>

      <Tabs
        defaultActiveKey="payments"
        items={[
          {
            key: 'payments',
            label: `Payments (${linkedTxns.length})`,
            children: (
              <div>
                {canEdit && unpaidMarkings.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button type="primary" size="small" onClick={() => setPayOpen(true)}>
                      Receive payment
                    </Button>
                  </div>
                )}
                {linkedTxns.length === 0 ? (
                  <Typography.Text type="secondary">
                    {unpaidMarkings.length > 0
                      ? 'No cash-book entries yet — receive payment against an unpaid marking.'
                      : 'No cash-book entries linked yet.'}
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
                            title={
                              row.markingBatchId ? (
                                <Link to={`/marking/${row.markingBatchId}`} onClick={(e) => e.stopPropagation()}>
                                  {row.particulars || row.head}
                                </Link>
                              ) : (
                                row.particulars || row.head
                              )
                            }
                            description={`${formatDate(row.date)} · ${row.head} · ${row.type}${
                              row.markingBatchId ? ' · marking payment' : ''
                            }`}
                          />
                        </List.Item>
                      )
                    }}
                  />
                )}
              </div>
            ),
          },
          {
            key: 'markings',
            label: `Markings (${linkedMarkings.length})`,
            children:
              linkedMarkings.length === 0 ? (
                <Typography.Text type="secondary">No markings for this party yet.</Typography.Text>
              ) : (
                <div className="marking-register-wrap">
                  <table className="marking-register marking-summary">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Marker</th>
                        <th className="num">Blocks</th>
                        <th className="num">CBM</th>
                        <th className="num">Total</th>
                        <th className="num">Pending</th>
                        <th>Pay</th>
                        <th>Load</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedMarkings.map((batch) => {
                        const pending = Math.max(0, batchBalance(batch, transactions))
                        const pay = batchPayStatus(batch, transactions)
                        const loadLabel =
                          batch.loadPending === 0
                            ? 'OK'
                            : batch.loadOk === 0
                              ? 'Pending'
                              : `${batch.loadOk} OK · ${batch.loadPending} pending`
                        return (
                          <tr
                            key={batch.batchId}
                            className="summary-row"
                            onClick={() => navigate(`/marking/${batch.batchId}`)}
                          >
                            <td>{formatDate(batch.date)}</td>
                            <td>{batch.markerName || '—'}</td>
                            <td className="num">{batch.blockCount}</td>
                            <td className="num">{formatCbm(batch.cbm)}</td>
                            <td className="num">{money(batch.total)}</td>
                            <td className="num">{money(pending)}</td>
                            <td>
                              <span
                                className={`badge ${
                                  pay.key === 'paid' ? 'ok' : pay.key === 'partial' ? 'warn' : ''
                                }`}
                              >
                                {pay.label}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${batch.loadPending === 0 ? 'ok' : 'warn'}`}>
                                {loadLabel}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ),
          },
        ]}
      />

      {formOpen && (
        <CustomerFormModal
          open
          quarryId={activeQuarry.id}
          initial={party}
          defaultType="Customer"
          onClose={() => setFormOpen(false)}
          onSave={(draft) => {
            updateParty(party.id, draft)
            message.success('Customer updated')
            setFormOpen(false)
          }}
        />
      )}

      {payOpen && (
        <ReceivePaymentModal
          open
          quarryId={activeQuarry.id}
          batches={unpaidMarkings}
          onClose={() => setPayOpen(false)}
        />
      )}
    </div>
  )
}
