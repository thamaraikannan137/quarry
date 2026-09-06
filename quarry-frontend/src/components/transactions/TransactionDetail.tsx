import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Descriptions, Modal, Popconfirm, Space, Tag, Typography, message } from 'antd'
import dayjs from 'dayjs'

import { advanceLinkLabel } from '@/data/demoLinks'
import { useParties } from '@/contexts/PartiesContext'
import type { Transaction } from '@/types/transaction'
import { money } from '@/utils/money'

type TransactionDetailProps = {
  open: boolean
  transaction: Transaction | null
  quarryName?: string
  canEdit: boolean
  onClose: () => void
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
}

function formatDate(value: string) {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD MMM YYYY') : value
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
  if (!transaction) return null

  const isCredit = transaction.type === 'Credit'
  const amount = isCredit ? transaction.credit : transaction.debit
  const party = getParty(transaction.partyId)?.name ?? null
  const link = advanceLinkLabel(transaction.personId, transaction.labourId)

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
                onConfirm={() => {
                  onDelete(transaction.id)
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
        <Descriptions.Item label="Type">
          <Tag color={isCredit ? 'success' : 'error'}>{transaction.type}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Category">{transaction.head || '—'}</Descriptions.Item>
        {party ? <Descriptions.Item label="Party">{party}</Descriptions.Item> : null}
        {link ? <Descriptions.Item label="Linked to">{link}</Descriptions.Item> : null}
        {transaction.litres ? (
          <Descriptions.Item label="Litres">{transaction.litres}</Descriptions.Item>
        ) : null}
        {transaction.refNote ? (
          <Descriptions.Item label="Reference">{transaction.refNote}</Descriptions.Item>
        ) : null}
        <Descriptions.Item label="Comment">{transaction.particulars || '—'}</Descriptions.Item>
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
