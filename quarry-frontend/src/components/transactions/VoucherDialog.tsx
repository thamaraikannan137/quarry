import { PlusOutlined } from '@ant-design/icons'
import { Button, DatePicker, Divider, Form, Input, Modal, Select, Typography, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'

import { errorMessage } from '@/api/http'
import { NumberInput } from '@/components/common'
import { CustomerFormModal } from '@/components/customers/CustomerFormModal'
import { PaymentMethodSelect } from '@/components/marking/PaymentMethodSelect'
import { StaffFormModal } from '@/components/staff/StaffFormModal'
import { CategorySelect } from '@/components/transactions/CategorySelect'
import { useLedgers } from '@/contexts/LedgersContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useParties } from '@/contexts/PartiesContext'
import { useStaff } from '@/contexts/StaffContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import { fieldsForCategory } from '@/data/categoryFields'
import { isFinanceHead, isMachineryRentHead } from '@/data/expenseHeads'
import { gangsForQuarry } from '@/data/demoLinks'
import type { Transaction, TxnType, VoucherDraft } from '@/types/transaction'
import { batchBalance } from '@/utils/markingPayment'
import { formatMarkingNo } from '@/utils/marking'
import { money } from '@/utils/money'

type VoucherDialogProps = {
  open: boolean
  type: TxnType
  quarryId: string
  quarryName: string
  heads: string[]
  initial?: Transaction | null
  defaultHead?: string
  lockHead?: boolean
  /** Pre-select this staff member on Salary / Advance vouchers. */
  defaultPersonId?: string
  lockPerson?: boolean
  defaultAmount?: number
  defaultParticulars?: string
  /** Pre-select / lock ledger entry this expense is paid from. */
  defaultLedgerId?: string
  lockLedger?: boolean
  onClose: () => void
  onSave: (draft: VoucherDraft) => void | Promise<void>
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
  paymentMethod?: string
  markingBatchId?: string
  ledgerId?: string
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

function isSalaryAdvanceHead(head?: string) {
  return head?.trim().toLowerCase() === 'salary advance'
}

function isSalaryPayoutHead(head?: string) {
  return head?.trim().toLowerCase() === 'salary'
}

function salaryAdvanceParticulars(name: string) {
  return `Salary advance — ${name}`
}

function salaryPayoutParticulars(name: string) {
  return `Salary — ${name}`
}

function isGeneratedSalaryAdvance(text?: string) {
  const value = text?.trim() ?? ''
  return !value || /^salary advance\s*[—–-]\s*/i.test(value)
}

function isGeneratedSalaryPayout(text?: string) {
  const value = text?.trim() ?? ''
  if (/^salary advance\s*[—–-]\s*/i.test(value)) return false
  return !value || /^salary\s*[—–-]\s*/i.test(value)
}

export function VoucherDialog({
  open,
  type,
  quarryId,
  quarryName,
  heads,
  initial = null,
  defaultHead,
  lockHead = false,
  defaultPersonId,
  lockPerson = false,
  defaultAmount,
  defaultParticulars,
  defaultLedgerId,
  lockLedger = false,
  onClose,
  onSave,
  onCreateHead,
}: VoucherDialogProps) {
  const { partiesForQuarry, customersForQuarry, vendorsForQuarry, addParty } = useParties()
  const { machineryNames, addMachineryName, transactions } = useTransactions()
  const { batchesForQuarry, getBatch } = useMarkings()
  const { staffForQuarry, addStaff } = useStaff()
  const { ledgersForQuarry, getLedger } = useLedgers()
  const isCredit = type === 'Credit'
  const isEdit = Boolean(initial)
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const [vendorFormOpen, setVendorFormOpen] = useState(false)
  const [partySelectOpen, setPartySelectOpen] = useState(false)
  const [staffFormOpen, setStaffFormOpen] = useState(false)
  const [staffSelectOpen, setStaffSelectOpen] = useState(false)
  const headValue =
    Form.useWatch('head', form) ??
    initial?.head ??
    (isCredit ? 'Cash Received' : defaultHead ?? 'Diesel')
  const extraFields = useMemo(() => fieldsForCategory(headValue, type), [headValue, type])
  const partyIdValue = Form.useWatch('partyId', form)
  const markingBatchIdValue = Form.useWatch('markingBatchId', form)
  const advanceLinkValue = Form.useWatch('advanceLink', form)
  const isSalaryAdvance = isSalaryAdvanceHead(headValue)
  const isSalaryPayout = isSalaryPayoutHead(headValue)

  const partySource = extraFields.find((field) => field.key === 'party')?.partySource
  const partyOptions = useMemo(() => {
    const source =
      partySource ??
      (isCredit || headValue.toLowerCase() === 'cash received' ? 'customer' : 'all')
    const list =
      source === 'customer'
        ? customersForQuarry(quarryId)
        : source === 'vendor'
          ? vendorsForQuarry(quarryId)
          : partiesForQuarry(quarryId)
    return list.map((party) => ({
      value: party.id,
      label: source === 'all' ? `${party.name} · ${party.type}` : party.name,
    }))
  }, [customersForQuarry, vendorsForQuarry, partiesForQuarry, quarryId, partySource, isCredit, headValue])

  const advanceOptions = useMemo(() => {
    const people = staffForQuarry(quarryId)
      .filter((person) => person.status === 'Active' || person.id === initial?.personId || person.id === defaultPersonId)
      .map((person) => ({
        value: `p:${person.id}`,
        label: `${person.name} · ${person.designation || 'Staff'}`,
      }))
    const gangs =
      lockPerson || isSalaryAdvanceHead(headValue)
        ? []
        : gangsForQuarry(quarryId).map((gang) => ({
            value: `g:${gang.id}`,
            label: `${gang.name} · FY ${gang.fy}`,
          }))
    return [
      ...(people.length ? [{ label: 'Staff', options: people }] : []),
      ...(gangs.length ? [{ label: 'Labour gangs', options: gangs }] : []),
    ]
  }, [staffForQuarry, quarryId, initial?.personId, defaultPersonId, lockPerson, headValue])

  const unpaidMarkings = useMemo(() => {
    if (!partyIdValue) return []
    return batchesForQuarry(quarryId)
      .filter((batch) => batch.partyId === partyIdValue)
      .filter((batch) => {
        if (initial?.markingBatchId === batch.batchId) return true
        return batchBalance(batch, transactions) > 0.5
      })
  }, [batchesForQuarry, quarryId, partyIdValue, transactions, initial?.markingBatchId])

  const ledgerOptions = useMemo(() => {
    if (isCredit) return []
    const open = ledgersForQuarry(quarryId, 'open')
    const locked = defaultLedgerId || initial?.ledgerId
    const lockedRow = locked ? getLedger(locked) : undefined
    const rows =
      lockedRow && !open.some((row) => row.id === lockedRow.id) ? [...open, lockedRow] : open
    return rows.map((row) => ({
      value: row.id,
      label: row.holderName,
    }))
  }, [isCredit, ledgersForQuarry, quarryId, defaultLedgerId, initial?.ledgerId, getLedger])

  const selectedMarking =
    unpaidMarkings.find((batch) => batch.batchId === markingBatchIdValue) ??
    (markingBatchIdValue ? getBatch(markingBatchIdValue) : undefined)

  const markingAvailable = selectedMarking
    ? batchBalance(selectedMarking, transactions) +
      (initial?.markingBatchId === selectedMarking.batchId ? Number(initial.credit) || 0 : 0)
    : 0

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
        paymentMethod: initial.paymentMethod ?? undefined,
        markingBatchId: initial.markingBatchId ?? undefined,
        ledgerId: initial.ledgerId ?? defaultLedgerId ?? undefined,
      })
      return
    }
    const openingHead = isCredit ? 'Cash Received' : defaultHead ?? 'Diesel'
    const staffName = defaultPersonId
      ? staffForQuarry(quarryId).find((row) => row.id === defaultPersonId)?.name
      : undefined
    const autoParticulars = staffName
      ? isSalaryAdvanceHead(openingHead)
        ? salaryAdvanceParticulars(staffName)
        : isSalaryPayoutHead(openingHead)
          ? salaryPayoutParticulars(staffName)
          : ''
      : ''
    form.setFieldsValue({
      date: dayjs(),
      amount: defaultAmount,
      head: openingHead,
      particulars: defaultParticulars ?? autoParticulars,
      partyId: undefined,
      advanceLink: defaultPersonId ? toAdvanceLink(defaultPersonId) : undefined,
      litres: undefined,
      refNote: undefined,
      paymentMethod: isCredit ? 'Cash' : undefined,
      markingBatchId: undefined,
      ledgerId: defaultLedgerId,
    })
  }, [open, isCredit, form, initial, defaultHead, defaultPersonId, defaultAmount, defaultParticulars, defaultLedgerId, quarryId, staffForQuarry])

  useEffect(() => {
    if (open) return
    setVendorFormOpen(false)
    setPartySelectOpen(false)
  }, [open])

  // Clear extras that no longer apply when category changes
  useEffect(() => {
    if (!open) return
    const keys = new Set(extraFields.map((field) => field.key))
    if (!keys.has('party')) form.setFieldValue('partyId', undefined)
    if (!keys.has('advanceLink')) form.setFieldValue('advanceLink', undefined)
    else if (defaultPersonId && !form.getFieldValue('advanceLink')) {
      form.setFieldValue('advanceLink', toAdvanceLink(defaultPersonId))
    }
    if (!keys.has('litres')) form.setFieldValue('litres', undefined)
    if (!keys.has('refNote')) form.setFieldValue('refNote', undefined)
    if (!keys.has('paymentMethod')) form.setFieldValue('paymentMethod', undefined)
    else if (!form.getFieldValue('paymentMethod')) form.setFieldValue('paymentMethod', 'Cash')
    if (!keys.has('markingBatch')) form.setFieldValue('markingBatchId', undefined)
  }, [extraFields, form, open, defaultPersonId])

  useEffect(() => {
    if (!open) return
    const staffId = parseAdvanceLink(advanceLinkValue).personId ?? defaultPersonId
    if (!staffId) return
    const staff = staffForQuarry(quarryId).find((row) => row.id === staffId)
    if (!staff) return
    const current = String(form.getFieldValue('particulars') ?? '')
    if (isSalaryAdvance) {
      if (!isGeneratedSalaryAdvance(current)) return
      const next = salaryAdvanceParticulars(staff.name)
      if (current.trim() === next) return
      form.setFieldValue('particulars', next)
      return
    }
    if (isSalaryPayout) {
      if (defaultParticulars && current.trim() === defaultParticulars.trim()) return
      if (!isGeneratedSalaryPayout(current)) return
      const next = defaultParticulars || salaryPayoutParticulars(staff.name)
      if (current.trim() === next) return
      form.setFieldValue('particulars', next)
    }
  }, [
    open,
    isSalaryAdvance,
    isSalaryPayout,
    advanceLinkValue,
    defaultPersonId,
    defaultParticulars,
    quarryId,
    staffForQuarry,
    form,
  ])

  const handleOk = async () => {
    try {
      setSaving(true)
      const values = await form.validateFields()
      if (values.markingBatchId && selectedMarking && values.amount > markingAvailable + 1) {
        message.warning(`Amount is more than balance ${money(markingAvailable)}`)
        return
      }
      const link = parseAdvanceLink(values.advanceLink)
      const staffName = link.personId
        ? staffForQuarry(quarryId).find((row) => row.id === link.personId)?.name
        : undefined
      const particulars =
        values.particulars?.trim() ||
        (isSalaryAdvanceHead(values.head) && staffName
          ? salaryAdvanceParticulars(staffName)
          : isSalaryPayoutHead(values.head) && staffName
            ? salaryPayoutParticulars(staffName)
            : '')
      await onSave({
        date: values.date.format('YYYY-MM-DD'),
        amount: values.amount,
        head: values.head.trim(),
        particulars,
        partyId: values.partyId ?? null,
        personId: link.personId,
        labourId: link.labourId,
        litres: values.litres ?? null,
        refNote: values.refNote?.trim() || null,
        paymentMethod: values.paymentMethod?.trim() || null,
        markingBatchId: values.markingBatchId ?? null,
        ledgerId: values.ledgerId ?? defaultLedgerId ?? null,
      })
      onClose()
    } catch (error) {
      const text = errorMessage(error)
      if (text) message.error(text)
    } finally {
      setSaving(false)
    }
  }

  const showParty = extraFields.some((field) => field.key === 'party')
  const partyField = extraFields.find((field) => field.key === 'party')
  const showAdvance = extraFields.some((field) => field.key === 'advanceLink')
  const advanceField = extraFields.find((field) => field.key === 'advanceLink')
  const showLitres = extraFields.some((field) => field.key === 'litres')
  const litresField = extraFields.find((field) => field.key === 'litres')
  const showRef = extraFields.some((field) => field.key === 'refNote')
  const refField = extraFields.find((field) => field.key === 'refNote')
  const showPaymentMethod = extraFields.some((field) => field.key === 'paymentMethod')
  const paymentMethodField = extraFields.find((field) => field.key === 'paymentMethod')
  const showMarking = extraFields.some((field) => field.key === 'markingBatch')
  const markingField = extraFields.find((field) => field.key === 'markingBatch')
  const showLedger = !isCredit
  const hasOptionalFields =
    showParty || showLitres || showRef || showPaymentMethod || showMarking || showAdvance || showLedger
  const typeLabel = isCredit ? 'credit' : 'debit'
  const titleAction = isEdit ? 'Edit' : 'Add'
  const okText = isEdit ? 'Update' : `Save ${typeLabel}`

  return (
    <>
    <Modal
      open={open}
      title={
        <div>
          <div style={{ fontWeight: 600 }}>
            {titleAction} {typeLabel}
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
            Site: {quarryName}
          </Typography.Text>
        </div>
      }
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0 16px',
          }}
        >
          <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Date is required' }]}>
            <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" allowClear={false} />
          </Form.Item>
          <Form.Item name="head" label="Category" rules={[{ required: true, message: 'Category is required' }]}>
            <CategorySelect
              options={heads}
              allowCreate={!lockHead}
              allowClear={!lockHead}
              disabled={lockHead}
              placeholder="Select or add a category"
              onCreate={onCreateHead}
            />
          </Form.Item>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0 16px',
          }}
        >
          <Form.Item
            name="amount"
            label="Amount"
            rules={[
              { required: true, message: 'Amount is required' },
              { type: 'number', min: 1, message: 'Enter an amount of at least ₹1' },
            ]}
          >
            <NumberInput min={1} size="large" style={{ width: '100%' }} placeholder="0" prefix="₹" />
          </Form.Item>
        </div>

        <Form.Item
          name="particulars"
          label="Description"
          extra={isSalaryAdvance || isSalaryPayout ? 'Filled from the staff name' : undefined}
          rules={
            isSalaryAdvance || isSalaryPayout
              ? undefined
              : [
                  { required: true, message: 'Description is required' },
                  { whitespace: true, message: 'Description is required' },
                ]
          }
        >
          <Input.TextArea
            rows={3}
            placeholder={
              isSalaryAdvance
                ? 'Salary advance — staff name'
                : isSalaryPayout
                  ? 'Salary — staff name'
                  : isCredit
                    ? 'e.g. Received from party'
                    : 'e.g. Diesel purchase, 200 L'
            }
          />
        </Form.Item>

        {hasOptionalFields && (
          <>
            <div
              style={{
                margin: '4px 0 12px',
                fontSize: 12,
                color: '#8c8c8c',
                letterSpacing: 0.4,
                textAlign: 'left',
              }}
            >
              OPTIONAL
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0 16px',
              }}
            >
              {showParty && (
                <Form.Item
                  name="partyId"
                  label={partyField?.label ?? 'Party'}
                  extra={partyField?.hint}
                  rules={partyField?.required ? [{ required: true, message: 'Select a party' }] : undefined}
                >
                  <Select
                    allowClear={!partyField?.required}
                    showSearch
                    open={partySelectOpen}
                    onOpenChange={setPartySelectOpen}
                    notFoundContent={partySource === 'vendor' ? 'No vendors yet' : undefined}
                    placeholder={partySource === 'vendor' ? 'Select vendor' : 'Select party'}
                    options={partyOptions}
                    optionFilterProp="label"
                    onChange={() => form.setFieldValue('markingBatchId', undefined)}
                    dropdownRender={
                      partySource === 'vendor'
                        ? (menu) => (
                            <>
                              {menu}
                              <Divider style={{ margin: '8px 0' }} />
                              <Button
                                type="text"
                                icon={<PlusOutlined />}
                                style={{ width: '100%', textAlign: 'left' }}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setPartySelectOpen(false)
                                  setVendorFormOpen(true)
                                }}
                              >
                                Add vendor
                              </Button>
                            </>
                          )
                        : undefined
                    }
                  />
                </Form.Item>
              )}
              {showLedger && (
                <Form.Item
                  name="ledgerId"
                  label="Paid from ledger"
                  extra={
                    ledgerOptions.length === 0 && !lockLedger
                      ? 'No open entries — give cash under Accounts → Ledger first'
                      : 'Cash held by accounts / supervisor'
                  }
                  rules={lockLedger ? [{ required: true, message: 'Ledger entry is required' }] : undefined}
                >
                  <Select
                    allowClear={!lockLedger}
                    showSearch
                    optionFilterProp="label"
                    disabled={lockLedger || (ledgerOptions.length === 0 && !defaultLedgerId)}
                    placeholder={
                      ledgerOptions.length === 0 ? 'No open ledger entries' : 'Select ledger entry'
                    }
                    options={ledgerOptions}
                    notFoundContent="No open ledger entries"
                  />
                </Form.Item>
              )}
              {showLitres && (
                <Form.Item
                  name="litres"
                  label={litresField?.label ?? 'Litres'}
                  extra={litresField?.hint}
                  rules={
                    litresField?.required
                      ? [
                          { required: true, message: 'Litres is required' },
                          { type: 'number', min: 1, message: 'Enter at least 1 litre' },
                        ]
                      : undefined
                  }
                >
                  <NumberInput min={1} style={{ width: '100%' }} placeholder="e.g. 500" />
                </Form.Item>
              )}
              {showRef && (
                <Form.Item
                  name="refNote"
                  label={refField?.label ?? 'Reference'}
                  extra={refField?.hint}
                  rules={
                    refField?.required
                      ? [
                          { required: true, message: `${refField.label ?? 'Name'} is required` },
                          { whitespace: true, message: `${refField.label ?? 'Name'} is required` },
                        ]
                      : undefined
                  }
                >
                  {isMachineryRentHead(headValue) || isFinanceHead(headValue) ? (
                    <CategorySelect
                      options={machineryNames}
                      allowCreate
                      allowClear={!refField?.required}
                      placeholder="Select machine"
                      createTitle="Add machine"
                      createFieldLabel="Machine name"
                      createPlaceholder="e.g. HM Crane, Hitachi 370"
                      createButtonLabel="Add machine"
                      notFoundContent="No machines yet"
                      createdNoun="Machine"
                      onCreate={addMachineryName}
                    />
                  ) : (
                    <Input placeholder={refField?.hint || 'Optional reference'} />
                  )}
                </Form.Item>
              )}
              {showPaymentMethod && (
                <Form.Item
                  name="paymentMethod"
                  label={paymentMethodField?.label ?? 'Payment type'}
                  extra={paymentMethodField?.hint}
                  rules={
                    paymentMethodField?.required
                      ? [{ required: true, message: 'Select payment type' }]
                      : undefined
                  }
                >
                  <PaymentMethodSelect />
                </Form.Item>
              )}
              {showMarking && (
                <Form.Item
                  name="markingBatchId"
                  label={markingField?.label ?? 'Apply to marking'}
                  extra={
                    selectedMarking
                      ? `Invoice ${money(selectedMarking.total)} · pending ${money(markingAvailable)}`
                      : !partyIdValue
                        ? 'Select a customer first'
                        : unpaidMarkings.length === 0
                          ? 'No unpaid markings for this customer'
                          : markingField?.hint
                  }
                  rules={
                    markingField?.required
                      ? [{ required: true, message: 'Select a marking to apply this payment' }]
                      : undefined
                  }
                >
                  <Select
                    allowClear
                    showSearch
                    disabled={!partyIdValue}
                    placeholder={partyIdValue ? 'Optional — unpaid invoice' : 'Select a customer first'}
                    optionFilterProp="label"
                    notFoundContent="No unpaid markings"
                    options={unpaidMarkings.map((batch) => ({
                      value: batch.batchId,
                      label: `${formatMarkingNo(batch)} · ${dayjs(batch.date).format('DD MMM YYYY')} · pending ${money(
                        batch.batchId === initial?.markingBatchId
                          ? batchBalance(batch, transactions) + (Number(initial.credit) || 0)
                          : batchBalance(batch, transactions),
                      )}`,
                    }))}
                    onChange={(batchId) => {
                      if (!batchId) return
                      const batch = unpaidMarkings.find((row) => row.batchId === batchId)
                      if (!batch) return
                      const remaining =
                        batch.batchId === initial?.markingBatchId
                          ? batchBalance(batch, transactions) + (Number(initial.credit) || 0)
                          : batchBalance(batch, transactions)
                      const rounded = Math.max(0, Math.round(remaining))
                      if (rounded > 0) form.setFieldValue('amount', rounded)
                    }}
                  />
                </Form.Item>
              )}
              {showAdvance && (
                <Form.Item
                  name="advanceLink"
                  label={advanceField?.label ?? 'Link'}
                  extra={
                    lockPerson
                      ? 'This advance is linked to this staff member'
                      : advanceField?.hint
                  }
                  rules={
                    advanceField?.required
                      ? [{ required: true, message: isSalaryAdvance ? 'Select staff' : 'Select staff or labour gang' }]
                      : undefined
                  }
                >
                  <Select
                    allowClear={!advanceField?.required && !lockPerson}
                    showSearch
                    disabled={lockPerson}
                    open={lockPerson ? false : staffSelectOpen}
                    onOpenChange={lockPerson ? undefined : setStaffSelectOpen}
                    placeholder={isSalaryAdvance ? 'Select staff' : 'Select staff or labour gang'}
                    options={advanceOptions}
                    optionFilterProp="label"
                    notFoundContent="No staff yet"
                    dropdownRender={
                      lockPerson
                        ? undefined
                        : (menu) => (
                            <>
                              {menu}
                              <Divider style={{ margin: '8px 0' }} />
                              <Button
                                type="text"
                                icon={<PlusOutlined />}
                                style={{ width: '100%', textAlign: 'left' }}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setStaffSelectOpen(false)
                                  setStaffFormOpen(true)
                                }}
                              >
                                Add staff
                              </Button>
                            </>
                          )
                    }
                  />
                </Form.Item>
              )}
            </div>
          </>
        )}
      </Form>
    </Modal>
    {vendorFormOpen && (
      <CustomerFormModal
        open
        quarryId={quarryId}
        defaultType="Vendor"
        zIndex={1200}
        onClose={() => setVendorFormOpen(false)}
        onSave={async (draft) => {
          const party = await addParty({ ...draft, type: 'Vendor' })
          form.setFieldValue('partyId', party.id)
          message.success(`Vendor “${party.name}” added`)
        }}
      />
    )}
    {staffFormOpen && (
      <StaffFormModal
        open
        quarryId={quarryId}
        zIndex={1200}
        onClose={() => setStaffFormOpen(false)}
        onSave={async (draft) => {
          const person = await addStaff(draft)
          form.setFieldValue('advanceLink', toAdvanceLink(person.id))
          message.success(`${person.name} added`)
        }}
      />
    )}
    </>
  )
}
