import { DatePicker, Form, Input, InputNumber, Modal, Select, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo } from 'react'

import { CategorySelect } from '@/components/transactions/CategorySelect'
import { useParties } from '@/contexts/PartiesContext'
import { fieldsForCategory } from '@/data/categoryFields'
import { gangsForQuarry, peopleForQuarry } from '@/data/demoLinks'
import type { Transaction, TxnType, VoucherDraft } from '@/types/transaction'

type VoucherDialogProps = {
  open: boolean
  type: TxnType
  quarryId: string
  quarryName: string
  heads: string[]
  initial?: Transaction | null
  onClose: () => void
  onSave: (draft: VoucherDraft) => void
  onCreateHead?: (name: string) => void
}

type FormValues = {
  date: Dayjs
  amount: number
  head: string
  particulars: string
  partyId?: string
  advanceLink?: string
  litres?: number
  refNote?: string
}

function toAdvanceLink(personId?: string | null, labourId?: string | null) {
  if (personId) return `p:${personId}`
  if (labourId) return `g:${labourId}`
  return undefined
}

function parseAdvanceLink(value?: string) {
  if (!value) return { personId: null, labourId: null }
  if (value.startsWith('p:')) return { personId: value.slice(2), labourId: null }
  if (value.startsWith('g:')) return { personId: null, labourId: value.slice(2) }
  return { personId: null, labourId: null }
}

