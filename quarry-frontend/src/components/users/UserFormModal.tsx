import { Form, Input, Modal, Select, Switch, message } from 'antd'
import { useEffect, useState } from 'react'

import { errorMessage } from '@/api/http'
import type { UserDraft } from '@/api/users'
import type { AppUser, Quarry } from '@/types/app'
import { ROLES } from '@/types/app'

type FormValues = {
  name: string
  username: string
  password: string
  role: UserDraft['role']
  quarryIds: string[]
  active: boolean
}

type UserFormModalProps = {
  open: boolean
  quarries: Quarry[]
  initial?: AppUser | null
  onClose: () => void
  onSave: (draft: UserDraft) => void | Promise<void>
}

const ROLE_HINT: Record<(typeof ROLES)[number], string> = {
  Owner: 'Full access, including Users & roles.',
  Accountant: 'Can enter and edit data for assigned quarries.',
  Viewer: 'Dashboard and reports only.',
}

export function UserFormModal({ open, quarries, initial = null, onClose, onSave }: UserFormModalProps) {
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(initial)
  const role = Form.useWatch('role', form)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      name: initial?.name ?? '',
      username: initial?.username ?? '',
      password: '',
      role: initial?.role ?? 'Accountant',
      quarryIds: initial?.quarryIds?.includes('*') || initial?.role === 'Owner' ? ['*'] : (initial?.quarryIds ?? []),
      active: initial?.active ?? true,
    })
  }, [open, initial, form])

  const handleOk = async () => {
    try {
      setSaving(true)
      const values = await form.validateFields()
      const quarryIds = values.role === 'Owner' ? ['*'] : values.quarryIds
      await onSave({
        name: values.name.trim(),
        username: values.username.trim(),
        password: values.password?.trim() || undefined,
        role: values.role,
        quarryIds,
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
      title={isEdit ? 'Edit user' : 'Add user'}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText={isEdit ? 'Update' : 'Save'}
      destroyOnHidden
      width={520}
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
          <Input placeholder="e.g. B. Arun" />
        </Form.Item>
        <Form.Item
          name="username"
          label="Username"
          rules={[
            { required: true, message: 'Username is required' },
            { whitespace: true, message: 'Username is required' },
          ]}
        >
          <Input autoComplete="off" placeholder="e.g. owner" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          extra={isEdit ? 'Leave blank to keep the current password.' : undefined}
          rules={isEdit ? [] : [{ required: true, message: 'Password is required' }, { min: 4, message: 'At least 4 characters' }]}
        >
          <Input.Password autoComplete="new-password" placeholder={isEdit ? 'Unchanged' : 'Set a password'} />
        </Form.Item>
        <Form.Item name="role" label="Role" extra={role ? ROLE_HINT[role] : undefined} rules={[{ required: true, message: 'Role is required' }]}>
          <Select
            options={ROLES.map((value) => ({ value, label: value }))}
            onChange={(next) => {
              if (next === 'Owner') form.setFieldValue('quarryIds', ['*'])
              else if (form.getFieldValue('quarryIds')?.includes('*')) form.setFieldValue('quarryIds', [])
            }}
          />
        </Form.Item>
        {role !== 'Owner' && (
          <Form.Item
            name="quarryIds"
            label="Quarries"
            extra="Choose All quarries, or specific sites this login can use."
            rules={[{ required: true, message: 'Select at least one quarry' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select quarries"
              options={[
                { value: '*', label: 'All quarries' },
                ...quarries.map((quarry) => ({ value: quarry.id, label: `${quarry.name} (${quarry.code})` })),
              ]}
              onChange={(values: string[]) => {
                if (values.includes('*')) form.setFieldValue('quarryIds', ['*'])
              }}
            />
          </Form.Item>
        )}
        <Form.Item name="active" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}
