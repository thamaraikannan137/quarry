import { DatePicker, Form, Input, Modal, Select, Typography, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'

import { errorMessage } from '@/api/http'
import { NumberInput } from '@/components/common'
import { useStaff } from '@/contexts/StaffContext'
import { emptyLedgerDraft, type Ledger, type LedgerDraft } from '@/types/ledger'

type LedgerFormModalProps = {
  open: boolean
  quarryId: string
  quarryName?: string
  /** Edit ledger details (name / notes). Amount increase posts another In. */
  initial?: Ledger | null
  /** Prefill holder for adding In to an existing ledger account. */
  addInFor?: Ledger | null
  onClose: () => void
  onSave: (draft: LedgerDraft) => void | Promise<void>
}

type FormValues = {
  date: Dayjs
  holderName: string
  personId?: string
  amount?: number
  notes?: string
  status?: 'open' | 'closed'
}

export function LedgerFormModal({
  open,
  quarryId,
  quarryName,
  initial = null,
  addInFor = null,
  onClose,
  onSave,
}: LedgerFormModalProps) {
  const { staffForQuarry } = useStaff()
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(initial) && !addInFor
  const isAddIn = Boolean(addInFor)

  const staffOptions = useMemo(
    () =>
      staffForQuarry(quarryId)
        .filter((row) => row.status === 'Active' || row.id === initial?.personId || row.id === addInFor?.personId)
        .map((row) => ({ value: row.id, label: `${row.name} · ${row.designation || 'Staff'}` })),
    [staffForQuarry, quarryId, initial?.personId, addInFor?.personId],
  )

  useEffect(() => {
    if (!open) return
    if (addInFor) {
      form.setFieldsValue({
        date: dayjs(),
        holderName: addInFor.holderName,
        personId: addInFor.personId ?? undefined,
        amount: undefined,
        notes: undefined,
      })
      return
    }
    if (initial) {
      form.setFieldsValue({
        date: dayjs(initial.date),
        holderName: initial.holderName,
        personId: initial.personId ?? undefined,
        amount: undefined,
        notes: initial.notes || undefined,
        status: initial.status === 'closed' ? 'closed' : 'open',
      })
      return
    }
    const blank = emptyLedgerDraft(quarryId, dayjs().format('YYYY-MM-DD'))
    form.setFieldsValue({
      date: dayjs(blank.date),
      holderName: blank.holderName,
      personId: undefined,
      amount: undefined,
      notes: undefined,
    })
  }, [open, initial, addInFor, form, quarryId])

  const handleOk = async () => {
    try {
      setSaving(true)
      const values = await form.validateFields()
      await onSave({
        quarryId,
        holderName: values.holderName.trim(),
        personId: values.personId ?? null,
        date: values.date.format('YYYY-MM-DD'),
        amount: Number(values.amount) || 0,
        notes: values.notes?.trim() || '',
        status: isEdit ? values.status ?? initial?.status ?? 'open' : 'open',
      })
      onClose()
    } catch (error) {
      const text = errorMessage(error)
      if (text) message.error(text)
    } finally {
      setSaving(false)
    }
  }

  const titleLabel = isAddIn ? 'Add In' : isEdit ? 'Edit ledger' : 'Add ledger'
  const okText = isAddIn ? 'Add In' : isEdit ? 'Update' : 'Save ledger'
  const titleNode = (
    <div>
      <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.3 }}>{titleLabel}</div>
      {quarryName ? (
        <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
          Site: {quarryName}
        </Typography.Text>
      ) : null}
    </div>
  )

  return (
    <Modal
      open={open}
      title={titleNode}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saving}
      okText={okText}
      destroyOnHidden
      width={640}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 8 }}
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
          <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Date is required' }]}>
            <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" allowClear={false} />
          </Form.Item>
          <Form.Item
            name="holderName"
            label="Ledger name"
            rules={[
              { required: true, message: 'Ledger name is required' },
              { whitespace: true, message: 'Ledger name is required' },
            ]}
          >
            <Input placeholder="e.g. Accounts · quarry · Supervisor" disabled={isAddIn} />
          </Form.Item>
        </div>
        <Form.Item
          name="amount"
          label={isEdit ? 'Add In amount (optional)' : 'Amount'}
          rules={isEdit ? undefined : [{ required: true, message: 'Amount is required' }]}
        >
          <NumberInput min={0} style={{ width: '100%' }} prefix="₹" placeholder="0" />
        </Form.Item>
        {!isAddIn || isEdit ? (
          <>
            <div
              style={{
                margin: '4px 0 12px',
                fontSize: 12,
                color: '#8c8c8c',
                letterSpacing: 0.4,
              }}
            >
              OPTIONAL
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {!isAddIn ? (
                <Form.Item name="personId" label="Link staff">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Optional staff member"
                    options={staffOptions}
                    onChange={(value) => {
                      if (!value) return
                      const staff = staffForQuarry(quarryId).find((row) => row.id === value)
                      if (!staff) return
                      const current = String(form.getFieldValue('holderName') ?? '').trim()
                      if (!current) form.setFieldValue('holderName', staff.name)
                    }}
                  />
                </Form.Item>
              ) : null}
              <Form.Item name="notes" label="Notes" style={{ gridColumn: isAddIn ? '1 / -1' : undefined }}>
                <Input.TextArea rows={2} placeholder="Optional note" />
              </Form.Item>
              {isEdit ? (
                <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Status is required' }]}>
                  <Select
                    options={[
                      { value: 'open', label: 'Open' },
                      { value: 'closed', label: 'Closed' },
                    ]}
                  />
                </Form.Item>
              ) : null}
            </div>
          </>
        ) : (
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional note" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}
