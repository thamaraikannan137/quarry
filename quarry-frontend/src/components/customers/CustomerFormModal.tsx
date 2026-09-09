import { DatePicker, Form, Input, Modal, Select, Tabs, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'

import { errorMessage, isFormValidationError } from '@/api/http'
import { NumberInput } from '@/components/common'
import { useParties } from '@/contexts/PartiesContext'

import { TN_STATES, emptyPartyDraft, type GstType, type Party, type PartyDraft, type PartyKind } from '@/types/party'

function partyTypesOverlap(a: PartyKind, b: PartyKind) {
  return a === b
}

function partyKindLabel(kind: PartyKind) {
  if (kind === 'Vendor') return 'Vendor'
  if (kind === 'Customer') return 'Customer'
  return 'Party'
}

type TabKey = 'gst' | 'credit' | 'more'

const CREDIT_FIELDS = new Set(['openingBalance', 'asOf', 'creditLimit', 'type'])
const MORE_FIELDS = new Set(['contact', 'notes'])

function tabForField(name: unknown): TabKey {
  const key = Array.isArray(name) ? name[0] : name
  if (typeof key === 'string' && CREDIT_FIELDS.has(key)) return 'credit'
  if (typeof key === 'string' && MORE_FIELDS.has(key)) return 'more'
  return 'gst'
}

function asOfIso(value: unknown, fallback: string) {
  if (dayjs.isDayjs(value) && value.isValid()) return value.format('YYYY-MM-DD')
  if (typeof value === 'string' && dayjs(value).isValid()) return dayjs(value).format('YYYY-MM-DD')
  return fallback
}

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
  const { partiesForQuarry } = useParties()
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('gst')
  const isEdit = Boolean(initial)
  const nameRules = [
    { required: true, message: 'Name is required' },
    {
      validator: async (_: unknown, value: string) => {
        const name = value?.trim() ?? ''
        if (!name) return
        const thisType: PartyKind =
          defaultType === 'Vendor' ? 'Vendor' : form.getFieldValue('type') || defaultType
        const clash = partiesForQuarry(quarryId).find(
          (party) =>
            party.id !== initial?.id &&
            party.name.trim().toLowerCase() === name.toLowerCase() &&
            partyTypesOverlap(thisType, party.type),
        )
        if (!clash) return
        throw new Error(`${partyKindLabel(thisType)} "${clash.name}" already exists in this quarry`)
      },
    },
  ]

  useEffect(() => {
    if (!open) return
    setActiveTab('gst')
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
        name: values.name.trim(),
        phone: values.phone || '',
        gstin: isVendor ? initial?.gstin || '—' : values.gstin || '—',
        gstType: isVendor ? initial?.gstType || blank.gstType : values.gstType || blank.gstType,
        state: isVendor ? initial?.state || '' : values.state || '',
        email: isVendor ? initial?.email || '' : values.email || '',
        billingAddress: values.billingAddress || '',
        shippingAddress: isVendor ? initial?.shippingAddress || '' : values.shippingAddress || '',
        openingBalance: isVendor ? initial?.openingBalance || 0 : values.openingBalance || 0,
        asOf: isVendor ? initial?.asOf || blank.asOf : asOfIso(values.asOf, blank.asOf),
        creditLimit: isVendor ? initial?.creditLimit || 0 : values.creditLimit || 0,
        type: isVendor ? 'Vendor' : 'Customer',
        contact: isVendor ? initial?.contact || '' : values.contact || '',
        notes: isVendor ? initial?.notes || '' : values.notes || '',
        quarryIds: initial?.quarryIds ?? [quarryId],
      })
      onClose()
    } catch (error) {
      if (isFormValidationError(error) && error && typeof error === 'object' && 'errorFields' in error) {
        const fields = (error as { errorFields: { name: unknown }[] }).errorFields
        setActiveTab(tabForField(fields[0]?.name))
        return
      }
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
              rules={nameRules}
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
            rules={nameRules}
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
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          items={[
            {
              key: 'gst',
              label: 'GST & Address',
              forceRender: true,
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
              forceRender: true,
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Form.Item name="openingBalance" label="Opening balance">
                    <NumberInput min={0} style={{ width: '100%' }} prefix="₹" />
                  </Form.Item>
                  <Form.Item name="asOf" label="As of date">
                    <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
                  </Form.Item>
                  <Form.Item name="creditLimit" label="Credit limit">
                    <NumberInput min={0} style={{ width: '100%' }} prefix="₹" />
                  </Form.Item>
                </div>
              ),
            },
            {
              key: 'more',
              label: 'Additional',
              forceRender: true,
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
