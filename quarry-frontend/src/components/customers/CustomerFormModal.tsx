import { DatePicker, Form, Input, InputNumber, Modal, Select, Tabs } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect } from 'react'

import { TN_STATES, emptyPartyDraft, type GstType, type Party, type PartyDraft, type PartyKind } from '@/types/party'

type CustomerFormModalProps = {
  open: boolean
  quarryId: string
  initial?: Party | null
  defaultType?: PartyKind
  onClose: () => void
  onSave: (draft: PartyDraft) => void
}

type FormValues = {
  name: string
  phone: string
  gstin: string
  gstType: GstType
  state: string
  email: string
  billingAddress: string
  shippingAddress: string
  openingBalance: number
  asOf: Dayjs
  creditLimit: number
  type: PartyKind
  contact: string
  notes: string
}

export function CustomerFormModal({
  open,
  quarryId,
  initial = null,
  defaultType = 'Customer',
  onClose,
  onSave,
}: CustomerFormModalProps) {
  const [form] = Form.useForm<FormValues>()
  const isEdit = Boolean(initial)

  useEffect(() => {
    if (!open) return
    if (initial) {
      form.setFieldsValue({
        name: initial.name,
        phone: initial.phone,
        gstin: initial.gstin === '—' ? '' : initial.gstin,
        gstType: initial.gstType,
        state: initial.state,
        email: initial.email,
        billingAddress: initial.billingAddress,
        shippingAddress: initial.shippingAddress,
        openingBalance: initial.openingBalance,
        asOf: dayjs(initial.asOf),
        creditLimit: initial.creditLimit,
        type: initial.type,
        contact: initial.contact,
        notes: initial.notes,
      })
      return
    }
    const blank = emptyPartyDraft(quarryId)
    form.setFieldsValue({
      ...blank,
      type: defaultType,
      asOf: dayjs(blank.asOf),
      gstin: '',
    })
  }, [open, initial, form, quarryId, defaultType])

  const handleOk = async () => {
    const values = await form.validateFields()
    onSave({
      id: initial?.id,
      name: values.name,
      phone: values.phone || '',
      gstin: values.gstin || '—',
      gstType: values.gstType,
      state: values.state || '',
      email: values.email || '',
      billingAddress: values.billingAddress || '',
      shippingAddress: values.shippingAddress || '',
      openingBalance: values.openingBalance || 0,
      asOf: values.asOf.format('YYYY-MM-DD'),
      creditLimit: values.creditLimit || 0,
      type: values.type,
      contact: values.contact || '',
      notes: values.notes || '',
      quarryIds: initial?.quarryIds ?? [quarryId],
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit ${defaultType.toLowerCase()}` : `Add ${defaultType.toLowerCase()}`}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? 'Update' : 'Save'}
      width={720}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }} requiredMark="optional">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <Form.Item
            name="name"
            label="Party name"
            rules={[{ required: true, message: 'Name is required' }]}
            style={{ gridColumn: 'span 1' }}
          >
            <Input autoFocus placeholder="Enter party name" />
          </Form.Item>
          <Form.Item name="gstin" label="GSTIN">
            <Input placeholder="Optional" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Optional" />
          </Form.Item>
        </div>

        <Tabs
          items={[
            {
              key: 'gst',
              label: 'GST & Address',
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Form.Item name="gstType" label="GST type">
                    <Select
                      options={[
                        { value: 'Unregistered/Consumer', label: 'Unregistered/Consumer' },
                        { value: 'Registered Regular', label: 'Registered Regular' },
                        { value: 'Composition', label: 'Composition' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="state" label="State">
                    <Select
                      allowClear
                      options={TN_STATES.map((state) => ({ value: state, label: state }))}
                      placeholder="Select"
                    />
                  </Form.Item>
                  <Form.Item name="email" label="Email" style={{ gridColumn: '1 / -1' }}>
                    <Input type="email" placeholder="Optional" />
                  </Form.Item>
                  <Form.Item name="billingAddress" label="Billing address" style={{ gridColumn: '1 / -1' }}>
                    <Input.TextArea rows={3} placeholder="Billing address" />
                  </Form.Item>
                  <Form.Item name="shippingAddress" label="Shipping address" style={{ gridColumn: '1 / -1' }}>
                    <Input.TextArea rows={3} placeholder="Optional" />
                  </Form.Item>
                </div>
              ),
            },
            {
              key: 'credit',
              label: 'Credit & Balance',
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Form.Item name="openingBalance" label="Opening balance">
                    <InputNumber min={0} style={{ width: '100%' }} prefix="₹" controls={false} />
                  </Form.Item>
                  <Form.Item name="asOf" label="As of date" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
                  </Form.Item>
                  <Form.Item name="creditLimit" label="Credit limit">
                    <InputNumber min={0} style={{ width: '100%' }} prefix="₹" controls={false} />
                  </Form.Item>
                  <Form.Item name="type" label="Party type" rules={[{ required: true }]}>
                    <Select
                      options={[
                        { value: 'Customer', label: 'Customer' },
                        { value: 'Vendor', label: 'Vendor' },
                        { value: 'Both', label: 'Both' },
                      ]}
                    />
                  </Form.Item>
                </div>
              ),
            },
            {
              key: 'more',
              label: 'Additional',
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Form.Item name="contact" label="Contact person">
                    <Input placeholder="Optional" />
                  </Form.Item>
                  <Form.Item name="notes" label="Notes">
                    <Input placeholder="Optional" />
                  </Form.Item>
                </div>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  )
}