export function VoucherDialog({
  open,
  type,
  quarryId,
  quarryName,
  heads,
  initial = null,
  onClose,
  onSave,
  onCreateHead,
}: VoucherDialogProps) {
  const { partiesForQuarry, customersForQuarry, vendorsForQuarry } = useParties()
  const isCredit = type === 'Credit'
  const isEdit = Boolean(initial)
  const [form] = Form.useForm<FormValues>()
  const headValue = Form.useWatch('head', form) ?? initial?.head ?? ''
  const extraFields = useMemo(() => fieldsForCategory(headValue, type), [headValue, type])

  const partyOptions = useMemo(() => {
    const head = headValue.toLowerCase()
    const list =
      isCredit || head === 'cash received'
        ? customersForQuarry(quarryId)
        : head.includes('vendor')
          ? vendorsForQuarry(quarryId)
          : partiesForQuarry(quarryId)
    return list.map((party) => ({
      value: party.id,
      label: `${party.name} · ${party.type}`,
    }))
  }, [customersForQuarry, vendorsForQuarry, partiesForQuarry, quarryId, headValue, isCredit])

  const advanceOptions = useMemo(() => {
    const people = peopleForQuarry(quarryId).map((person) => ({
      value: `p:${person.id}`,
      label: `${person.name} · ${person.kind}`,
    }))
    const gangs = gangsForQuarry(quarryId).map((gang) => ({
      value: `g:${gang.id}`,
      label: `${gang.name} · FY ${gang.fy}`,
    }))
    return [
      ...(people.length ? [{ label: 'Staff / Worker', options: people }] : []),
      ...(gangs.length ? [{ label: 'Labour gangs', options: gangs }] : []),
    ]
  }, [quarryId])

  useEffect(() => {
    if (!open) return
    if (initial) {
      form.setFieldsValue({
        date: dayjs(initial.date),
        amount: initial.type === 'Credit' ? initial.credit : initial.debit,
        head: initial.head,
        particulars: initial.particulars,
        partyId: initial.partyId ?? undefined,
        advanceLink: toAdvanceLink(initial.personId, initial.labourId),
        litres: initial.litres ?? undefined,
        refNote: initial.refNote ?? undefined,
      })
      return
    }
    form.setFieldsValue({
      date: dayjs(),
      amount: undefined,
      head: isCredit ? 'Cash Received' : 'Diesel',
      particulars: '',
      partyId: undefined,
      advanceLink: undefined,
      litres: undefined,
      refNote: undefined,
    })
  }, [open, isCredit, form, initial])

  // Clear extras that no longer apply when category changes
  useEffect(() => {
    if (!open) return
    const keys = new Set(extraFields.map((field) => field.key))
    if (!keys.has('party')) form.setFieldValue('partyId', undefined)
    if (!keys.has('advanceLink')) form.setFieldValue('advanceLink', undefined)
    if (!keys.has('litres')) form.setFieldValue('litres', undefined)
    if (!keys.has('refNote')) form.setFieldValue('refNote', undefined)
  }, [extraFields, form, open])

  const handleOk = async () => {
    const values = await form.validateFields()
    const link = parseAdvanceLink(values.advanceLink)
    onSave({
      date: values.date.format('YYYY-MM-DD'),
      amount: values.amount,
      head: values.head.trim(),
      particulars: values.particulars?.trim() || (isCredit ? 'Cash received' : ''),
      partyId: values.partyId ?? null,
      personId: link.personId,
      labourId: link.labourId,
      litres: values.litres ?? null,
      refNote: values.refNote?.trim() || null,
    })
    onClose()
  }

  const showParty = extraFields.some((field) => field.key === 'party')
  const partyField = extraFields.find((field) => field.key === 'party')
  const showAdvance = extraFields.some((field) => field.key === 'advanceLink')
  const advanceField = extraFields.find((field) => field.key === 'advanceLink')
  const showLitres = extraFields.some((field) => field.key === 'litres')
  const litresField = extraFields.find((field) => field.key === 'litres')
  const showRef = extraFields.some((field) => field.key === 'refNote')
  const refField = extraFields.find((field) => field.key === 'refNote')

  return (
    <Modal
      open={open}
      title={`${isEdit ? 'Edit' : 'Add'} ${isCredit ? 'credit' : 'debit'} — ${quarryName}`}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? 'Update' : 'Save'}
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} requiredMark="optional">
        <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Date is required' }]}>
          <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" allowClear={false} />
        </Form.Item>
        <Form.Item
          name="amount"
          label="Amount"
          rules={[
            { required: true, message: 'Amount is required' },
            { type: 'number', min: 1, message: 'Enter an amount of at least ₹1' },
          ]}
        >
          <InputNumber min={1} style={{ width: '100%' }} placeholder="0" prefix="₹" controls={false} />
        </Form.Item>
        <Form.Item name="head" label="Category" rules={[{ required: true, message: 'Category is required' }]}>
          <CategorySelect
            options={heads}
            allowCreate
            placeholder="Select or add a category"
            onCreate={onCreateHead}
          />
        </Form.Item>

        {showParty && (
          <Form.Item
            name="partyId"
            label={partyField?.label ?? 'Party'}
            extra={partyField?.hint}
            rules={
              partyField?.required ? [{ required: true, message: 'Select a party' }] : undefined
            }
          >
            <Select
              allowClear={!partyField?.required}
              showSearch
              placeholder="Select party"
              options={partyOptions}
              optionFilterProp="label"
            />
          </Form.Item>
        )}

        {showAdvance && (
          <Form.Item
            name="advanceLink"
            label={advanceField?.label ?? 'Link'}
            extra={advanceField?.hint}
            rules={
              advanceField?.required
                ? [{ required: true, message: 'Select staff, worker, or labour gang' }]
                : undefined
            }
          >
            <Select
              allowClear={!advanceField?.required}
              showSearch
              placeholder="Select person or gang"
              options={advanceOptions}
              optionFilterProp="label"
            />
          </Form.Item>
        )}

        {showLitres && (
          <Form.Item name="litres" label={litresField?.label ?? 'Litres'} extra={litresField?.hint}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 500" controls={false} />
          </Form.Item>
        )}

        {showRef && (
          <Form.Item name="refNote" label={refField?.label ?? 'Reference'} extra={refField?.hint}>
            <Input placeholder={refField?.hint || 'Optional reference'} />
          </Form.Item>
        )}

        {extraFields.length > 0 && (
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: -4 }}>
            Extra fields for <strong>{headValue || 'this category'}</strong>
          </Typography.Paragraph>
        )}

        <Form.Item
          name="particulars"
          label="Comment"
          rules={isCredit ? [] : [{ required: true, message: 'Comment is required' }]}
        >
          <Input placeholder={isCredit ? 'e.g. Received from party' : 'e.g. Diesel purchase'} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
