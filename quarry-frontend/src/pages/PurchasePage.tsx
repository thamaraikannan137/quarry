import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Col, Input, Row, Select, Space, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'

import { DataTable, StatCard, TableCard } from '@/components/common'
import { TransactionDetail } from '@/components/transactions/TransactionDetail'
import { VoucherDialog } from '@/components/transactions/VoucherDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useParties } from '@/contexts/PartiesContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import { PURCHASE_EXPENSE_HEADS, isFinanceHead, isMachineryRentHead, isMonthlyGiftHead, isPurchaseExpenseHead, isRoyaltyHead } from '@/data/expenseHeads'
import type { Transaction } from '@/types/transaction'
import { formatDate, money, monthKey, monthLabel, compareByDateThenTime } from '@/utils/money'

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

export function PurchasePage() {
  const { user, activeQuarry } = useAuth()
  const { getParty } = useParties()
  const { transactions, heads, addVoucher, updateTransaction, addHead, deleteTransaction } = useTransactions()
  const canEdit = user?.role !== 'Viewer'

  const [month, setMonth] = useState('all')
  const [headFilter, setHeadFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [selected, setSelected] = useState<Transaction | null>(null)

  const quarryExpenses = useMemo(
    () =>
      transactions.filter(
        (row) => row.quarryId === activeQuarry?.id && row.type === 'Debit' && isPurchaseExpenseHead(row.head),
      ),
    [transactions, activeQuarry?.id],
  )

  const months = useMemo(
    () => [...new Set(quarryExpenses.map((row) => monthKey(row.date)))].sort().reverse(),
    [quarryExpenses],
  )

  const categoryOptions = useMemo(
    () => [...new Set(quarryExpenses.map((row) => row.head).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [quarryExpenses],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return quarryExpenses
      .filter((row) => {
        if (month !== 'all' && monthKey(row.date) !== month) return false
        if (headFilter !== 'all' && row.head !== headFilter) return false
        if (!q) return true
        const partyName = getParty(row.partyId)?.name ?? ''
        return `${row.particulars} ${row.head} ${row.date} ${row.refNote ?? ''} ${partyName}`.toLowerCase().includes(q)
      })
      .sort((a, b) => compareByDateThenTime(b, a))
  }, [quarryExpenses, month, headFilter, search, getParty])

  const totalSpend = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0)
  const dieselLitres = rows.reduce((sum, row) => sum + (Number(row.litres) || 0), 0)
  const topCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of rows) {
      map.set(row.head || 'Other', (map.get(row.head || 'Other') ?? 0) + (Number(row.debit) || 0))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])[0]
  }, [rows])

  const voucherHeads = useMemo(
    () => uniqueHeads([...PURCHASE_EXPENSE_HEADS, ...heads.filter(isPurchaseExpenseHead)]),
    [heads],
  )

  const hasActiveFilters = month !== 'all' || headFilter !== 'all' || Boolean(search.trim())
  const resetKey = `${activeQuarry?.id}:${month}:${headFilter}:${search}`
  const selectedRow = selected ? (transactions.find((row) => row.id === selected.id) ?? null) : null

  const columns: ColumnsType<Transaction> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      sorter: (a, b) => compareByDateThenTime(a, b),
      defaultSortOrder: 'descend',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Category',
      dataIndex: 'head',
      key: 'head',
      width: 160,
      sorter: (a, b) => a.head.localeCompare(b.head),
      render: (value: string) => <Tag>{value || 'Other'}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'particulars',
      key: 'particulars',
      ellipsis: true,
      sorter: (a, b) => a.particulars.localeCompare(b.particulars),
      render: (value: string, row) => value || row.head || '—',
    },
    {
      title: 'Party',
      key: 'party',
      width: 160,
      ellipsis: true,
      render: (_value, row) => getParty(row.partyId)?.name || '—',
    },
    {
      title: 'Amount',
      dataIndex: 'debit',
      key: 'debit',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.debit - b.debit,
      render: (value: number) => (
        <Typography.Text type="danger" strong>
          {money(value)}
        </Typography.Text>
      ),
    },
  ]

  if (!activeQuarry) {
    return <Card>Select a quarry to record purchase and expense.</Card>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <h1>Purchase & Expense</h1>
          <p>
            Daily quarry spend for {activeQuarry.name} — diesel, grocery, repair, bills. Monthly gifts go to Monthly
            Gift. Royalty goes to Royalty. Machinery rent goes to Machinery Rent.
          </p>
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
            Add expense
          </Button>
        )}
      </div>

      <Row gutter={[12, 12]} className="page-stats-row">
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Total spent" value={totalSpend} formatter={(value) => money(Number(value))} valueColor="#cf1322" />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Entries" value={rows.length} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Diesel litres" value={dieselLitres} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Top category" value={topCategory?.[0] ?? '—'} />
        </Col>
      </Row>

      <TableCard
        title="Expense register"
        extra={
          <Space wrap size={8}>
            <Select
              style={{ minWidth: 140 }}
              value={month}
              onChange={setMonth}
              options={[
                { value: 'all', label: 'All months' },
                ...months.map((key) => ({ value: key, label: monthLabel(key) })),
              ]}
            />
            <Select
              style={{ minWidth: 160 }}
              value={headFilter}
              onChange={setHeadFilter}
              showSearch
              optionFilterProp="label"
              options={[
                { value: 'all', label: 'All categories' },
                ...categoryOptions.map((head) => ({ value: head, label: head })),
              ]}
            />
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search comment / party…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 200 }}
            />
            {hasActiveFilters && (
              <Button
                size="small"
                onClick={() => {
                  setMonth('all')
                  setHeadFilter('all')
                  setSearch('')
                }}
              >
                Clear filters
              </Button>
            )}
          </Space>
        }
      >
        <DataTable<Transaction>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          resetKey={resetKey}
          emptyFilterHint={hasActiveFilters ? 'try Clear filters' : undefined}
          emptyText={
            quarryExpenses.length === 0
              ? `No expenses for ${activeQuarry.name} yet. Add diesel, grocery, or a vendor bill to start.`
              : 'No expenses for this filter'
          }
          onRow={(record) => ({
            onClick: () => setSelected(record),
            style: { cursor: 'pointer' },
          })}
        />
      </TableCard>

      <TransactionDetail
        open={Boolean(selectedRow)}
        transaction={selectedRow}
        quarryName={activeQuarry.name}
        canEdit={canEdit}
        onClose={() => setSelected(null)}
        onEdit={(row) => {
          setSelected(null)
          setEditing(row)
          setFormOpen(true)
        }}
        onDelete={async (id) => {
          await deleteTransaction(id)
        }}
      />

      {formOpen && (
        <VoucherDialog
          open
          type="Debit"
          quarryId={activeQuarry.id}
          quarryName={activeQuarry.name}
          heads={voucherHeads}
          initial={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onCreateHead={(name) => {
            addHead(name)
          }}
          onSave={async (draft) => {
            const toSection = isMonthlyGiftHead(draft.head)
              ? 'Monthly Gift'
              : isRoyaltyHead(draft.head)
                ? 'Royalty'
                : isMachineryRentHead(draft.head)
                  ? 'Machinery Rent'
                  : isFinanceHead(draft.head)
                    ? 'Finance / Loan'
                    : null
            if (editing) {
              await updateTransaction(editing.id, 'Debit', draft)
              message.success(toSection ? `${toSection} updated` : 'Expense updated')
              return
            }
            await addVoucher(activeQuarry.id, 'Debit', draft)
            message.success(toSection ? `Saved to ${toSection}` : 'Expense saved')
          }}
        />
      )}
    </div>
  )
}
