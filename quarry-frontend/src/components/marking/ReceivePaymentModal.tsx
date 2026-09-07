import { DatePicker, Form, Input, Modal, Select, Typography, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'

import { errorMessage } from '@/api/http'
import { NumberInput } from '@/components/common'
import { PaymentMethodSelect } from '@/components/marking/PaymentMethodSelect'
import { useParties } from '@/contexts/PartiesContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import type { MarkingBatchSummary } from '@/types/marking'
import { batchBalance, batchPayStatus, batchReceived } from '@/utils/markingPayment'
import { formatMarkingNo } from '@/utils/marking'
import { formatDate, money } from '@/utils/money'

type ReceivePaymentModalProps = {
  open: boolean
  quarryId: string
  onClose: () => void
  /** Single invoice (marking detail). */
  batch?: MarkingBatchSummary
  /** Unpaid invoices to choose from (customer detail). */
  batches?: MarkingBatchSummary[]
}

type FormValues = {
  date: Dayjs
  amount: number
  paymentMethod: string
  comment?: string
}

export function ReceivePaymentModal({ open, batch, batches, quarryId, onClose }: ReceivePaymentModalProps) {
  const [form] = Form.useForm<FormValues>()
  const { transactions, addVoucher } = useTransactions()
  const { getParty } = useParties()

  const options = useMemo(() => {
    if (batch) return [batch]
    return (batches ?? []).filter((row) => batchBalance(row, transactions) > 0.5)
  }, [batch, batches, transactions])

  const [selectedBatchId, setSelectedBatchId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    setSelectedBatchId(options[0]?.batchId)
  }, [open, options])

  const selected = options.find((row) => row.batchId === selectedBatchId) ?? options[0]
  const party = getParty(selected?.partyId)
  const received = selected ? batchReceived(transactions, selected.batchId) : 0
  const balance = selected ? batchBalance(selected, transactions) : 0
  const status = selected ? batchPayStatus(selected, transactions) : null
  const needPick = !batch && options.length > 1

  useEffect(() => {
    if (!open || !selected) return
    form.setFieldsValue({
      date: dayjs(),
      amount: Math.max(0, Math.round(balance)),
      paymentMethod: 'Cash',
      comment: undefined,
    })
  }, [open, selected?.batchId, balance, form])

  const handleOk = async () => {
    if (!selected) {
      message.warning('No unpaid marking to apply this payment')
      return
    }
    try {
      const values = await form.validateFields()
      const amount = Number(values.amount) || 0
      if (amount <= 0) {
        message.warning('Amount required')
        return
      }
      if (amount > balance + 1) {
        message.warning(`Amount is more than balance ${money(balance)}`)
        return
      }
      const method = values.paymentMethod?.trim() || 'Cash'
      const isFull = amount + 0.5 >= balance
      const comment =
        values.comment?.trim() ||
        `${isFull ? 'Full' : 'Partial'} receipt (${method}) — ${party?.name ?? 'party'} · ${formatDate(selected.date)}`
      await addVoucher(quarryId, 'Credit', {
        date: values.date.format('YYYY-MM-DD'),
        amount,
        head: 'Cash Received',
        particulars: comment,
        partyId: selected.partyId,
        markingBatchId: selected.batchId,
        paymentMethod: method,
      })
      message.success(isFull ? 'Full payment received' : 'Partial payment received')
      onClose()
    } catch (error) {
      const text = errorMessage(error)
      if (text) message.error(text)
    }
  }

  return (
    <Modal
      open={open}
      title="Receive payment"
      onCancel={onClose}
      onOk={handleOk}
      okText="Save receipt"
      okButtonProps={{ disabled: !selected }}
      destroyOnHidden
    >
      {needPick && (
        <div style={{ marginBottom: 12 }}>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
            Apply to marking
          </Typography.Text>
          <Select
            style={{ width: '100%' }}
            value={selected?.batchId}
            onChange={setSelectedBatchId}
            options={options.map((row) => ({
              value: row.batchId,
              label: `${formatMarkingNo(row)} · ${formatDate(row.date)} · pending ${money(batchBalance(row, transactions))}`,
            }))}
          />
        </div>
      )}
      {selected ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Invoice {money(selected.total)} · Received {money(received)} · Balance{' '}
          <Typography.Text strong>{money(balance)}</Typography.Text>
          {status ? ` · ${status.label}` : ''}
        </Typography.Paragraph>
      ) : (
        <Typography.Paragraph type="secondary">No unpaid markings for this customer.</Typography.Paragraph>
      )}
      <Form form={form} layout="vertical" requiredMark={false} disabled={!selected}>
        <Form.Item name="date" label="Date" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
        </Form.Item>
        <Form.Item
          name="paymentMethod"
          label="Payment type"
          rules={[{ required: true, message: 'Select payment type' }]}
        >
          <PaymentMethodSelect />
        </Form.Item>
        <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Enter amount' }]}>
          <NumberInput style={{ width: '100%' }} min={1} />
        </Form.Item>
        <Form.Item name="comment" label="Comment">
          <Input placeholder="Optional note" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
