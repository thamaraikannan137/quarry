import { ArrowLeftOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Col, Descriptions, Input, Popconfirm, Row, Space, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'

import { DataTable, StatCard } from '@/components/common'
import { LoanFormModal } from '@/components/loans/LoanFormModal'
import { MarkPaidModal } from '@/components/loans/MarkPaidModal'
import { useAuth } from '@/contexts/AuthContext'
import { useLoans } from '@/contexts/LoansContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import type { LoanPayment } from '@/types/loan'
import { paymentForMonth } from '@/types/loan'
import { currentMonthKey, loanStatus } from '@/utils/loanStatus'
import { formatDate, money, monthLabel } from '@/utils/money'

import '@/styles/marking.css'

type HistoryRow = LoanPayment & { running: number }

export function LoanDetailPage() {
  const { loanId } = useParams<{ loanId: string }>()
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { getLoan, updateLoanRecord, removeLoan, markPaid, undoPaid } = useLoans()
  const { ingestTransaction, dropTransaction } = useTransactions()
  const canEdit = user?.role !== 'Viewer'

  const [formOpen, setFormOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [search, setSearch] = useState('')

  const loan = getLoan(loanId)
  const ym = currentMonthKey()
  const status = loan ? loanStatus(loan, ym) : null
  const paidThis = loan ? paymentForMonth(loan, ym) : undefined

  const history = useMemo(() => {
    if (!loan) return []
    const sorted = [...loan.payments].sort((a, b) => a.date.localeCompare(b.date) || a.ym.localeCompare(b.ym))
    let run = 0
    const rows: HistoryRow[] = sorted.map((row) => {
      run += Number(row.amount) || 0
      return { ...row, running: run }
    })
    const q = search.trim().toLowerCase()
    const filtered = q
      ? rows.filter((row) => `${row.date} ${row.ym} ${row.amount}`.toLowerCase().includes(q))
      : rows
    return [...filtered].reverse()
  }, [loan, search])

  const totalPaid = loan?.payments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) ?? 0

  const columns: ColumnsType<HistoryRow> = [
    {
      title: 'Type',
      key: 'type',
      width: 80,
      render: () => <Tag color="success">EMI</Tag>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Month',
      dataIndex: 'ym',
      key: 'ym',
      width: 120,
      render: (value: string) => monthLabel(value),
    },
    {
      title: 'Comment',
      key: 'comment',
      ellipsis: true,
      render: (_value, row) => `EMI paid${activeQuarry && row.quarryId === activeQuarry.id ? ` · ${activeQuarry.name}` : ''}`,
    },
    {
      title: 'Debit',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (value: number) => (
        <Typography.Text type="danger" strong>
          −{money(value)}
        </Typography.Text>
      ),
    },
    {
      title: 'Total paid',
      dataIndex: 'running',
      key: 'running',
      width: 130,
      align: 'right',
      render: (value: number) => money(value),
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      render: (_value, row) =>
        canEdit ? (
          <Popconfirm
            title={`Undo EMI for ${monthLabel(row.ym)}?`}
            okText="Undo"
            onConfirm={async () => {
              try {
                const txnId = await undoPaid(loan!.id, row.id)
                if (txnId) dropTransaction(txnId)
                message.success('Payment undone')
              } catch (error) {
                message.error(error instanceof Error ? error.message : 'Could not undo payment')
              }
            }}
          >
            <Button size="small">Undo</Button>
          </Popconfirm>
        ) : null,
    },
  ]

  if (!loanId) return <Navigate to="/finance" replace />
  if (!loan) {
    return (
      <div>
        <p>Loan not found.</p>
        <Button type="primary" onClick={() => navigate('/finance')}>
          Back to Finance / Loan
        </Button>
      </div>
    )
  }

  if (!activeQuarry) {
    return <div>Select a quarry to record EMI payments.</div>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <Space size={8} align="center" style={{ marginBottom: 4 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/finance')} aria-label="Back" />
            <h1 style={{ margin: 0 }}>{loan.vehicleNo}</h1>
            <Tag color={loan.active ? 'success' : 'default'}>{loan.active ? 'Active' : 'Inactive'}</Tag>
            {status ? <Tag color={status.color}>{status.label}</Tag> : null}
          </Space>
          <p>
            {loan.borrower || '—'} · {loan.bank || '—'} · {loan.loanNo || '—'}
          </p>
        </div>
        {canEdit && (
          <Space wrap>
            {paidThis ? (
              <Popconfirm
                title={`Undo EMI for ${monthLabel(ym)}?`}
                okText="Undo"
                onConfirm={async () => {
                  try {
                    const txnId = await undoPaid(loan.id, paidThis.id)
                    if (txnId) dropTransaction(txnId)
                    message.success('Payment undone')
                  } catch (error) {
                    message.error(error instanceof Error ? error.message : 'Could not undo payment')
                  }
                }}
              >
                <Button>Undo this month</Button>
              </Popconfirm>
            ) : (
              <Button type="primary" onClick={() => setPayOpen(true)}>
                Mark paid
              </Button>
            )}
            <Button icon={<EditOutlined />} onClick={() => setFormOpen(true)}>
              Edit
            </Button>
            <Popconfirm
              title={`Delete ${loan.vehicleNo}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                try {
                  await removeLoan(loan.id)
                  message.success('Loan deleted')
                  navigate('/finance')
                } catch (error) {
                  message.error(error instanceof Error ? error.message : 'Could not delete loan')
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
          <StatCard title="EMI / month" value={loan.emiAmount} formatter={(value) => money(Number(value))} valueColor="#d48806" />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Payments" value={loan.payments.length} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Total paid" value={totalPaid} formatter={(value) => money(Number(value))} valueColor="#389e0d" />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title={monthLabel(ym)}
            value={status?.label ?? '—'}
            valueColor={status?.color === 'error' ? '#cf1322' : status?.color === 'success' ? '#389e0d' : '#d48806'}
          />
        </Col>
      </Row>

      <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered style={{ marginBottom: 20 }}>
        <Descriptions.Item label="Vehicle / asset">{loan.vehicleNo}</Descriptions.Item>
        <Descriptions.Item label="Name">{loan.borrower || '—'}</Descriptions.Item>
        <Descriptions.Item label="Loan number">{loan.loanNo || '—'}</Descriptions.Item>
        <Descriptions.Item label="Bank">{loan.bank || '—'}</Descriptions.Item>
        <Descriptions.Item label="Inform day">{loan.informDay}</Descriptions.Item>
        <Descriptions.Item label="Due day">{loan.dueDay}</Descriptions.Item>
        <Descriptions.Item label="EMI amount">{money(loan.emiAmount)}</Descriptions.Item>
        <Descriptions.Item label="Status">{loan.active ? 'Active' : 'Inactive'}</Descriptions.Item>
      </Descriptions>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          Transactions
        </Typography.Title>
        <Input
          allowClear
          placeholder="Search…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ width: 220 }}
        />
      </div>
      <DataTable<HistoryRow>
        rowKey="id"
        columns={columns}
        dataSource={history}
        resetKey={`${loan.id}:${search}:${loan.payments.length}`}
        emptyText="No EMI payments yet — use Mark paid"
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
        Each EMI payment posts Debit in Purchase & Expense (Finance / EMI). Total paid is the running sum of EMIs.
      </Typography.Paragraph>

      <LoanFormModal
        open={formOpen}
        initial={loan}
        onClose={() => setFormOpen(false)}
        onSave={async (draft) => {
          await updateLoanRecord(loan.id, draft)
          message.success('Loan updated')
        }}
      />

      <MarkPaidModal
        open={payOpen}
        loan={loan}
        ym={ym}
        quarryId={activeQuarry.id}
        quarryName={activeQuarry.name}
        onClose={() => setPayOpen(false)}
        onSave={async (draft) => {
          const txn = await markPaid(loan.id, draft)
          ingestTransaction(txn)
          message.success('EMI paid · expense posted')
        }}
      />
    </div>
  )
}
