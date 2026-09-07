import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Col, Descriptions, List, Popconfirm, Row, Space, Tag, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'

import { StatCard } from '@/components/common'
import { StaffFormModal } from '@/components/staff/StaffFormModal'
import { TransactionDetail } from '@/components/transactions/TransactionDetail'
import { VoucherDialog } from '@/components/transactions/VoucherDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useStaff } from '@/contexts/StaffContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import type { Transaction } from '@/types/transaction'
import { formatDate, money, compareByDateThenTime } from '@/utils/money'

import '@/styles/marking.css'

export function StaffDetailPage() {
  const { staffId } = useParams<{ staffId: string }>()
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { getStaff, updateStaffMember, removeStaff } = useStaff()
  const { transactions, addVoucher, updateTransaction, deleteTransaction } = useTransactions()
  const [formOpen, setFormOpen] = useState(false)
  const [advanceOpen, setAdvanceOpen] = useState(false)
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)

  const canEdit = user?.role !== 'Viewer'
  const person = getStaff(staffId)
  const quarryId = activeQuarry?.id

  const linkedTxns = useMemo(() => {
    if (!person || !quarryId) return []
    return transactions
      .filter((row) => row.personId === person.id && row.quarryId === quarryId)
      .sort((a, b) => compareByDateThenTime(b, a))
  }, [person, transactions, quarryId])

  const advances = linkedTxns
    .filter((row) => row.type === 'Debit' && /advance/i.test(row.head))
    .reduce((sum, row) => sum + (Number(row.debit) || 0), 0)
  const salaryPaid = linkedTxns
    .filter((row) => row.type === 'Debit' && /salary|wage/i.test(row.head) && !/advance/i.test(row.head))
    .reduce((sum, row) => sum + (Number(row.debit) || 0), 0)

  const selectedRow = selectedTxn ? (transactions.find((row) => row.id === selectedTxn.id) ?? null) : null

  if (!staffId) return <Navigate to="/staff" replace />
  if (person && quarryId && person.quarryId !== quarryId) {
    return <Navigate to="/staff" replace />
  }
  if (!person) {
    return (
      <div>
        <p>Staff not found.</p>
        <Button type="primary" onClick={() => navigate('/staff')}>
          Back to staff
        </Button>
      </div>
    )
  }

  if (!activeQuarry) {
    return <div>Select a quarry to view this person.</div>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <Space size={8} align="center" style={{ marginBottom: 4 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/staff')} aria-label="Back" />
            <h1 style={{ margin: 0 }}>{person.name}</h1>
            <Tag color={person.status === 'Active' ? 'success' : 'default'}>{person.status}</Tag>
          </Space>
          <p>{activeQuarry.name}</p>
        </div>
        {canEdit && (
          <Space wrap>
            <Button icon={<EditOutlined />} onClick={() => setFormOpen(true)}>
              Edit
            </Button>
            <Popconfirm
              title={`Delete ${person.name}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                try {
                  await removeStaff(person.id)
                  message.success('Staff deleted')
                  navigate('/staff')
                } catch (error) {
                  message.error(error instanceof Error ? error.message : 'Could not delete staff')
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
          <StatCard title="Basic salary" value={person.basicSalary} formatter={(value) => money(Number(value))} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Advances" value={advances} formatter={(value) => money(Number(value))} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Salary paid" value={salaryPaid} formatter={(value) => money(Number(value))} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Entries" value={linkedTxns.length} />
        </Col>
      </Row>

      <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered style={{ marginBottom: 20 }}>
        <Descriptions.Item label="Designation">{person.designation || '—'}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={person.status === 'Active' ? 'success' : 'default'}>{person.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Phone">{person.phone || '—'}</Descriptions.Item>
        <Descriptions.Item label="Bank">{person.bankName || '—'}</Descriptions.Item>
        <Descriptions.Item label="Account">{person.accountNumber || '—'}</Descriptions.Item>
        <Descriptions.Item label="IFSC">{person.ifsc || '—'}</Descriptions.Item>
        <Descriptions.Item label="Branch">{person.branch || '—'}</Descriptions.Item>
        {person.notes ? (
          <Descriptions.Item label="Notes" span={2}>
            {person.notes}
          </Descriptions.Item>
        ) : null}
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
          Salary & advances
        </Typography.Title>
        {canEdit ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdvanceOpen(true)}>
            Salary advance
          </Button>
        ) : null}
      </div>
      {linkedTxns.length === 0 ? (
        <Typography.Text type="secondary">
          No salary or advance entries yet. Use Salary advance to record a payment against {person.name}.
        </Typography.Text>
      ) : (
        <List
          size="small"
          bordered
          dataSource={linkedTxns}
          renderItem={(row) => {
            const isCredit = row.type === 'Credit'
            const amount = isCredit ? row.credit : row.debit
            return (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedTxn(row)}
                actions={[
                  <Typography.Text
                    key="a"
                    type={isCredit ? undefined : 'danger'}
                    style={isCredit ? { color: '#389e0d' } : undefined}
                  >
                    {isCredit ? '+' : '−'}
                    {money(amount)}
                  </Typography.Text>,
                ]}
              >
                <List.Item.Meta
                  title={row.particulars || row.head}
                  description={`${formatDate(row.date)} · ${row.head} · ${row.type}`}
                />
              </List.Item>
            )
          }}
        />
      )}

      {formOpen && (
        <StaffFormModal
          open
          quarryId={activeQuarry.id}
          initial={person}
          onClose={() => setFormOpen(false)}
          onSave={async (draft) => {
            await updateStaffMember(person.id, draft)
            message.success('Staff updated')
          }}
        />
      )}

      <TransactionDetail
        open={Boolean(selectedRow)}
        transaction={selectedRow}
        quarryName={activeQuarry.name}
        canEdit={canEdit}
        onClose={() => setSelectedTxn(null)}
        onEdit={(row) => {
          setSelectedTxn(null)
          if (row.head.trim().toLowerCase() !== 'salary advance') {
            message.info('Open All Transactions to edit this entry')
            return
          }
          setEditingTxn(row)
          setAdvanceOpen(true)
        }}
        onDelete={async (id) => {
          await deleteTransaction(id)
        }}
      />

      {advanceOpen && (
        <VoucherDialog
          open
          type="Debit"
          quarryId={activeQuarry.id}
          quarryName={activeQuarry.name}
          heads={['Salary Advance']}
          defaultHead="Salary Advance"
          lockHead
          defaultPersonId={person.id}
          lockPerson
          initial={editingTxn}
          onClose={() => {
            setAdvanceOpen(false)
            setEditingTxn(null)
          }}
          onSave={async (draft) => {
            const linked = {
              ...draft,
              head: 'Salary Advance',
              personId: person.id,
              labourId: null,
              particulars: draft.particulars.trim() || `Salary advance — ${person.name}`,
            }
            if (editingTxn) {
              await updateTransaction(editingTxn.id, 'Debit', linked)
              message.success('Salary advance updated')
              return
            }
            await addVoucher(activeQuarry.id, 'Debit', linked)
            message.success('Salary advance saved')
          }}
        />
      )}
    </div>
  )
}
