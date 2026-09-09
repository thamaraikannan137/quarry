import { Form, Input, Modal, message } from 'antd'
import { useEffect, useState } from 'react'

import { errorMessage } from '@/api/http'
import type { Quarry } from '@/types/app'

type QuarryFormValues = {
  name: string
  code: string
  place: string
}

export type QuarryDraft = {
  name: string
  code: string
  place?: string | null
}

type QuarryFormModalProps = {
  open: boolean
  initial?: Quarry | null
  onClose: () => void
  onSave: (draft: QuarryDraft) => void | Promise<void>
}

export function QuarryFormModal({ open, initial = null, onClose, onSave }: QuarryFormModalProps) {
  const [form] = Form.useForm<QuarryFormValues>()
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(initial)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      name: initial?.name ?? '',
      code: initial?.code ?? '',
      place: initial?.place ?? '',
    })
  }, [open, initial, form])

  const handleOk = async () => {
    try {
      setSaving(true)
      const values = await form.validateFields()
      await onSave({
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        place: values.place?.trim() || null,
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
      title={isEdit ? 'Edit quarry' : 'Add quarry'}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText={isEdit ? 'Update' : 'Save'}
      destroyOnHidden
      width={480}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="name"
          label="Name"
          rules={[
            { required: true, message: 'Name is required' },
            { whitespace: true, message: 'Name is required' },
          ]}
        >
          <Input placeholder="e.g. Chithanavasal" />
        </Form.Item>
        <Form.Item
          name="code"
          label="Code"
          extra="Short unique code, used in the header switcher."
          rules={[
            { required: true, message: 'Code is required' },
            { whitespace: true, message: 'Code is required' },
            {
              pattern: /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
              message: 'Use letters, numbers, hyphen or underscore',
            },
          ]}
        >
          <Input placeholder="e.g. CHITHA" style={{ textTransform: 'uppercase' }} />
        </Form.Item>
        <Form.Item name="place" label="Place">
          <Input placeholder="e.g. Illuppur / Pudukkottai" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
