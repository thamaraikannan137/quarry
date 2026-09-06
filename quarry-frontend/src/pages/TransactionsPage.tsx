import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
  theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useMemo, useState, type ReactNode } from 'react'

import { DataTable, TableCard } from '@/components/common'
import { TransactionDetail } from '@/components/transactions/TransactionDetail'
import { VoucherDialog } from '@/components/transactions/VoucherDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import type { Transaction, TxnType } from '@/types/transaction'
import { money, monthKey, monthLabel } from '@/utils/money'

type ColumnFilters = {
  date: string
  type: string
  head: string
  particulars: string
  debit: string
  credit: string
}

const emptyColumnFilters: ColumnFilters = {
  date: '',
  type: '',
  head: '',
  particulars: '',
  debit: '',
  credit: '',
}

function matchesAmount(value: number, filter: string) {
  const q = filter.trim()
  if (!q) return true
  if (value === 0 && q !== '0') return false
  const asNumber = Number(q)
  if (!Number.isNaN(asNumber) && q !== '') return value >= asNumber
  return String(value).includes(q)
}

function formatDate(value: string) {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD MMM YYYY') : value
}

function ColumnTitle({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span>{label}</span>
      {children}
    </div>
  )
}

export function TransactionsPage() {
  const { token } = theme.useToken()
  const { user, activeQuarry } = useAuth()
  const { transactions, heads, addVoucher, updateTransaction, addHead, deleteTransaction } = useTransactions()
  const canEdit = user?.role !== 'Viewer'

  const [month, setMonth] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | TxnType>('all')
  const [search, setSearch] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(emptyColumnFilters)
  const [voucherType, setVoucherType] = useState<TxnType | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [selected, setSelected] = useState<Transaction | null>(null)

  const quarryRows = useMemo(
    () => transactions.filter((row) => row.quarryId === activeQuarry?.id),
    [transactions, activeQuarry?.id],
  )

  const months = useMemo(
    () => [...new Set(quarryRows.map((row) => monthKey(row.date)))].sort().reverse(),
    [quarryRows],
  )

  const categories = useMemo(
    () => [...new Set(quarryRows.map((row) => row.head).filter(Boolean))].sort(),
    [quarryRows],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return quarryRows.filter((row) => {
      if (month !== 'all' && monthKey(row.date) !== month) return false
      if (typeFilter !== 'all' && row.type !== typeFilter) return false
      if (q && !`${row.particulars} ${row.head} ${row.date} ${row.type}`.toLowerCase().includes(q)) {
        return false
      }
      if (columnFilters.date && !row.date.includes(columnFilters.date.trim()) && !formatDate(row.date).toLowerCase().includes(columnFilters.date.trim().toLowerCase())) {
        return false
      }
      if (columnFilters.type && row.type !== columnFilters.type) return false
      if (columnFilters.head && row.head !== columnFilters.head) return false
      if (
        columnFilters.particulars &&
        !row.particulars.toLowerCase().includes(columnFilters.particulars.toLowerCase().trim())
      ) {
        return false
      }
      if (!matchesAmount(row.debit, columnFilters.debit)) return false
      if (!matchesAmount(row.credit, columnFilters.credit)) return false
      return true
    })
  }, [quarryRows, month, typeFilter, search, columnFilters])

  const selectedRow = selected ? (transactions.find((row) => row.id === selected.id) ?? null) : null

  const debit = rows.reduce((sum, row) => sum + row.debit, 0)
  const credit = rows.reduce((sum, row) => sum + row.credit, 0)
  const balance = credit - debit
  const hasColumnFilters = Object.values(columnFilters).some(Boolean)
  const hasActiveFilters =
    month !== 'all' || typeFilter !== 'all' || Boolean(search.trim()) || hasColumnFilters
  const resetKey = `${activeQuarry?.id}:${month}:${typeFilter}:${search}:${JSON.stringify(columnFilters)}`

  const setColumnFilter = (key: keyof ColumnFilters, value: string) => {
    setColumnFilters((current) => ({ ...current, [key]: value }))
  }

  const clearFilters = () => {
    setMonth('all')
    setTypeFilter('all')
    setSearch('')
    setColumnFilters(emptyColumnFilters)
  }

  const columns: ColumnsType<Transaction> = [
    {
      title: (
        <ColumnTitle label="Date">
          <Input
            size="small"
            allowClear
            placeholder="Filter date"
            value={columnFilters.date}
            onChange={(event) => setColumnFilter('date', event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
        </ColumnTitle>
      ),
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => a.date.localeCompare(b.date),
      defaultSortOrder: 'descend',
      width: 150,
      render: (value: string) => formatDate(value),
    },
    {
      title: (
        <ColumnTitle label="Type">
          <Select
            size="small"
            allowClear
            placeholder="All"
            style={{ width: '100%' }}
            value={columnFilters.type || undefined}
            options={[
              { value: 'Debit', label: 'Debit' },
              { value: 'Credit', label: 'Credit' },
            ]}
            onChange={(value) => setColumnFilter('type', value ?? '')}
            onClick={(event) => event.stopPropagation()}
          />
        </ColumnTitle>
      ),
      dataIndex: 'type',
      key: 'type',
      sorter: (a, b) => a.type.localeCompare(b.type),
      width: 120,
      render: (value: TxnType) => (
        <Tag color={value === 'Credit' ? 'success' : 'error'}>{value}</Tag>
      ),
    },
    {
      title: (
        <ColumnTitle label="Category">
          <Select
            size="small"
            allowClear
            showSearch
            placeholder="All"
            style={{ width: '100%' }}
            value={columnFilters.head || undefined}
            options={categories.map((item) => ({ value: item, label: item }))}
            onChange={(value) => setColumnFilter('head', value ?? '')}
            onClick={(event) => event.stopPropagation()}
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </ColumnTitle>
      ),
      dataIndex: 'head',
      key: 'head',
      sorter: (a, b) => a.head.localeCompare(b.head),
      width: 180,
      ellipsis: true,
    },
    {
      title: (
        <ColumnTitle label="Comment">
          <Input
            size="small"
            allowClear
            placeholder="Filter"
            value={columnFilters.particulars}
            onChange={(event) => setColumnFilter('particulars', event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
        </ColumnTitle>
      ),
      dataIndex: 'particulars',
      key: 'particulars',
      sorter: (a, b) => a.particulars.localeCompare(b.particulars),
      ellipsis: true,
    },
    {
      title: (
        <ColumnTitle label="Debit">
          <Input
            size="small"
            allowClear
            placeholder="Min ₹"
            value={columnFilters.debit}
            onChange={(event) => setColumnFilter('debit', event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
        </ColumnTitle>
      ),
      dataIndex: 'debit',
      key: 'debit',
      align: 'right',
      sorter: (a, b) => a.debit - b.debit,
      width: 130,
      render: (value: number) =>
        value ? <Typography.Text type="danger">{money(value)}</Typography.Text> : '—',
    },
    {
      title: (
        <ColumnTitle label="Credit">
          <Input
            size="small"
            allowClear
            placeholder="Min ₹"
            value={columnFilters.credit}
            onChange={(event) => setColumnFilter('credit', event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
        </ColumnTitle>
      ),
      dataIndex: 'credit',
      key: 'credit',
      align: 'right',
      sorter: (a, b) => a.credit - b.credit,
      width: 130,
      render: (value: number) =>
        value ? <Typography.Text style={{ color: '#389e0d' }}>{money(value)}</Typography.Text> : '—',
    },
  ]

  const dialogOpen = Boolean(voucherType) || Boolean(editing)
  const dialogType = editing?.type ?? voucherType
  const dialogInitial = editing

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
        }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            All Transactions
          </Typography.Title>
          <Typography.Text type="secondary">
            All credit & debit entries for {activeQuarry?.name ?? 'this quarry'} · click a row for details.
          </Typography.Text>
        </div>
        {canEdit && (
          <Space wrap>
            <Button
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null)
                setVoucherType('Credit')
              }}
            >
              Add credit
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null)
                setVoucherType('Debit')
              }}
            >
              Add debit
            </Button>
          </Space>
        )}
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Debit"
              value={debit}
              formatter={(value) => money(Number(value))}
              styles={{ content: { color: '#cf1322' } }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Credit"
              value={credit}
              formatter={(value) => money(Number(value))}
              styles={{ content: { color: '#389e0d' } }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Balance"
              value={balance}
              formatter={(value) => money(Number(value))}
              styles={{ content: { color: balance < 0 ? '#cf1322' : token.colorText } }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total entries"
              value={rows.length}
              suffix={<Typography.Text type="secondary">of {quarryRows.length}</Typography.Text>}
            />
          </Card>
        </Col>
      </Row>

      <TableCard
        title="Entry list"
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
              style={{ minWidth: 120 }}
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'all', label: 'All types' },
                { value: 'Debit', label: 'Debit' },
                { value: 'Credit', label: 'Credit' },
              ]}
            />
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 180 }}
            />
            {hasActiveFilters && (
              <Button size="small" onClick={clearFilters}>
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
            quarryRows.length === 0
              ? `No cash-book entries for ${activeQuarry?.name ?? 'this quarry'} yet. Add a credit or debit to get started.`
              : 'No entries for this filter'
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
        quarryName={activeQuarry?.name}
        canEdit={canEdit}
        onClose={() => setSelected(null)}
        onEdit={(row) => {
          setSelected(null)
          setVoucherType(null)
          setEditing(row)
        }}
        onDelete={deleteTransaction}
      />

      {activeQuarry && dialogOpen && dialogType && (
        <VoucherDialog
          open
          type={dialogType}
          quarryId={activeQuarry.id}
          quarryName={activeQuarry.name}
          heads={heads}
          initial={dialogInitial}
          onClose={() => {
            setVoucherType(null)
            setEditing(null)
          }}
          onCreateHead={(name) => {
            addHead(name)
          }}
          onSave={(draft) => {
            if (editing) {
              updateTransaction(editing.id, dialogType, draft)
              message.success('Entry updated')
              return
            }
            addVoucher(activeQuarry.id, dialogType, draft)
            message.success(`${dialogType} entry saved`)
          }}
        />
      )}
    </div>
  )
}
