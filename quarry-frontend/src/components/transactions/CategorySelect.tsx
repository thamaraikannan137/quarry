import { PlusOutlined } from '@ant-design/icons'
import { Button, Divider, Form, Input, Modal, Select, message } from 'antd'
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
  disabled?: boolean
  onCreate?: (name: string) => void
  createTitle?: string
  createFieldLabel?: string
  createPlaceholder?: string
  createButtonLabel?: string
  notFoundContent?: string
  createdNoun?: string
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
  disabled = false,
  onCreate,
  createTitle = 'Add category',
  createFieldLabel = 'Category name',
  createPlaceholder = 'e.g. Grease, Site expense',
  createButtonLabel = 'Add category',
  notFoundContent = 'No category found',
  createdNoun = 'Category',
}: CategorySelectProps) {
  const [selectOpen, setSelectOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<{ name: string }>()

  const selectOptions = useMemo(
    () =>
      [...options]
        .sort((a, b) => a.localeCompare(b))
        .map((item) => ({ value: item, label: item })),
    [options],
  )

  const openAdd = () => {
    setSelectOpen(false)
    form.setFieldsValue({ name: '' })
    setModalOpen(true)
  }

  const submitAdd = async () => {
    const { name: raw } = await form.validateFields()
    const name = raw.trim()
    const existing = options.find((item) => item.toLowerCase() === name.toLowerCase())
    if (existing) {
      onChange?.(existing)
      message.info(`“${existing}” already exists — selected`)
      setModalOpen(false)
      return
    }
    onCreate?.(name)
    onChange?.(name)
    message.success(`${createdNoun} “${name}” added`)
    setModalOpen(false)
  }

  return (
    <>
      <Select
        value={value || undefined}
        options={selectOptions}
        onChange={(next) => onChange?.(next ?? '')}
        style={{ width: '100%' }}
        size={size}
        status={status}
        allowClear={allowClear}
        disabled={disabled}
        showSearch
        open={selectOpen}
        onOpenChange={setSelectOpen}
        placeholder={placeholder}
        optionFilterProp="label"
        filterOption={(input, option) =>
          String(option?.label ?? '')
            .toLowerCase()
            .includes(input.toLowerCase())
        }
        notFoundContent={notFoundContent}
        dropdownRender={
          allowCreate
            ? (menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    style={{ width: '100%', textAlign: 'left' }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={openAdd}
                  >
                    {createButtonLabel}
                  </Button>
                </>
              )
            : undefined
        }
      />

      <Modal
        title={createTitle}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submitAdd}
        okText="Add"
        destroyOnHidden
        zIndex={1200}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }} onFinish={submitAdd}>
          <Form.Item
            name="name"
            label={createFieldLabel}
            rules={[{ required: true, message: `Enter a ${createFieldLabel.toLowerCase()}` }]}
          >
            <Input autoFocus placeholder={createPlaceholder} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
