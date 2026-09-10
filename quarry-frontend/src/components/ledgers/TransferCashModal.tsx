import { Checkbox, DatePicker, Form, Input, Modal, Select, Typography, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'

import { errorMessage } from '@/api/http'
import { NumberInput } from '@/components/common'
import type { Ledger, LedgerTransferDraft } from '@/types/ledger'
import { money } from '@/utils/money'

type TransferCashModalProps = {
  open: boolean
  entry: Ledger | null
  openLedgers: Ledger[]
  onClose: () => void
  onSave: (draft: LedgerTransferDraft) => void | Promise<void>
}

type FormValues = {
  date: Dayjs
  amount?: number
  mode: 'existing' | 'new'
  toLedgerId?: string
  toHolderName?: string
  notes?: string
  close: boolean
}

export function TransferCashModal({ open, entry, openLedgers, onClose, onSave }: TransferCashModalProps) {
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const mode = Form.useWatch('mode', form) ?? 'existing'

  const destinations = useMemo(
    () => openLedgers.filter((row) => row.id !== entry?.id && row.status === 'open'),
    [openLedgers, entry?.id],
  )

  useEffect(() => {
    if (!open || !entry) return
    form.setFieldsValue({
      date: dayjs(),
      amount: undefined,
      mode: destinations.length ? 'existing' : 'new',
      toLedgerId: destinations[0]?.id,
      toHolderName: undefined,
      notes: undefined,
      close: false,
    })
  }, [open, entry, form, destinations])

  const handleOk = async () => {
    if (!entry) return
    try {
      setSaving(true)
      const values = await form.validateFields()
      const amount = Number(values.amount) || 0
      if (amount > entry.balance + 0.01) {
        message.warning(`Cannot transfer more than remaining ${money(entry.balance)}`)
        return
      }
      await onSave({
        amount,
        date: values.date.format('YYYY-MM-DD'),
        notes: values.notes?.trim() || '',
        close: values.close,
        toLedgerId: values.mode === 'existing' ? values.toLedgerId : undefined,
        toHolderName: values.mode === 'new' ? values.toHolderName?.trim() : undefined,
      })
      onClose()
    } catch (error) {
      const text = errorMessage(error)
      if (text) message.error(text)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={entry ? `Transfer from ${entry.holderName}` : 'Transfer cash'}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText="Transfer"
      destroyOnHidden
      width={520}
    >
      {entry ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
          Available {money(entry.balance)}. Transfer moves cash to another holder — does not change All Transactions.
        </Typography.Paragraph>
      ) : null}
      <Form form={form} layout="vertical">
        <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Date is required' }]}>
          <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
        </Form.Item>
        <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Amount is required' }]}>
          <NumberInput min={0} style={{ width: '100%' }} prefix="₹" placeholder="0" />
        </Form.Item>
        <Form.Item name="mode" label="Send to" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'existing', label: 'Existing ledger entry', disabled: destinations.length === 0 },
              { value: 'new', label: 'New holder' },
            ]}
          />
        </Form.Item>
        {mode === 'existing' ? (
          <Form.Item
            name="toLedgerId"
            label="Destination entry"
            rules={[{ required: true, message: 'Select destination' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select entry"
              options={destinations.map((row) => ({
                value: row.id,
                label: row.holderName,
              }))}
            />
          </Form.Item>
        ) : (
          <Form.Item
            name="toHolderName"
            label="New holder name"
            rules={[
              { required: true, message: 'Holder name is required' },
              { whitespace: true, message: 'Holder name is required' },
            ]}
          >
            <Input placeholder="e.g. Quarry supervisor" />
          </Form.Item>
        )}
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Optional" />
        </Form.Item>
        <Form.Item name="close" valuePropName="checked">
          <Checkbox>Close source entry if empty after transfer</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  )
}
