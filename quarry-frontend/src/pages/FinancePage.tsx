import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Col, Input, Popconfirm, Row, Select, Space, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { DataTable, StatCard, TableCard } from '@/components/common'
import { LoanFormModal } from '@/components/loans/LoanFormModal'
import { MarkPaidModal } from '@/components/loans/MarkPaidModal'
import { useAuth } from '@/contexts/AuthContext'
import { useLoans } from '@/contexts/LoansContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import type { Loan } from '@/types/loan'
import { paymentForMonth } from '@/types/loan'
import { currentMonthKey, loanStatus, recentMonthKeys, type LoanStatus } from '@/utils/loanStatus'
import { formatDate, money, monthLabel } from '@/utils/money'

import '@/styles/marking.css'

type StatusFilter = 'all' | 'due' | 'overdue' | 'paid'

type BoardRow = Loan & { status: LoanStatus }

export function FinancePage() {
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { loansForQuarry, addLoan, updateLoanRecord, markPaid, undoPaid } = useLoans()
  const { ingestTransaction, dropTransaction } = useTransactions()
  const canEdit = user?.role !== 'Viewer'

  const [month, setMonth] = useState(currentMonthKey)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Loan | null>(null)
  const [paying, setPaying] = useState<Loan | null>(null)

  const months = useMemo(() => recentMonthKeys(18), [])
  const quarryLoans = useMemo(
    () => (activeQuarry ? loansForQuarry(activeQuarry.id) : []),
    [activeQuarry, loansForQuarry],
  )
  const activeLoans = useMemo(() => quarryLoans.filter((row) => row.active), [quarryLoans])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return activeLoans
      .map((loan) => ({ ...loan, status: loanStatus(loan, month) }))
      .filter((loan) => {
        if (statusFilter === 'due' && loan.status.key !== 'due' && loan.status.key !== 'overdue') return false
        if (statusFilter === 'overdue' && loan.status.key !== 'overdue') return false
        if (statusFilter === 'paid' && loan.status.key !== 'paid') return false
        if (!q) return true
        return `${loan.vehicleNo} ${loan.borrower} ${loan.loanNo} ${loan.bank}`.toLowerCase().includes(q)
      })
      .sort((a, b) => a.dueDay - b.dueDay || a.vehicleNo.localeCompare(b.vehicleNo))
  }, [activeLoans, month, statusFilter, search])

  const monthlyEmi = activeLoans.reduce((sum, row) => sum + (Number(row.emiAmount) || 0), 0)
  const paidAmt = activeLoans.reduce((sum, row) => sum + (Number(paymentForMonth(row, month)?.amount) || 0), 0)
  const paidCount = activeLoans.filter((row) => paymentForMonth(row, month)).length
  const overdueN = activeLoans.filter((row) => loanStatus(row, month).key === 'overdue').length
  const dueN = activeLoans.filter((row) => {
    const key = loanStatus(row, month).key
    return key === 'due' || key === 'overdue'
  }).length
  const hasActiveFilters = statusFilter !== 'all' || Boolean(search.trim())
  const resetKey = `${month}:${statusFilter}:${search}`

  const columns: ColumnsType<BoardRow> = [
    {
      title: '#',
      key: 'sno',
      width: 52,
      align: 'center',
      render: (_value, _record, index) => index + 1,
    },
    {
      title: 'Vehicle / asset',
      dataIndex: 'vehicleNo',
      key: 'vehicleNo',
      width: 180,
      ellipsis: true,
      render: (value: string) => (
        <Typography.Text strong ellipsis style={{ maxWidth: '100%', display: 'block' }}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'borrower',
      key: 'borrower',
      width: 140,
      ellipsis: true,
      render: (value: string) => value || '—',
    },
    {
      title: 'Loan number',
      dataIndex: 'loanNo',
      key: 'loanNo',
      width: 180,
      ellipsis: true,
      render: (value: string) => value || '—',
    },
    {
      title: 'Inform',
      dataIndex: 'informDay',
      key: 'informDay',
      width: 80,
      align: 'right',
    },
    {
      title: 'Due date',
      dataIndex: 'dueDay',
      key: 'dueDay',
      width: 90,
      align: 'right',
    },
    {
      title: 'Bank',
      dataIndex: 'bank',
      key: 'bank',
      width: 100,
      ellipsis: true,
      render: (value: string) => value || '—',
    },
    {
      title: 'Due amount',
      dataIndex: 'emiAmount',
      key: 'emiAmount',
      width: 130,
      align: 'right',
      render: (value: number) => money(value),
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_value, row) => {
        const paid = paymentForMonth(row, month)
        return (
          <div>
            <Tag color={row.status.color}>{row.status.label}</Tag>
            {paid?.date ? (
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                {formatDate(paid.date)}
              </Typography.Text>
            ) : null}
          </div>
        )
      },
    },
    {
      title: '',
      key: 'actions',
      width: 168,
      render: (_value, row) => {
        if (!canEdit) return null
        const paid = paymentForMonth(row, month)
        return (
          <Space size={4} onClick={(event) => event.stopPropagation()}>
            {paid ? (
              <Popconfirm
                title={`Undo EMI for ${monthLabel(month)}?`}
                okText="Undo"
                onConfirm={async () => {
                  try {
                    const txnId = await undoPaid(row.id, paid.id)
                    if (txnId) dropTransaction(txnId)
                    message.success('Payment undone')
                  } catch (error) {
                    message.error(error instanceof Error ? error.message : 'Could not undo payment')
                  }
                }}
              >
                <Button size="small" onClick={(event) => event.stopPropagation()}>
                  Undo
                </Button>
              </Popconfirm>
            ) : (
              <Button
                type="primary"
                size="small"
                onClick={(event) => {
                  event.stopPropagation()
                  setPaying(row)
                }}
              >
                Mark paid
              </Button>
            )}
            <Button
              size="small"
              onClick={(event) => {
                event.stopPropagation()
                setEditing(row)
                setFormOpen(true)
              }}
            >
              Edit
            </Button>
          </Space>
        )
      },
    },
  ]

  if (!activeQuarry) {
    return <Card>Select a quarry to record EMI payments.</Card>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <h1>Finance / Loan</h1>
          <p>EMI due board for {activeQuarry.name} only.</p>
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
            Add loan
          </Button>
        )}
      </div>

      <Row gutter={[12, 12]} className="page-stats-row">
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Active loans" value={activeLoans.length} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Monthly EMI" value={monthlyEmi} formatter={(value) => money(Number(value))} valueColor="#d48806" />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title={`Paid · ${monthLabel(month)}`}
            value={paidAmt}
            formatter={(value) => money(Number(value))}
            valueColor="#389e0d"
          />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Attention"
            value={dueN || '—'}
            valueColor={overdueN ? '#cf1322' : dueN ? '#d48806' : '#389e0d'}
          />
        </Col>
      </Row>

      <TableCard
        title="EMI due board"
        extra={
          <Space wrap size={8}>
            <Select
              style={{ minWidth: 140 }}
              value={month}
              onChange={setMonth}
              options={months.map((key) => ({ value: key, label: monthLabel(key) }))}
            />
            <Select
              style={{ minWidth: 150 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'due', label: 'Due / soon' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'paid', label: 'Paid this month' },
              ]}
            />
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search vehicle / name / bank…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 260 }}
            />
            {hasActiveFilters && (
              <Button
                size="small"
                onClick={() => {
                  setStatusFilter('all')
                  setSearch('')
                }}
              >
                Clear filters
              </Button>
            )}
          </Space>
        }
      >
        <DataTable<BoardRow>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          resetKey={resetKey}
          scrollX={1180}
          emptyFilterHint={hasActiveFilters ? 'try Clear filters' : undefined}
          emptyText={activeLoans.length === 0 ? `No loans for ${activeQuarry.name} yet — add a vehicle, machine or loan.` : 'No loans for this filter'}
          onRow={(record) => ({
            onClick: () => navigate(`/finance/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
        <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
          Inform = remind this day of the month · Mark paid posts Finance / EMI for {activeQuarry.name}. {paidCount} of{' '}
          {activeLoans.length} paid this month.
        </Typography.Paragraph>
      </TableCard>

      <LoanFormModal
        open={formOpen}
        quarryId={activeQuarry.id}
        quarryName={activeQuarry.name}
        initial={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSave={async (draft) => {
          if (editing) {
            await updateLoanRecord(editing.id, draft)
            message.success('Loan updated')
            return
          }
          await addLoan(draft)
          message.success('Loan added')
        }}
      />

      <MarkPaidModal
        open={Boolean(paying)}
        loan={paying}
        ym={month}
        quarryId={activeQuarry.id}
        quarryName={activeQuarry.name}
        onClose={() => setPaying(null)}
        onSave={async (draft) => {
          const txn = await markPaid(paying!.id, draft)
          ingestTransaction(txn)
          message.success('EMI paid · expense posted')
        }}
      />
    </div>
  )
}
