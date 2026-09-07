import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Col, Input, Row, Select, Space, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { DataTable, StatCard, TableCard } from '@/components/common'
import { CustomerFormModal } from '@/components/customers/CustomerFormModal'
import { useAuth } from '@/contexts/AuthContext'
import { useParties } from '@/contexts/PartiesContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import type { Party } from '@/types/party'
import { money } from '@/utils/money'
import { vendorBalance, vendorPaid } from '@/utils/partyBalance'

import '@/styles/marking.css'

type BalanceFilter = 'all' | 'pending' | 'zero'
type SortKey = 'name' | 'bal-desc' | 'bal-asc'

type VendorRow = Party & { balance: number; paid: number }

export function VendorsPage() {
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { vendorsForQuarry, addParty, updateParty } = useParties()
  const { transactions } = useTransactions()
  const canEdit = user?.role !== 'Viewer'

  const [search, setSearch] = useState('')
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Party | null>(null)

  const quarryId = activeQuarry?.id

  const rows = useMemo(() => {
    const linked = transactions.filter((row) => row.quarryId === quarryId)
    const list = vendorsForQuarry(quarryId).map((party) => {
      const partyTxns = linked.filter((row) => row.partyId === party.id)
      return {
        ...party,
        paid: vendorPaid(party.id, partyTxns),
        balance: vendorBalance(party, partyTxns),
      } satisfies VendorRow
    })

    const q = search.trim().toLowerCase()
    let filtered = list.filter((row) => {
      if (balanceFilter === 'pending' && !(row.balance > 0)) return false
      if (balanceFilter === 'zero' && row.balance !== 0) return false
      if (!q) return true
      return `${row.name} ${row.phone} ${row.billingAddress}`.toLowerCase().includes(q)
    })

    filtered = [...filtered].sort((a, b) => {
      if (sortKey === 'bal-desc') return b.balance - a.balance
      if (sortKey === 'bal-asc') return a.balance - b.balance
      return a.name.localeCompare(b.name)
    })
    return filtered
  }, [vendorsForQuarry, quarryId, transactions, search, balanceFilter, sortKey])

  const totalPending = rows.reduce((sum, row) => sum + Math.max(0, row.balance), 0)
  const withBalance = rows.filter((row) => row.balance > 0).length
  const settled = rows.filter((row) => row.balance === 0).length

  const columns: ColumnsType<VendorRow> = [
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
    { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 140, render: (v) => v || '—' },
    {
      title: 'Address',
      dataIndex: 'billingAddress',
      key: 'billingAddress',
      ellipsis: true,
      render: (v) => v || '—',
    },
    {
      title: 'Paid',
      dataIndex: 'paid',
      key: 'paid',
      align: 'right',
      width: 120,
      sorter: (a, b) => a.paid - b.paid,
      render: (value: number) => money(value),
    },
    {
      title: 'Pending',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      width: 120,
      sorter: (a, b) => a.balance - b.balance,
      render: (value: number) => (
        <Typography.Text type={value > 0 ? 'danger' : undefined} style={value < 0 ? { color: '#389e0d' } : undefined} strong>
          {money(value)}
        </Typography.Text>
      ),
    },
  ]

  if (!activeQuarry) {
    return <Card>Select a quarry to manage vendors.</Card>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <h1>Vendors</h1>
          <p>Suppliers for diesel, purchase, and other expenses at {activeQuarry.name}.</p>
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
            Add vendor
          </Button>
        )}
      </div>

      <Row gutter={[12, 12]} className="page-stats-row">
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Vendors" value={rows.length} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Pending vendors" value={withBalance} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Settled" value={settled} />
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

      <TableCard
        title="All vendors"
        extra={
          <Space wrap size={8}>
            <Select
              style={{ minWidth: 140 }}
              value={balanceFilter}
              onChange={setBalanceFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending payable' },
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
              placeholder="Search name / phone / address…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 220 }}
            />
          </Space>
        }
      >
        <DataTable<VendorRow>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          resetKey={`${quarryId}:${balanceFilter}:${sortKey}:${search}`}
          emptyText="No vendors yet. Add a supplier to use on diesel and purchase."
          onRow={(record) => ({
            onClick: () => navigate(`/vendors/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </TableCard>

      {formOpen && (
        <CustomerFormModal
          open
          quarryId={activeQuarry.id}
          initial={editing}
          defaultType="Vendor"
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSave={async (draft) => {
            if (editing) {
              await updateParty(editing.id, draft)
              message.success('Vendor updated')
              return
            }
            const party = await addParty(draft)
            message.success('Vendor added')
            navigate(`/vendors/${party.id}`)
          }}
        />
      )}
    </div>
  )
}
