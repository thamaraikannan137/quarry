import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Col, Input, Row, Select, Space, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { DataTable, StatCard, TableCard } from '@/components/common'
import { CustomerFormModal } from '@/components/customers/CustomerFormModal'
import { useAuth } from '@/contexts/AuthContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useParties } from '@/contexts/PartiesContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import type { Party } from '@/types/party'
import { money } from '@/utils/money'
import { partyBalance, partyInvoiced, partyReceived } from '@/utils/partyBalance'

import '@/styles/marking.css'

type BalanceFilter = 'all' | 'pending' | 'zero'
type SortKey = 'name' | 'bal-desc' | 'bal-asc'

type CustomerRow = Party & { balance: number; invoiced: number; received: number }

export function CustomersPage() {
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { customersForQuarry, addParty, updateParty } = useParties()
  const { batchesForQuarry } = useMarkings()
  const { transactions } = useTransactions()
  const canEdit = user?.role !== 'Viewer'

  const [search, setSearch] = useState('')
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Party | null>(null)

  const quarryId = activeQuarry?.id

  const rows = useMemo(() => {
    const batches = batchesForQuarry(quarryId)
    const list = customersForQuarry(quarryId).map((party) => {
      const linked = transactions.filter((row) => row.partyId === party.id && row.quarryId === quarryId)
      const markings = batches.filter((batch) => batch.partyId === party.id)
      const invoiced = partyInvoiced(markings)
      const received = partyReceived(party.id, linked)
      const balance = partyBalance(party, linked, markings)
      return { ...party, invoiced, received, balance } satisfies CustomerRow
    })

    const q = search.trim().toLowerCase()
    let filtered = list.filter((row) => {
      if (balanceFilter === 'pending' && !(row.balance > 0)) return false
      if (balanceFilter === 'zero' && row.balance !== 0) return false
      if (!q) return true
      return `${row.name} ${row.phone} ${row.gstin} ${row.state} ${row.contact}`.toLowerCase().includes(q)
    })

    filtered = [...filtered].sort((a, b) => {
      if (sortKey === 'bal-desc') return b.balance - a.balance
      if (sortKey === 'bal-asc') return a.balance - b.balance
      return a.name.localeCompare(b.name)
    })
    return filtered
  }, [batchesForQuarry, customersForQuarry, quarryId, transactions, search, balanceFilter, sortKey])

  const totalBalance = rows.reduce((sum, row) => sum + row.balance, 0)
  const withBalance = rows.filter((row) => row.balance > 0).length
  const settled = rows.filter((row) => row.balance === 0).length

  const columns: ColumnsType<CustomerRow> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value) => (
        <Typography.Text strong ellipsis style={{ maxWidth: '100%', display: 'block' }}>
          {value}
        </Typography.Text>
      ),
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 120, render: (v) => v || '—' },
    { title: 'GSTIN', dataIndex: 'gstin', key: 'gstin', width: 150, ellipsis: true },
    { title: 'State', dataIndex: 'state', key: 'state', width: 110, render: (v) => v || '—' },
    {
      title: 'Invoiced',
      dataIndex: 'invoiced',
      key: 'invoiced',
      align: 'right',
      width: 130,
      sorter: (a, b) => a.invoiced - b.invoiced,
      render: (value: number) => money(value),
    },
    {
      title: 'Received',
      dataIndex: 'received',
      key: 'received',
      align: 'right',
      width: 130,
      sorter: (a, b) => a.received - b.received,
      render: (value: number) => (
        <Typography.Text style={value > 0 ? { color: '#389e0d' } : undefined}>{money(value)}</Typography.Text>
      ),
    },
    {
      title: 'Total pending',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      width: 140,
      sorter: (a, b) => a.balance - b.balance,
      render: (value: number) => (
        <Typography.Text type={value > 0 ? 'danger' : undefined} style={value < 0 ? { color: '#389e0d' } : undefined} strong>
          {money(value)}
        </Typography.Text>
      ),
    },
  ]

  if (!activeQuarry) {
    return <Card>Select a quarry to manage customers.</Card>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p>Customer profiles, receipts & balances for {activeQuarry.name}.</p>
        </div>
        {canEdit && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Add customer
          </Button>
        )}
      </div>

      <Row gutter={[12, 12]} className="page-stats-row">
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Customers" value={rows.length} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Pending customers" value={withBalance} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Settled" value={settled} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Total pending"
            value={totalBalance}
            formatter={(value) => money(Number(value))}
            valueColor={totalBalance > 0 ? '#cf1322' : totalBalance < 0 ? '#389e0d' : undefined}
          />
        </Col>
      </Row>

      <TableCard
        title="All customers"
        extra={
          <Space wrap size={8}>
            <Select
              style={{ minWidth: 140 }}
              value={balanceFilter}
              onChange={setBalanceFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending customers' },
                { value: 'zero', label: 'Settled' },
              ]}
            />
            <Select
              style={{ minWidth: 160 }}
              value={sortKey}
              onChange={setSortKey}
              options={[
                { value: 'name', label: 'Sort: Name' },
                { value: 'bal-desc', label: 'Sort: Balance high' },
                { value: 'bal-asc', label: 'Sort: Balance low' },
              ]}
            />
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search name / phone / GSTIN…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 220 }}
            />
          </Space>
        }
      >
        <DataTable<CustomerRow>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          resetKey={`${quarryId}:${balanceFilter}:${sortKey}:${search}`}
          emptyText="No customers yet. Add a customer to get started."
          onRow={(record) => ({
            onClick: () => navigate(`/customers/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </TableCard>

      {formOpen && (
        <CustomerFormModal
          open
          quarryId={activeQuarry.id}
          initial={editing}
          defaultType="Customer"
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSave={async (draft) => {
            if (editing) {
              await updateParty(editing.id, draft)
              message.success('Customer updated')
              return
            }
            const party = await addParty({ ...draft, type: draft.type || 'Customer' })
            message.success('Customer added')
            navigate(`/customers/${party.id}`)
          }}
        />
      )}
    </div>
  )
}
