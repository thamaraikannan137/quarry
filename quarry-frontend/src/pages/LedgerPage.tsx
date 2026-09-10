import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Col, Input, Row, Select, Space, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { DataTable, StatCard, TableCard } from '@/components/common'
import { LedgerFormModal } from '@/components/ledgers/LedgerFormModal'
import { useAuth } from '@/contexts/AuthContext'
import { useLedgers } from '@/contexts/LedgersContext'
import type { Ledger } from '@/types/ledger'
import { formatDate, money } from '@/utils/money'

import '@/styles/marking.css'

type StatusFilter = 'all' | 'open' | 'closed'

export function LedgerPage() {
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { ledgersForQuarry, addLedger } = useLedgers()
  const canEdit = user?.role !== 'Viewer'

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const quarryLedgers = useMemo(
    () => (activeQuarry ? ledgersForQuarry(activeQuarry.id) : []),
    [activeQuarry, ledgersForQuarry],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return quarryLedgers
      .filter((row) => {
        if (statusFilter !== 'all' && row.status !== statusFilter) return false
        if (!q) return true
        return `${row.holderName} ${row.notes} ${row.amount}`.toLowerCase().includes(q)
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  }, [quarryLedgers, statusFilter, search])

  const openRows = quarryLedgers.filter((row) => row.status === 'open')
  const openIn = openRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const openOut = openRows.reduce(
    (sum, row) => sum + (Number(row.spent) || 0) + (Number(row.returnedAmount) || 0),
    0,
  )
  const openBalance = openRows.reduce((sum, row) => sum + (Number(row.balance) || 0), 0)
  const hasActiveFilters = statusFilter !== 'open' || Boolean(search.trim())
  const resetKey = `${statusFilter}:${search}`

  const columns: ColumnsType<Ledger> = [
    {
      title: '#',
      key: 'sno',
      width: 52,
      align: 'center',
      render: (_value, _record, index) => index + 1,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Ledger name',
      dataIndex: 'holderName',
      key: 'holderName',
      width: 180,
      ellipsis: true,
      render: (value: string) => (
        <Typography.Text strong ellipsis style={{ maxWidth: '100%', display: 'block' }}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: 'In',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (value: number) => (
        <Typography.Text style={{ color: '#389e0d' }}>{money(value)}</Typography.Text>
      ),
    },
    {
      title: 'Out',
      key: 'out',
      width: 120,
      align: 'right',
      render: (_value, row) => {
        const out = Math.round(((Number(row.spent) || 0) + (Number(row.returnedAmount) || 0)) * 100) / 100
        return <Typography.Text type="danger">{money(out)}</Typography.Text>
      },
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      align: 'right',
      render: (value: number) => (
        <Typography.Text strong style={{ color: value > 0.5 ? '#d48806' : '#389e0d' }}>
          {money(value)}
        </Typography.Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: string) => (
        <Tag color={value === 'open' ? 'processing' : 'default'}>{value === 'open' ? 'Open' : 'Closed'}</Tag>
      ),
    },
  ]

  if (!activeQuarry) {
    return <Card>Select a quarry to track cash given to accounts / supervisors.</Card>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <h1>Ledger</h1>
        </div>
        {canEdit && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setFormOpen(true)}
          >
            Add ledger
          </Button>
        )}
      </div>

      <Row gutter={[12, 12]} className="page-stats-row">
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Total ledger" value={openRows.length} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="In"
            value={openIn}
            formatter={(value) => money(Number(value))}
            valueColor="#389e0d"
          />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Out"
            value={openOut}
            formatter={(value) => money(Number(value))}
            valueColor="#cf1322"
          />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Balance"
            value={openBalance}
            formatter={(value) => money(Number(value))}
            valueColor={openBalance > 0.5 ? '#d48806' : '#389e0d'}
          />
        </Col>
      </Row>

      <TableCard
        title="Ledgers"
        extra={
          <Space wrap size={8}>
            <Select
              style={{ minWidth: 140 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search holder / notes…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 240 }}
            />
            {hasActiveFilters && (
              <Button
                size="small"
                onClick={() => {
                  setStatusFilter('open')
                  setSearch('')
                }}
              >
                Clear filters
              </Button>
            )}
          </Space>
        }
      >
        <DataTable<Ledger>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          resetKey={resetKey}
          scrollX={1100}
          emptyFilterHint={hasActiveFilters ? 'try Clear filters' : undefined}
          emptyText={
            quarryLedgers.length === 0
              ? 'No ledger found'
              : 'No entries for this filter'
          }
          onRow={(record) => ({
            onClick: () => navigate(`/ledger/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </TableCard>

      <LedgerFormModal
        open={formOpen}
        quarryId={activeQuarry.id}
        quarryName={activeQuarry.name}
        onClose={() => setFormOpen(false)}
        onSave={async (draft) => {
          await addLedger(draft)
          message.success('In recorded')
        }}
      />
    </div>
  )
}
