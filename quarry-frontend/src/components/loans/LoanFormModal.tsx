import { Form, Input, Modal, Select, message } from 'antd'
import { useEffect, useState } from 'react'

import { errorMessage } from '@/api/http'
import { NumberInput } from '@/components/common'
import { emptyLoanDraft, type Loan, type LoanDraft } from '@/types/loan'

type LoanFormModalProps = {
  open: boolean
  initial?: Loan | null
  onClose: () => void
  onSave: (draft: LoanDraft) => void | Promise<void>
}

type FormValues = {
  vehicleNo: string
  borrower: string
  loanNo: string
  bank: string
  informDay?: number
  dueDay?: number
  emiAmount?: number
  active: boolean
}

export function LoanFormModal({ open, initial = null, onClose, onSave }: LoanFormModalProps) {
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(initial)

  useEffect(() => {
    if (!open) return
    if (initial) {
      form.setFieldsValue({
        vehicleNo: initial.vehicleNo,
        borrower: initial.borrower,
        loanNo: initial.loanNo,
        bank: initial.bank,
        informDay: initial.informDay,
        dueDay: initial.dueDay,
        emiAmount: initial.emiAmount || undefined,
        active: initial.active,
      })
      return
    }
    const blank = emptyLoanDraft()
    form.setFieldsValue({
      ...blank,
      emiAmount: undefined,
    })
  }, [open, initial, form])

  const handleOk = async () => {
    try {
      setSaving(true)
      const values = await form.validateFields()
      await onSave({
        vehicleNo: values.vehicleNo.trim(),
        borrower: values.borrower?.trim() || '',
        loanNo: values.loanNo?.trim() || '',
        bank: values.bank?.trim() || '',
        informDay: Number(values.informDay) || 1,
        dueDay: Number(values.dueDay) || 5,
        emiAmount: Number(values.emiAmount) || 0,
        active: values.active,
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
      title={isEdit ? 'Edit loan' : 'Add loan'}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText={isEdit ? 'Update' : 'Save'}
      destroyOnHidden
      width={640}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        requiredMark={(label, { required }) =>
          required ? (
            <>
              {label}
              <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>
            </>
          ) : (
            label
          )
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item
            name="vehicleNo"
            label="Vehicle / asset"
            rules={[
              { required: true, message: 'Vehicle / asset is required' },
              { whitespace: true, message: 'Vehicle / asset is required' },
            ]}
          >
            <Input placeholder="e.g. PRD-500, Lorry-TN88H8977" />
          </Form.Item>
          <Form.Item name="borrower" label="Name">
            <Input placeholder="Borrower" />
          </Form.Item>
          <Form.Item name="loanNo" label="Loan number">
            <Input placeholder="e.g. MELRB-2601230002" />
          </Form.Item>
          <Form.Item name="bank" label="Bank">
            <Input placeholder="CUB / TMB / AXIS" />
          </Form.Item>
          <Form.Item
            name="informDay"
            label="Inform (day)"
            extra="Day of the month to start reminding"
            rules={[{ required: true, message: 'Inform day is required' }]}
          >
            <NumberInput min={1} max={31} style={{ width: '100%' }} placeholder="3" />
          </Form.Item>
          <Form.Item
            name="dueDay"
            label="Due date (day)"
            extra="EMI due day each month"
            rules={[{ required: true, message: 'Due day is required' }]}
          >
            <NumberInput min={1} max={31} style={{ width: '100%' }} placeholder="5" />
          </Form.Item>
          <Form.Item name="emiAmount" label="Due amount (EMI)" rules={[{ required: true, message: 'EMI amount is required' }]}>
            <NumberInput min={0} style={{ width: '100%' }} prefix="₹" placeholder="0" />
          </Form.Item>
          <Form.Item name="active" label="Active" rules={[{ required: true, message: 'Status is required' }]}>
            <Select
              options={[
                { value: true, label: 'Yes' },
                { value: false, label: 'No' },
              ]}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  )
}
