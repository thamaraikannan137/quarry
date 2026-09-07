import { Form, Input, Modal, Select, message } from 'antd'
import { useEffect, useState } from 'react'

import { errorMessage } from '@/api/http'
import { NumberInput } from '@/components/common'
import { STAFF_STATUSES, emptyStaffDraft, type Staff, type StaffDraft } from '@/types/staff'

type StaffFormModalProps = {
  open: boolean
  quarryId: string
  initial?: Staff | null
  zIndex?: number
  onClose: () => void
  onSave: (draft: StaffDraft) => void | Promise<void>
}

type FormValues = {
  name: string
  designation: string
  basicSalary?: number
  phone: string
  bankName: string
  accountNumber: string
  ifsc: string
  branch: string
  status: StaffDraft['status']
  notes: string
}

export function StaffFormModal({ open, quarryId, initial = null, zIndex, onClose, onSave }: StaffFormModalProps) {
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(initial)

  useEffect(() => {
    if (!open) return
    if (initial) {
      form.setFieldsValue({
        name: initial.name,
        designation: initial.designation,
        basicSalary: initial.basicSalary || undefined,
        phone: initial.phone,
        bankName: initial.bankName,
        accountNumber: initial.accountNumber,
        ifsc: initial.ifsc,
        branch: initial.branch,
        status: initial.status,
        notes: initial.notes,
      })
      return
    }
    const blank = emptyStaffDraft(quarryId)
    form.setFieldsValue({
      ...blank,
      basicSalary: undefined,
    })
  }, [open, initial, form, quarryId])

  const handleOk = async () => {
    try {
      setSaving(true)
      const values = await form.validateFields()
      await onSave({
        name: values.name.trim(),
        designation: values.designation.trim(),
        basicSalary: Number(values.basicSalary) || 0,
        phone: values.phone?.trim() || '',
        bankName: values.bankName?.trim() || '',
        accountNumber: values.accountNumber?.trim() || '',
        ifsc: values.ifsc?.trim() || '',
        branch: values.branch?.trim() || '',
        status: values.status,
        notes: values.notes?.trim() || '',
        quarryId,
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
      title={isEdit ? 'Edit staff' : 'Add staff'}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText={isEdit ? 'Update' : 'Save'}
      zIndex={zIndex}
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
            name="name"
            label="Name"
            rules={[
              { required: true, message: 'Name is required' },
              { whitespace: true, message: 'Name is required' },
            ]}
          >
            <Input placeholder="e.g. Ragul" />
          </Form.Item>
          <Form.Item
            name="designation"
            label="Designation"
            rules={[
              { required: true, message: 'Designation is required' },
              { whitespace: true, message: 'Designation is required' },
            ]}
          >
            <Input placeholder="e.g. Incharge, Crane Op" />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Status is required' }]}>
            <Select options={STAFF_STATUSES.map((status) => ({ value: status, label: status }))} />
          </Form.Item>
          <Form.Item name="basicSalary" label="Basic salary">
            <NumberInput min={0} style={{ width: '100%' }} prefix="₹" placeholder="0" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Optional" />
          </Form.Item>
          <Form.Item name="bankName" label="Bank">
            <Input placeholder="e.g. SBI, CUB" />
          </Form.Item>
          <Form.Item name="accountNumber" label="Account number">
            <Input placeholder="Optional" />
          </Form.Item>
          <Form.Item name="ifsc" label="IFSC">
            <Input placeholder="Optional" />
          </Form.Item>
          <Form.Item name="branch" label="Branch">
            <Input placeholder="Optional" />
          </Form.Item>
          <Form.Item name="notes" label="Notes" style={{ gridColumn: '1 / -1' }}>
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  )
}
