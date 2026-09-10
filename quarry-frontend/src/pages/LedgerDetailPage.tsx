import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Col, Descriptions, Popconfirm, Row, Space, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'

import { DataTable, StatCard, TableCard } from '@/components/common'
import { LedgerFormModal } from '@/components/ledgers/LedgerFormModal'
import { TransferCashModal } from '@/components/ledgers/TransferCashModal'
import { TransactionDetail } from '@/components/transactions/TransactionDetail'
import { VoucherDialog } from '@/components/transactions/VoucherDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useLedgers } from '@/contexts/LedgersContext'
import { useParties } from '@/contexts/PartiesContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import { PURCHASE_EXPENSE_HEADS, CREDIT_HEADS, isPurchaseExpenseHead } from '@/data/expenseHeads'
import type { Transaction, TxnType } from '@/types/transaction'
import { compareByDateThenTime, formatDate, money } from '@/utils/money'

import '@/styles/marking.css'

function uniqueHeads(list: string[]) {
  const seen = new Set<string>()
  const next: string[] = []
  for (const item of list) {
    const name = item.trim()
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    next.push(name)
  }
  return next
}

export function LedgerDetailPage() {
  const { ledgerId } = useParams<{ ledgerId: string }>()
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { getLedger, updateLedgerRecord, removeLedger, transferCash, ledgersForQuarry, addLedger } =
    useLedgers()
  const { transactions, heads, addVoucher, updateTransaction, addHead, deleteTransaction } = useTransactions()
  const { getParty } = useParties()
  const canEdit = user?.role !== 'Viewer'

  const [formOpen, setFormOpen] = useState(false)
  const [giveInOpen, setGiveInOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [voucherType, setVoucherType] = useState<TxnType | null>(null)
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)
  const [selected, setSelected] = useState<Transaction | null>(null)

  const entry = getLedger(ledgerId)

  const linked = useMemo(() => {
    if (!entry) return []
    return transactions
      .filter((row) => row.ledgerId === entry.id)
      .sort((a, b) => compareByDateThenTime(b, a))
  }, [transactions, entry])

  const outTotal = Math.round((Number(entry?.spent || 0) + Number(entry?.returnedAmount || 0)) * 100) / 100

  const debitHeads = useMemo(
    () => uniqueHeads([...PURCHASE_EXPENSE_HEADS, ...heads.filter(isPurchaseExpenseHead)]),
    [heads],
  )

  const columns: ColumnsType<Transaction> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (value: TxnType) => (
        <Tag color={value === 'Credit' ? 'success' : 'error'}>{value}</Tag>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'head',
      key: 'head',
      width: 140,
      ellipsis: true,
    },
    {
      title: 'Particulars',
      dataIndex: 'particulars',
      key: 'particulars',
      ellipsis: true,
      render: (value: string, row) => {
        const party = getParty(row.partyId)?.name
        return party ? `${value} · ${party}` : value
      },
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      width: 120,
      align: 'right',
      render: (value: number) =>
        value ? <Typography.Text type="danger">{money(value)}</Typography.Text> : '—',
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      width: 120,
      align: 'right',
      render: (value: number) =>
        value ? <Typography.Text style={{ color: '#389e0d' }}>{money(value)}</Typography.Text> : '—',
    },
  ]

  if (!ledgerId) return <Navigate to="/ledger" replace />
  if (!entry) {
    return (
      <div>
        <p>Ledger entry not found.</p>
        <Button type="primary" onClick={() => navigate('/ledger')}>
          Back to Ledger
        </Button>
      </div>
    )
  }

  if (!activeQuarry) {
    return <div>Select a quarry to manage this ledger entry.</div>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <Space size={8} align="center" style={{ marginBottom: 4 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/ledger')} aria-label="Back" />
            <h1 style={{ margin: 0 }}>{entry.holderName} ledger</h1>
            <Tag color={entry.status === 'open' ? 'processing' : 'default'}>
              {entry.status === 'open' ? 'Open' : 'Closed'}
            </Tag>
          </Space>
        </div>
        {canEdit && (
          <Space wrap>
            {entry.status === 'open' ? (
              <>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => setGiveInOpen(true)}
                >
                  In
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingTxn(null)
                    setVoucherType('Debit')
                  }}
                >
                  Out
                </Button>
                <Button onClick={() => setTransferOpen(true)}>Transfer</Button>
              </>
            ) : (
              <Button
                type="primary"
                onClick={async () => {
                  try {
                    await updateLedgerRecord(entry.id, {
                      quarryId: entry.quarryId,
                      holderName: entry.holderName,
                      personId: entry.personId,
                      date: entry.date,
                      amount: entry.amount,
                      notes: entry.notes,
                      status: 'open',
                      closedDate: null,
                    })
                    message.success('Ledger reopened')
                  } catch (error) {
                    message.error(error instanceof Error ? error.message : 'Could not reopen')
                  }
                }}
              >
                Reopen
              </Button>
            )}
            <Button icon={<EditOutlined />} onClick={() => setFormOpen(true)}>
              Edit ledger
            </Button>
            <Popconfirm
              title={`Delete cash given to ${entry.holderName}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                try {
                  await removeLedger(entry.id)
                  message.success('Ledger entry deleted')
                  navigate('/ledger')
                } catch (error) {
                  message.error(error instanceof Error ? error.message : 'Could not delete')
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
          <StatCard
            title="In"
            value={entry.amount}
            formatter={(value) => money(Number(value))}
            valueColor="#389e0d"
          />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Out"
            value={outTotal}
            formatter={(value) => money(Number(value))}
            valueColor="#cf1322"
          />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Balance"
            value={entry.balance}
            formatter={(value) => money(Number(value))}
            valueColor={entry.balance > 0.5 ? '#d48806' : '#389e0d'}
          />
        </Col>
      </Row>

      <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Ledger name">{entry.holderName}</Descriptions.Item>
        <Descriptions.Item label="Date">{formatDate(entry.date)}</Descriptions.Item>
        <Descriptions.Item label="Status">{entry.status === 'open' ? 'Open' : 'Closed'}</Descriptions.Item>
        <Descriptions.Item label="Closed">
          {entry.closedDate ? formatDate(entry.closedDate) : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Notes" span={2}>
          {entry.notes || '—'}
        </Descriptions.Item>
      </Descriptions>

      <TableCard title={`Transactions (${linked.length})`}>
        <DataTable<Transaction>
          rowKey="id"
          columns={columns}
          dataSource={linked}
          scrollX={900}
          emptyText="No transactions yet — add In (give cash) or Out (expense)."
          onRow={(record) => ({
            onClick: () => setSelected(record),
            style: { cursor: 'pointer' },
          })}
        />
      </TableCard>

      <LedgerFormModal
        open={formOpen}
        quarryId={entry.quarryId}
        quarryName={activeQuarry?.name}
        initial={entry}
        onClose={() => setFormOpen(false)}
        onSave={async (draft) => {
          const status = draft.status ?? entry.status
          await updateLedgerRecord(entry.id, {
            ...draft,
            amount: draft.amount > 0 ? draft.amount + entry.amount : entry.amount,
            status,
            closedDate: status === 'open' ? null : draft.closedDate ?? entry.closedDate ?? new Date().toISOString().slice(0, 10),
          })
          message.success('Ledger updated')
        }}
      />

      <LedgerFormModal
        open={giveInOpen}
        quarryId={entry.quarryId}
        quarryName={activeQuarry?.name}
        addInFor={entry}
        onClose={() => setGiveInOpen(false)}
        onSave={async (draft) => {
          await addLedger(draft)
          message.success('In recorded')
        }}
      />

      <TransferCashModal
        open={transferOpen}
        entry={entry}
        openLedgers={ledgersForQuarry(entry.quarryId, 'open')}
        onClose={() => setTransferOpen(false)}
        onSave={async (draft) => {
          const result = await transferCash(entry.id, draft)
          message.success(`Transferred to ${result.to.holderName}`)
        }}
      />

      <VoucherDialog
        open={Boolean(voucherType) || Boolean(editingTxn)}
        type={(editingTxn?.type ?? voucherType) || 'Debit'}
        quarryId={entry.quarryId}
        quarryName={activeQuarry.name}
        heads={(editingTxn?.type ?? voucherType) === 'Credit' ? [...CREDIT_HEADS] : debitHeads}
        initial={editingTxn}
        defaultLedgerId={entry.id}
        lockLedger
        onClose={() => {
          setVoucherType(null)
          setEditingTxn(null)
        }}
        onSave={async (draft) => {
          const type = (editingTxn?.type ?? voucherType) || 'Debit'
          if (editingTxn) {
            await updateTransaction(editingTxn.id, type, { ...draft, ledgerId: entry.id })
            message.success(`${type} updated`)
          } else {
            await addVoucher(entry.quarryId, type, { ...draft, ledgerId: entry.id })
            message.success(`${type} added`)
          }
        }}
        onCreateHead={addHead}
      />

      <TransactionDetail
        open={Boolean(selected)}
        transaction={selected}
        quarryName={activeQuarry.name}
        canEdit={canEdit}
        onClose={() => setSelected(null)}
        onEdit={(row) => {
          setSelected(null)
          setEditingTxn(row)
        }}
        onDelete={async (id) => {
          await deleteTransaction(id)
        }}
      />
    </div>
  )
}
