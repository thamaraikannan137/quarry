import { DatePicker, Form, Input, Modal, Select, Tabs, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'

import { errorMessage } from '@/api/http'
import { NumberInput } from '@/components/common'

import { TN_STATES, emptyPartyDraft, type GstType, type Party, type PartyDraft, type PartyKind } from '@/types/party'

type CustomerFormModalProps = {
  open: boolean
  quarryId: string
  initial?: Party | null
  defaultType?: PartyKind
  zIndex?: number
  onClose: () => void
  onSave: (draft: PartyDraft) => void | Promise<void>
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
  zIndex,
  onClose,
  onSave,
}: CustomerFormModalProps) {
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
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
        asOf: initial.asOf && dayjs(initial.asOf).isValid() ? dayjs(initial.asOf) : dayjs(),
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
    try {
      setSaving(true)
      const values = await form.validateFields()
      const blank = emptyPartyDraft(quarryId)
      const isVendor = defaultType === 'Vendor'
      await onSave({
        id: initial?.id,
        name: values.name,
        phone: values.phone || '',
        gstin: isVendor ? initial?.gstin || '—' : values.gstin || '—',
        gstType: isVendor ? initial?.gstType || blank.gstType : values.gstType,
        state: isVendor ? initial?.state || '' : values.state || '',
        email: isVendor ? initial?.email || '' : values.email || '',
        billingAddress: values.billingAddress || '',
        shippingAddress: isVendor ? initial?.shippingAddress || '' : values.shippingAddress || '',
        openingBalance: isVendor ? initial?.openingBalance || 0 : values.openingBalance || 0,
        asOf: isVendor
          ? initial?.asOf || blank.asOf
          : values.asOf.format('YYYY-MM-DD'),
        creditLimit: isVendor ? initial?.creditLimit || 0 : values.creditLimit || 0,
        type: isVendor ? 'Vendor' : values.type,
        contact: isVendor ? initial?.contact || '' : values.contact || '',
        notes: isVendor ? initial?.notes || '' : values.notes || '',
        quarryIds: initial?.quarryIds ?? [quarryId],
      })
      onClose()
    } catch (error) {
      const text = errorMessage(error)
      if (text) message.error(text)
    } finally {
      setSaving(false)
    }
  }

  const isVendor = defaultType === 'Vendor'

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit ${defaultType.toLowerCase()}` : `Add ${defaultType.toLowerCase()}`}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText={isEdit ? 'Update' : 'Save'}
      width={isVendor ? 480 : 720}
      zIndex={zIndex}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }} requiredMark="optional">
        {isVendor ? (
          <>
            <Form.Item
              name="name"
              label="Vendor name"
              rules={[{ required: true, message: 'Name is required' }]}
            >
              <Input autoFocus placeholder="Enter vendor name" />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="Phone number" />
            </Form.Item>
            <Form.Item name="billingAddress" label="Address">
              <Input.TextArea rows={3} placeholder="Address" />
            </Form.Item>
          </>
        ) : (
          <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <Form.Item
            name="name"
            label={defaultType === 'Customer' ? 'Customer name' : 'Party name'}
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
                    <NumberInput min={0} style={{ width: '100%' }} prefix="₹" />
                  </Form.Item>
                  <Form.Item name="asOf" label="As of date" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
                  </Form.Item>
                  <Form.Item name="creditLimit" label="Credit limit">
                    <NumberInput min={0} style={{ width: '100%' }} prefix="₹" />
                  </Form.Item>
                  <Form.Item name="type" label="Party type" rules={[{ required: true }]}>
                    <Select
                      options={
                        defaultType === 'Customer'
                          ? [
                              { value: 'Customer', label: 'Customer' },
                              { value: 'Both', label: 'Customer & vendor' },
                            ]
                          : [
                              { value: 'Customer', label: 'Customer' },
                              { value: 'Vendor', label: 'Vendor' },
                              { value: 'Both', label: 'Customer & vendor' },
                            ]
                      }
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
          </>
        )}
      </Form>
    </Modal>
  )
}
