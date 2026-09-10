import {
  DownloadOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Dropdown,
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
import type { MenuProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState, type ReactNode } from 'react'

import { DataTable, TableCard } from '@/components/common'
import { TransactionDetail } from '@/components/transactions/TransactionDetail'
import { VoucherDialog } from '@/components/transactions/VoucherDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useLedgers } from '@/contexts/LedgersContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import { CREDIT_HEADS } from '@/data/expenseHeads'
import { isLedgerBookHead } from '@/data/ledgerHeads'
import type { Transaction, TxnType } from '@/types/transaction'
import { formatDate, money, monthKey, monthLabel, compareByDateThenTime } from '@/utils/money'
import {
  exportRowsToExcel,
  openPrintableTable,
  type ExportColumn,
} from '@/utils/tableExport'

import '@/styles/marking.css'

type ColumnFilters = {
  date: string
  type: string
  head: string
  ledger: string
  particulars: string
  debit: string
  credit: string
}

const emptyColumnFilters: ColumnFilters = {
  date: '',
  type: '',
  head: '',
  ledger: '',
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
  const { ledgersForQuarry, getLedger } = useLedgers()
  const canEdit = user?.role !== 'Viewer'

  const [month, setMonth] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | TxnType>('all')
  const [search, setSearch] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(emptyColumnFilters)
  const [voucherType, setVoucherType] = useState<TxnType | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [selected, setSelected] = useState<Transaction | null>(null)

  const quarryRows = useMemo(
    () =>
      transactions.filter(
        (row) => row.quarryId === activeQuarry?.id && !isLedgerBookHead(row.head),
      ),
    [transactions, activeQuarry?.id],
  )

  const cashWithHolders = useMemo(() => {
    if (!activeQuarry) return 0
    return ledgersForQuarry(activeQuarry.id, 'open').reduce(
      (sum, row) => sum + (Number(row.balance) || 0),
      0,
    )
  }, [activeQuarry, ledgersForQuarry])

  const months = useMemo(
    () => [...new Set(quarryRows.map((row) => monthKey(row.date)))].sort().reverse(),
    [quarryRows],
  )

  const categories = useMemo(
    () => [...new Set(quarryRows.map((row) => row.head).filter(Boolean))].sort(),
    [quarryRows],
  )

  const ledgerOptions = useMemo(() => {
    if (!activeQuarry) return []
    return ledgersForQuarry(activeQuarry.id)
      .map((row) => ({ value: row.id, label: row.holderName }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [activeQuarry, ledgersForQuarry])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return quarryRows
      .filter((row) => {
      const ledgerName = getLedger(row.ledgerId)?.holderName ?? ''
      if (month !== 'all' && monthKey(row.date) !== month) return false
      if (typeFilter !== 'all' && row.type !== typeFilter) return false
      if (
        q &&
        !`${row.particulars} ${row.head} ${row.date} ${row.type} ${ledgerName}`
          .toLowerCase()
          .includes(q)
      ) {
        return false
      }
      if (columnFilters.date && !row.date.includes(columnFilters.date.trim()) && !formatDate(row.date).toLowerCase().includes(columnFilters.date.trim().toLowerCase())) {
        return false
      }
      if (columnFilters.type && row.type !== columnFilters.type) return false
      if (columnFilters.head && row.head !== columnFilters.head) return false
      if (columnFilters.ledger && row.ledgerId !== columnFilters.ledger) return false
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
      .sort((a, b) => compareByDateThenTime(b, a))
  }, [quarryRows, month, typeFilter, search, columnFilters, getLedger])

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

  const exportColumns: ExportColumn<Transaction>[] = useMemo(
    () => [
      {
        header: 'Date',
        value: (row) => formatDate(row.date),
        excelValue: (row) => row.date,
      },
      {
        header: 'Type',
        value: (row) => row.type,
      },
      {
        header: 'Category',
        value: (row) => row.head || '—',
      },
      {
        header: 'Ledger',
        value: (row) => getLedger(row.ledgerId)?.holderName || '—',
      },
      {
        header: 'Description',
        value: (row) => row.particulars || '—',
      },
      {
        header: 'Debit',
        value: (row) => (row.debit ? money(row.debit) : '—'),
        excelValue: (row) => row.debit || '',
        align: 'right',
      },
      {
        header: 'Credit',
        value: (row) => (row.credit ? money(row.credit) : '—'),
        excelValue: (row) => row.credit || '',
        align: 'right',
      },
    ],
    [getLedger],
  )

  const filterContextLines = useMemo(() => {
    const lines: string[] = []
    lines.push(`Period: ${month === 'all' ? 'All months' : monthLabel(month)}`)
    lines.push(`Type: ${typeFilter === 'all' ? 'All types' : typeFilter}`)
    if (search.trim()) lines.push(`Search: ${search.trim()}`)
    if (columnFilters.date) lines.push(`Date filter: ${columnFilters.date}`)
    if (columnFilters.type) lines.push(`Column type: ${columnFilters.type}`)
    if (columnFilters.head) lines.push(`Category: ${columnFilters.head}`)
    if (columnFilters.ledger) {
      const ledgerName =
        getLedger(columnFilters.ledger)?.holderName ?? columnFilters.ledger
      lines.push(`Ledger: ${ledgerName}`)
    }
    if (columnFilters.particulars) lines.push(`Description: ${columnFilters.particulars}`)
    if (columnFilters.debit) lines.push(`Min debit: ${columnFilters.debit}`)
    if (columnFilters.credit) lines.push(`Min credit: ${columnFilters.credit}`)
    lines.push(`Entries: ${rows.length}`)
    lines.push(`Credit ${money(credit)} · Debit ${money(debit)} · Balance ${money(balance)}`)
    return lines
  }, [
    month,
    typeFilter,
    search,
    columnFilters,
    getLedger,
    rows.length,
    credit,
    debit,
    balance,
  ])

  const exportFilenameBase = useMemo(() => {
    const quarrySlug = (activeQuarry?.name ?? 'quarry')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const period = month === 'all' ? 'all-months' : month
    return `transactions-${quarrySlug}-${period}`
  }, [activeQuarry?.name, month])

  const handleExportExcel = () => {
    exportRowsToExcel(rows, exportColumns, exportFilenameBase)
    message.success(`Exported ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'} to Excel`)
  }

  const handlePrintOrPdf = (mode: 'print' | 'pdf') => {
    try {
      openPrintableTable(
        rows,
        exportColumns,
        {
          title: 'Entry list',
          subtitle: activeQuarry?.name
            ? `Quarry: ${activeQuarry.name}`
            : 'Quarry: —',
          lines: filterContextLines,
          filenameBase: exportFilenameBase,
        },
        { autoPrint: mode === 'print' },
      )
      if (mode === 'pdf') {
        message.info('Use Print → Save as PDF in the new window')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not open print window')
    }
  }

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'excel',
      label: 'Export to Excel',
      onClick: handleExportExcel,
    },
    {
      key: 'pdf',
      label: 'Export to PDF',
      onClick: () => handlePrintOrPdf('pdf'),
    },
  ]

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
      sorter: (a, b) => compareByDateThenTime(a, b),
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
        <ColumnTitle label="Ledger">
          <Select
            size="small"
            allowClear
            showSearch
            placeholder="All"
            style={{ width: '100%' }}
            value={columnFilters.ledger || undefined}
            options={ledgerOptions}
            onChange={(value) => setColumnFilter('ledger', value ?? '')}
            onClick={(event) => event.stopPropagation()}
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </ColumnTitle>
      ),
      dataIndex: 'ledgerId',
      key: 'ledger',
      width: 160,
      ellipsis: true,
      sorter: (a, b) =>
        (getLedger(a.ledgerId)?.holderName ?? '').localeCompare(getLedger(b.ledgerId)?.holderName ?? ''),
      render: (_value, row) => getLedger(row.ledgerId)?.holderName || '—',
    },
    {
      title: (
        <ColumnTitle label="Description">
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

      <Row gutter={[12, 12]} className="page-stats-row">
        <Col xs={12} sm={8} flex="1 1 140px">
          <Card size="small">
            <Statistic
              title="Credit"
              value={credit}
              formatter={(value) => money(Number(value))}
              styles={{ content: { color: '#389e0d' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <Card size="small">
            <Statistic
              title="Debit"
              value={debit}
              formatter={(value) => money(Number(value))}
              styles={{ content: { color: '#cf1322' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <Card size="small">
            <Statistic
              title="Balance"
              value={balance}
              formatter={(value) => money(Number(value))}
              styles={{ content: { color: balance < 0 ? '#cf1322' : token.colorText } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <Card size="small">
            <Statistic
              title="In ledgers"
              value={cashWithHolders}
              formatter={(value) => money(Number(value))}
              styles={{ content: { color: cashWithHolders > 0.5 ? '#d48806' : '#389e0d' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
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
            <Dropdown menu={{ items: exportMenuItems }} trigger={['click']}>
              <Button icon={<DownloadOutlined />}>Export</Button>
            </Dropdown>
            <Button icon={<PrinterOutlined />} onClick={() => handlePrintOrPdf('print')}>
              Print
            </Button>
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
        onDelete={async (id) => {
          await deleteTransaction(id)
        }}
      />

      {activeQuarry && dialogOpen && dialogType && (
        <VoucherDialog
          open
          type={dialogType}
          quarryId={activeQuarry.id}
          quarryName={activeQuarry.name}
          heads={dialogType === 'Credit' ? [...CREDIT_HEADS] : heads}
          initial={dialogInitial}
          onClose={() => {
            setVoucherType(null)
            setEditing(null)
          }}
          onCreateHead={(name) => {
            addHead(name)
          }}
          onSave={async (draft) => {
            if (editing) {
              await updateTransaction(editing.id, dialogType, draft)
              message.success('Entry updated')
              return
            }
            await addVoucher(activeQuarry.id, dialogType, draft)
            message.success(`${dialogType} entry saved`)
          }}
        />
      )}
    </div>
  )
}
