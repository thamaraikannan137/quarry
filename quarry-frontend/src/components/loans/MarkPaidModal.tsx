import { DatePicker, Form, Modal, Typography, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'

import { errorMessage } from '@/api/http'
import { NumberInput } from '@/components/common'
import type { Loan, LoanPayDraft } from '@/types/loan'
import { dueDateForMonth } from '@/utils/loanStatus'
import { monthLabel } from '@/utils/money'

type MarkPaidModalProps = {
  open: boolean
  loan: Loan | null
  ym: string
  quarryId: string
  quarryName: string
  onClose: () => void
  onSave: (draft: LoanPayDraft) => void | Promise<void>
}

type FormValues = {
  date: Dayjs
  amount: number
}

export function MarkPaidModal({
  open,
  loan,
  ym,
  quarryId,
  quarryName,
  onClose,
  onSave,
}: MarkPaidModalProps) {
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !loan) return
    form.setFieldsValue({
      date: dayjs(dueDateForMonth(ym, loan.dueDay)),
      amount: loan.emiAmount || undefined,
    })
  }, [open, loan, ym, form])

  const handleOk = async () => {
    try {
      setSaving(true)
      const values = await form.validateFields()
      await onSave({
        quarryId,
        date: values.date.format('YYYY-MM-DD'),
        amount: Number(values.amount) || 0,
      })
      onClose()
    } catch (error) {
      const text = errorMessage(error)
      if (text) message.error(text)
    } finally {
      setSaving(false)
    }
  }

  if (!loan) return null

  return (
    <Modal
      open={open}
      title={`Mark EMI paid — ${loan.vehicleNo}`}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText="Mark paid"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="date" label="Payment date" rules={[{ required: true, message: 'Date is required' }]}>
          <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
        </Form.Item>
        <Form.Item
          name="amount"
          label="Amount"
          rules={[{ required: true, message: 'Amount is required' }]}
        >
          <NumberInput min={1} style={{ width: '100%' }} prefix="₹" placeholder="0" />
        </Form.Item>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Posts Debit · Finance / EMI for <strong>{quarryName}</strong> · {monthLabel(ym)}.
        </Typography.Paragraph>
      </Form>
    </Modal>
  )
}
