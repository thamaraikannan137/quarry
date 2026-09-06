import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons'
import {
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  message,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { CustomerFormModal } from '@/components/customers/CustomerFormModal'
import { BlockChoiceSelect } from '@/components/marking/BlockChoiceSelect'
import { useAuth } from '@/contexts/AuthContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useParties } from '@/contexts/PartiesContext'
import { DEMO_MARKERS } from '@/data/demoMarkers'
import { DEFAULT_GST_PCT, emptyMarkingLine, type MarkingLineDraft } from '@/types/marking'
import { dimsToCm, formatCbm, hasNetDims, markGross, markGstAmt, markTotal, volCbm } from '@/utils/marking'
import { money, newId } from '@/utils/money'

import '@/styles/marking.css'

type HeaderValues = {
  date: Dayjs
  partyId: string
  markerName: string
}

type LineRow = MarkingLineDraft & { key: string }

function blankLine(): LineRow {
  return { ...emptyMarkingLine(), key: newId('ln') }
}

function blankLines(count: number): LineRow[] {
  return Array.from({ length: count }, () => blankLine())
}

export function AddMarkingPage() {
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { customersForQuarry, addParty, getParty } = useParties()
  const { markingsForQuarry, addBatch } = useMarkings()
  const [form] = Form.useForm<HeaderValues>()
  const [lines, setLines] = useState<LineRow[]>(() => blankLines(1))
  const [saving, setSaving] = useState(false)
  const [partyFormOpen, setPartyFormOpen] = useState(false)

  const canEdit = user?.role !== 'Viewer'
  const quarryId = activeQuarry?.id
  const buyers = useMemo(() => (quarryId ? customersForQuarry(quarryId) : []), [customersForQuarry, quarryId])

  const markerOptions = useMemo(() => {
    if (!quarryId) return DEMO_MARKERS.map((value) => ({ value }))
    const fromBooks = markingsForQuarry(quarryId)
      .map((row) => row.markerName?.trim())
      .filter((name): name is string => Boolean(name))
    return [...new Set([...DEMO_MARKERS, ...fromBooks])].sort((a, b) => a.localeCompare(b)).map((value) => ({ value }))
  }, [markingsForQuarry, quarryId])

  const choiceExtras = useMemo(() => {
    if (!quarryId) return []
    return markingsForQuarry(quarryId)
      .map((row) => row.choice?.trim())
      .filter((name): name is string => Boolean(name))
  }, [markingsForQuarry, quarryId])

  useEffect(() => {
    form.setFieldsValue({
      date: dayjs(),
      partyId: buyers[0]?.id,
      markerName: undefined,
    })
  }, [form, buyers[0]?.id])

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        if (!hasNetDims(line)) return acc
        const hasBlock = Boolean(line.blockNo.trim())
        return {
          cbm: acc.cbm + volCbm(line),
          gross: acc.gross + markGross(line),
          gst: acc.gst + markGstAmt(line),
          total: acc.total + markTotal(line),
          count: acc.count + (hasBlock ? 1 : 0),
          sized: acc.sized + 1,
        }
      },
      { cbm: 0, gross: 0, gst: 0, total: 0, count: 0, sized: 0 },
    )
  }, [lines])

  const updateLine = (key: string, patch: Partial<MarkingLineDraft>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  const goBack = () => navigate('/marking')

  const handleSave = async () => {
    if (!quarryId) return
    try {
      const values = await form.validateFields()
      const valid = lines.filter((line) => line.blockNo.trim() && hasNetDims(line))
      if (!valid.length) {
        message.warning('Enter at least one block (block no + L×W×H)')
        return
      }
      setSaving(true)
      const draft = {
        date: values.date.format('YYYY-MM-DD'),
        partyId: values.partyId,
        markerName: values.markerName?.trim() || undefined,
        lines: valid.map(({ key: _key, ...line }) => {
          const cm = dimsToCm(line)
          return {
            ...line,
            l: cm.l,
            w: cm.w,
            h: cm.h,
            gstPct: line.gstPct || DEFAULT_GST_PCT,
          }
        }),
      }
      const saved = addBatch(quarryId, draft)
      message.success(
        `${saved.blocks.length} markings · ${getParty(draft.partyId)?.name ?? 'party'} · ${draft.date}`,
      )
      navigate(`/marking/${saved.batchId}`)
    } catch {
      // form validation
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) return <Navigate to="/marking" replace />

  if (!activeQuarry || !quarryId) {
    return <div className="marking-page">Select a quarry to add block markings.</div>
  }

  return (
    <div className="marking-page marking-add-page">
      <div className="page-head">
        <div>
          <Space size={8} align="center" style={{ marginBottom: 4 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack} aria-label="Back to register" />
            <h1 style={{ margin: 0 }}>Add markings</h1>
          </Space>
          <p>One party · one date · multiple blocks for {activeQuarry.name}.</p>
        </div>
        <div className="marking-batch-footer-btns">
          <Button onClick={goBack}>Cancel</Button>
          <Button type="primary" loading={saving} disabled={!buyers.length} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      <div className="marking-batch marking-batch-panel">
        <Form form={form} layout="vertical" requiredMark={false} styles={{ label: { fontWeight: 600 } }}>
          <div className="marking-batch-fields">
            <Form.Item name="date" label="Date" rules={[{ required: true }]} className="mk-field mk-field-date">
              <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>
            <Form.Item label="Party" required className="mk-field mk-field-party">
              <div className="mk-party-row">
                <Form.Item name="partyId" noStyle rules={[{ required: true, message: 'Select party' }]}>
                  <Select
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="label"
                    placeholder="Select party"
                    options={buyers.map((party) => ({ value: party.id, label: party.name }))}
                  />
                </Form.Item>
                <Button icon={<UserAddOutlined />} onClick={() => setPartyFormOpen(true)} />
              </div>
            </Form.Item>
            <Form.Item
              name="markerName"
              label="Marker"
              rules={[{ required: true, message: 'Enter marker' }]}
              className="mk-field mk-field-marker"
            >
              <AutoComplete
                options={markerOptions}
                placeholder="e.g. Suboth"
                style={{ width: '100%' }}
                filterOption={(input, option) =>
                  String(option?.value ?? '')
                    .toLowerCase()
                    .includes(input.trim().toLowerCase())
                }
                allowClear
              />
            </Form.Item>
          </div>
        </Form>

        <div className="marking-lines-wrap">
          <table className="marking-lines">
            <colgroup>
              <col className="col-block" />
              <col className="col-choice" />
              <col className="col-dim" />
              <col className="col-dim" />
              <col className="col-dim" />
              <col className="col-rate" />
              <col className="col-gst" />
              <col className="col-cbm" />
              <col className="col-amt" />
              <col className="col-amt" />
              <col className="col-amt" />
              <col className="col-act" />
            </colgroup>
            <thead>
              <tr>
                <th>Block no</th>
                <th>Choice</th>
                <th className="num">L</th>
                <th className="num">W</th>
                <th className="num">H</th>
                <th className="num">Rate</th>
                <th className="num">GST%</th>
                <th className="num">CBM</th>
                <th className="num">Gross</th>
                <th className="num">GST</th>
                <th className="num">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((row) => {
                const ready = hasNetDims(row)
                const cbm = ready ? volCbm(row) : 0
                const gross = ready ? markGross(row) : 0
                const gst = ready ? markGstAmt(row) : 0
                const total = ready ? markTotal(row) : 0
                return (
                  <tr key={row.key}>
                    <td>
                      <Input
                        size="small"
                        placeholder="Block no"
                        value={row.blockNo}
                        onChange={(event) => updateLine(row.key, { blockNo: event.target.value })}
                      />
                    </td>
                    <td>
                      <BlockChoiceSelect
                        className="mk-cell-select"
                        value={row.choice}
                        extraChoices={choiceExtras}
                        onChange={(choice, rate) => updateLine(row.key, { choice, rate })}
                      />
                    </td>
                    <td>
                      <InputNumber
                        size="small"
                        className="mk-cell-num"
                        min={1}
                        controls={false}
                        value={row.l || undefined}
                        onChange={(n) => updateLine(row.key, { l: n == null ? 0 : Number(n) })}
                      />
                    </td>
                    <td>
                      <InputNumber
                        size="small"
                        className="mk-cell-num"
                        min={1}
                        controls={false}
                        value={row.w || undefined}
                        onChange={(n) => updateLine(row.key, { w: n == null ? 0 : Number(n) })}
                      />
                    </td>
                    <td>
                      <InputNumber
                        size="small"
                        className="mk-cell-num"
                        min={1}
                        controls={false}
                        value={row.h || undefined}
                        onChange={(n) => updateLine(row.key, { h: n == null ? 0 : Number(n) })}
                      />
                    </td>
                    <td>
                      <InputNumber
                        size="small"
                        className="mk-cell-num"
                        min={0}
                        controls={false}
                        value={row.rate}
                        onChange={(n) => updateLine(row.key, { rate: n == null ? 0 : Number(n) })}
                      />
                    </td>
                    <td>
                      <InputNumber
                        size="small"
                        className="mk-cell-num"
                        min={0}
                        step={0.01}
                        controls={false}
                        value={row.gstPct}
                        onChange={(n) => updateLine(row.key, { gstPct: n == null ? 0 : Number(n) })}
                      />
                    </td>
                    <td className="num">{ready ? formatCbm(cbm) : '—'}</td>
                    <td className="num">{ready ? money(gross) : '—'}</td>
                    <td className="num">{ready ? money(gst) : '—'}</td>
                    <td className="num">{ready ? money(total) : '—'}</td>
                    <td className="mk-act">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() =>
                          setLines((current) =>
                            current.length <= 1 ? blankLines(1) : current.filter((line) => line.key !== row.key),
                          )
                        }
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7}>
                  <strong>Total</strong>
                  {totals.count ? ` · ${totals.count} block${totals.count === 1 ? '' : 's'}` : ''}
                </td>
                <td className="num">{totals.sized ? formatCbm(totals.cbm) : '0.000'}</td>
                <td className="num">{totals.sized ? money(totals.gross) : '—'}</td>
                <td className="num">{totals.sized ? money(totals.gst) : '—'}</td>
                <td className="num">{totals.sized ? money(totals.total) : '—'}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="marking-batch-actions">
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setLines((current) => [...current, blankLine()])}>
            Add line
          </Button>
        </div>
      </div>

      <div className="marking-batch-page-footer">
        <div className="marking-batch-invoice">
          Invoice total <strong>{totals.sized ? money(totals.total) : '—'}</strong>
        </div>
        <div className="marking-batch-footer-btns">
          <Button onClick={goBack}>Cancel</Button>
          <Button type="primary" loading={saving} disabled={!buyers.length} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      {partyFormOpen && (
        <CustomerFormModal
          open
          quarryId={quarryId}
          defaultType="Customer"
          onClose={() => setPartyFormOpen(false)}
          onSave={(draft) => {
            const party = addParty({ ...draft, type: 'Customer' })
            form.setFieldValue('partyId', party.id)
            message.success(`${party.name} added`)
            setPartyFormOpen(false)
          }}
        />
      )}
    </div>
  )
}
