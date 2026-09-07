import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Col, Input, Row, Select, Space, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'

import { DataTable, StatCard, TableCard } from '@/components/common'
import { TransactionDetail } from '@/components/transactions/TransactionDetail'
import { VoucherDialog } from '@/components/transactions/VoucherDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useParties } from '@/contexts/PartiesContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import { isMachineryRentHead } from '@/data/expenseHeads'
import type { Transaction } from '@/types/transaction'
import { formatDate, money, monthKey, monthLabel, compareByDateThenTime } from '@/utils/money'

import '@/styles/marking.css'

export function MachineryPage() {
  const { user, activeQuarry } = useAuth()
  const { getParty } = useParties()
  const { transactions, addVoucher, updateTransaction, deleteTransaction } = useTransactions()
  const canEdit = user?.role !== 'Viewer'

  const [month, setMonth] = useState('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [selected, setSelected] = useState<Transaction | null>(null)

  const quarryRent = useMemo(
    () =>
      transactions.filter(
        (row) => row.quarryId === activeQuarry?.id && row.type === 'Debit' && isMachineryRentHead(row.head),
      ),
    [transactions, activeQuarry?.id],
  )

  const months = useMemo(
    () => [...new Set(quarryRent.map((row) => monthKey(row.date)))].sort().reverse(),
    [quarryRent],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return quarryRent
      .filter((row) => {
        if (month !== 'all' && monthKey(row.date) !== month) return false
        if (!q) return true
        const partyName = getParty(row.partyId)?.name ?? ''
        return `${row.refNote ?? ''} ${row.particulars} ${row.date} ${partyName}`.toLowerCase().includes(q)
      })
      .sort((a, b) => compareByDateThenTime(b, a))
  }, [quarryRent, month, search, getParty])

  const totalPaid = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0)
  const machines = new Set(rows.map((row) => row.refNote?.trim()).filter(Boolean)).size
  const hasActiveFilters = month !== 'all' || Boolean(search.trim())
  const resetKey = `${activeQuarry?.id}:${month}:${search}`
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
      title: 'Machinery name',
      dataIndex: 'refNote',
      key: 'refNote',
      width: 180,
      ellipsis: true,
      sorter: (a, b) => (a.refNote ?? '').localeCompare(b.refNote ?? ''),
      render: (value: string | null | undefined) => value || '—',
    },
    {
      title: 'Owner',
      key: 'party',
      width: 160,
      ellipsis: true,
      render: (_value, row) => getParty(row.partyId)?.name || '—',
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
    return <Card>Select a quarry to record machinery rent.</Card>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <h1>Machinery Rent</h1>
          <p>Machine hire payments for {activeQuarry.name}.</p>
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
            Add machinery rent
          </Button>
        )}
      </div>

      <Row gutter={[12, 12]} className="page-stats-row">
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Total paid" value={totalPaid} formatter={(value) => money(Number(value))} valueColor="#cf1322" />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Entries" value={rows.length} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Machines" value={machines} />
        </Col>
      </Row>

      <TableCard
        title="Machinery rent register"
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
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search machine / owner / description…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 260 }}
            />
            {hasActiveFilters && (
              <Button
                size="small"
                onClick={() => {
                  setMonth('all')
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
            quarryRent.length === 0
              ? `No machinery rent for ${activeQuarry.name} yet.`
              : 'No machinery rent for this filter'
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
          heads={['Machinery Rent']}
          defaultHead="Machinery Rent"
          lockHead
          initial={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSave={async (draft) => {
            if (editing) {
              await updateTransaction(editing.id, 'Debit', { ...draft, head: 'Machinery Rent' })
              message.success('Machinery rent updated')
              return
            }
            await addVoucher(activeQuarry.id, 'Debit', { ...draft, head: 'Machinery Rent' })
            message.success('Machinery rent saved')
          }}
        />
      )}
    </div>
  )
}
