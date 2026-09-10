import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Descriptions, Modal, Popconfirm, Space, Tag, Typography, message } from 'antd'
import dayjs from 'dayjs'

import { advanceLinkLabel } from '@/data/demoLinks'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useParties } from '@/contexts/PartiesContext'
import { useStaff } from '@/contexts/StaffContext'
import type { Transaction } from '@/types/transaction'
import { formatDate, money } from '@/utils/money'

type TransactionDetailProps = {
  open: boolean
  transaction: Transaction | null
  quarryName?: string
  canEdit: boolean
  onClose: () => void
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void | Promise<void>
}

function extraNoteLabel(head: string) {
  const key = head.trim().toLowerCase()
  if (key === 'monthly gift') return 'Name'
  if (key === 'machinery rent') return 'Machinery name'
  if (key === 'finance / emi' || key === 'finance / loan' || key === 'finance' || key === 'emi') return 'Machine'
  return 'Reference'
}

export function TransactionDetail({
  open,
  transaction,
  quarryName,
  canEdit,
  onClose,
  onEdit,
  onDelete,
}: TransactionDetailProps) {
  const { getParty } = useParties()
  const { getBatch } = useMarkings()
  const { getStaff } = useStaff()
  if (!transaction) return null

  const isCredit = transaction.type === 'Credit'
  const amount = isCredit ? transaction.credit : transaction.debit
  const party = getParty(transaction.partyId)?.name ?? null
  const staff = getStaff(transaction.personId)
  const link = staff
    ? `${staff.name} · ${staff.designation || 'Staff'}`
    : advanceLinkLabel(transaction.personId, transaction.labourId)
  const marking = getBatch(transaction.markingBatchId)

  return (
    <Modal
      open={open}
      title={`${transaction.type} details — ${quarryName ?? 'Quarry'}`}
      onCancel={onClose}
      destroyOnHidden
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={onClose}>Close</Button>
          {canEdit ? (
            <Space>
              <Popconfirm
                title="Delete this entry?"
                description={`${formatDate(transaction.date)} · ${transaction.particulars || transaction.head}`}
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={async () => {
                  await onDelete(transaction.id)
                  message.success('Entry deleted')
                  onClose()
                }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  onEdit(transaction)
                }}
              >
                Edit
              </Button>
            </Space>
          ) : null}
        </Space>
      }
    >
      <Descriptions column={1} size="middle" style={{ marginTop: 8 }}>
        <Descriptions.Item label="Date">{formatDate(transaction.date)}</Descriptions.Item>
        {transaction.createdAt ? (
          <Descriptions.Item label="Entered">
            {dayjs(transaction.createdAt).isValid()
              ? dayjs(transaction.createdAt).format('DD MMM YYYY, hh:mm A')
              : transaction.createdAt}
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="Type">
          <Tag color={isCredit ? 'success' : 'error'}>{transaction.type}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Category">{transaction.head || '—'}</Descriptions.Item>
        {party ? <Descriptions.Item label="Party">{party}</Descriptions.Item> : null}
        {transaction.paymentMethod ? (
          <Descriptions.Item label="Payment type">{transaction.paymentMethod}</Descriptions.Item>
        ) : null}
        {marking ? (
          <Descriptions.Item label="Applied to marking">
            {formatDate(marking.date)} · {money(marking.total)}
          </Descriptions.Item>
        ) : null}
        {link ? <Descriptions.Item label="Linked to">{link}</Descriptions.Item> : null}
        {transaction.litres ? (
          <Descriptions.Item label="Litres">{transaction.litres}</Descriptions.Item>
        ) : null}
        {transaction.refNote ? (
          <Descriptions.Item label={extraNoteLabel(transaction.head)}>{transaction.refNote}</Descriptions.Item>
        ) : null}
        <Descriptions.Item label="Description">{transaction.particulars || '—'}</Descriptions.Item>
        <Descriptions.Item label={isCredit ? 'Credit' : 'Debit'}>
          <Typography.Text
            strong
            type={isCredit ? undefined : 'danger'}
            style={isCredit ? { color: '#389e0d' } : undefined}
          >
            {money(amount)}
          </Typography.Text>
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  )
}
