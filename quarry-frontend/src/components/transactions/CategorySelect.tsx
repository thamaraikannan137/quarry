import { PlusOutlined } from '@ant-design/icons'
import { Button, Form, Input, Modal, Select, Space, message } from 'antd'
import { useMemo, useState } from 'react'

type CategorySelectProps = {
  value?: string
  options: string[]
  onChange?: (value: string) => void
  placeholder?: string
  allowCreate?: boolean
  size?: 'small' | 'middle' | 'large'
  status?: '' | 'error' | 'warning'
  allowClear?: boolean
  onCreate?: (name: string) => void
}

export function CategorySelect({
  value,
  options,
  onChange,
  placeholder = 'Select category',
  allowCreate = false,
  size = 'middle',
  status,
  allowClear = true,
  onCreate,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<{ name: string }>()

  const selectOptions = useMemo(
    () =>
      [...options]
        .sort((a, b) => a.localeCompare(b))
        .map((item) => ({ value: item, label: item })),
    [options],
  )

  const openAdd = () => {
    form.setFieldsValue({ name: '' })
    setOpen(true)
  }

  const submitAdd = async () => {
    const { name: raw } = await form.validateFields()
    const name = raw.trim()
    const existing = options.find((item) => item.toLowerCase() === name.toLowerCase())
    if (existing) {
      onChange?.(existing)
      message.info(`“${existing}” already exists — selected`)
      setOpen(false)
      return
    }
    onCreate?.(name)
    onChange?.(name)
    message.success(`Category “${name}” added`)
    setOpen(false)
  }

  const select = (
    <Select
      value={value || undefined}
      options={selectOptions}
      onChange={(next) => onChange?.(next ?? '')}
      style={{ width: '100%' }}
      size={size}
      status={status}
      allowClear={allowClear}
      showSearch
      placeholder={placeholder}
      optionFilterProp="label"
      filterOption={(input, option) =>
        String(option?.label ?? '')
          .toLowerCase()
          .includes(input.toLowerCase())
      }
      notFoundContent="No category found"
    />
  )

  if (!allowCreate) return select

  return (
    <>
      <Space.Compact block>
        <div style={{ flex: 1, minWidth: 0 }}>{select}</div>
        <Button type="primary" icon={<PlusOutlined />} size={size} onClick={openAdd}>
          Add
        </Button>
      </Space.Compact>

      <Modal
        title="Add category"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submitAdd}
        okText="Add"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }} onFinish={submitAdd}>
          <Form.Item
            name="name"
            label="Category name"
            rules={[{ required: true, message: 'Enter a category name' }]}
          >
            <Input autoFocus placeholder="e.g. Grease, Site expense" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
