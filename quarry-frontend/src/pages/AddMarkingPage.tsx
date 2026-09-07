import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import {
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  Space,
  message,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { CustomerFormModal } from '@/components/customers/CustomerFormModal'
import { NumberInput } from '@/components/common'
import { BlockChoiceSelect } from '@/components/marking/BlockChoiceSelect'
import { GstModeBar } from '@/components/marking/GstModeBar'
import { MarkingTotals } from '@/components/marking/MarkingTotals'
import { PartySelect } from '@/components/marking/PartySelect'
import { errorMessage } from '@/api/http'
import { useAuth } from '@/contexts/AuthContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useParties } from '@/contexts/PartiesContext'
import { DEMO_MARKERS } from '@/data/demoMarkers'
import { emptyMarkingLine, quarryGstPct, type GstType, type MarkingLineDraft } from '@/types/marking'
import { dimsToCm, formatCbm, gstInvoiceHint, hasNetDims, lineGstFields, markGross, markGstAmt, volCbm } from '@/utils/marking'
import { formatDate, money, newId } from '@/utils/money'

import '@/styles/marking.css'

type HeaderValues = {
  date: Dayjs
  partyId: string
  markerName: string
}

type LineRow = MarkingLineDraft & { key: string }

function blankLine(gstType: GstType = 'intra', gstPct = quarryGstPct()): LineRow {
  return { ...emptyMarkingLine('I', gstPct, gstType), key: newId('ln') }
}

function blankLines(count: number, gstType: GstType = 'intra', gstPct = quarryGstPct()): LineRow[] {
  return Array.from({ length: count }, () => blankLine(gstType, gstPct))
}

export function AddMarkingPage() {
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { customersForQuarry, addParty, getParty } = useParties()
  const { markingsForQuarry, addBatch } = useMarkings()
  const [form] = Form.useForm<HeaderValues>()
  const [gstType, setGstType] = useState<GstType>('intra')
  const [gstPct, setGstPct] = useState(quarryGstPct)
  const [lines, setLines] = useState<LineRow[]>(() => blankLines(1, 'intra'))
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

  const defaultGstPct = quarryGstPct(activeQuarry)
  const gstTypeRef = useRef(gstType)
  gstTypeRef.current = gstType

  useEffect(() => {
    form.setFieldsValue({
      date: dayjs(),
      partyId: undefined,
      markerName: undefined,
    })
  }, [form, activeQuarry?.id])

  useEffect(() => {
    setGstPct(defaultGstPct)
    setLines((current) => current.map((line) => ({ ...line, ...lineGstFields(gstTypeRef.current, defaultGstPct) })))
  }, [activeQuarry?.id, defaultGstPct])

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        if (!hasNetDims(line)) return acc
        const hasBlock = Boolean(line.blockNo.trim())
        return {
          cbm: acc.cbm + volCbm(line),
          gross: acc.gross + markGross(line),
          gst: acc.gst + markGstAmt(line),
          total: acc.total + markGross(line) + markGstAmt(line),
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

  const setGstMode = (next: GstType) => {
    const pct = next === 'none' ? 0 : gstPct > 0 ? gstPct : defaultGstPct
    setGstType(next)
    if (next !== 'none' && gstPct <= 0) setGstPct(defaultGstPct)
    setLines((current) => current.map((line) => ({ ...line, ...lineGstFields(next, pct) })))
  }

  const setGstPercent = (nextPct: number) => {
    const pct = Number.isFinite(nextPct) && nextPct >= 0 ? nextPct : 0
    setGstPct(pct)
    if (gstType !== 'none') {
      setLines((current) => current.map((line) => ({ ...line, ...lineGstFields(gstType, pct) })))
    }
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
            gstPct: gstType === 'none' ? 0 : gstPct,
            gstType,
          }
        }),
      }
      const saved = await addBatch(quarryId, draft)
      message.success(
        `${saved.blocks.length} markings · ${getParty(draft.partyId)?.name ?? 'party'} · ${formatDate(draft.date)}`,
      )
      navigate(`/marking/${saved.batchId}`)
    } catch (error) {
      const text = errorMessage(error)
      if (text) message.error(text)
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
        <div className="page-head-title">
          <div className="page-head-title-row">
            <Space size={8} align="center">
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack} aria-label="Back to register" />
              <h1 style={{ margin: 0 }}>Add markings</h1>
            </Space>
          </div>
          <p>One party · one date · multiple blocks for {activeQuarry.name}.</p>
        </div>
        <div className="page-head-actions">
          <div className="marking-batch-footer-btns">
            <Button onClick={goBack}>Cancel</Button>
            <Button type="primary" loading={saving} disabled={!buyers.length} onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="marking-batch marking-batch-panel">
        <Form form={form} layout="vertical" requiredMark={false} styles={{ label: { fontWeight: 600 } }}>
          <div className="marking-batch-fields">
            <Form.Item name="date" label="Date" rules={[{ required: true }]} className="mk-field mk-field-date">
              <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>
            <Form.Item
              name="partyId"
              label="Party"
              rules={[{ required: true, message: 'Select party' }]}
              className="mk-field mk-field-party"
            >
              <PartySelect style={{ width: '100%' }} parties={buyers} onAddParty={() => setPartyFormOpen(true)} />
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

        <div className="mk-lines-head">
          <h2>
            Block lines
            <span className="mk-lines-count">
              {totals.count} block{totals.count === 1 ? '' : 's'}
            </span>
          </h2>
          <GstModeBar gstType={gstType} gstPct={gstPct} onTypeChange={setGstMode} onPctChange={setGstPercent} />
        </div>

        <div className="marking-lines-wrap">
          <table className="marking-lines">
            <colgroup>
              <col className="col-sno" />
              <col className="col-block" />
              <col className="col-choice" />
              <col className="col-dim" />
              <col className="col-dim" />
              <col className="col-dim" />
              <col className="col-cbm" />
              <col className="col-rate" />
              <col className="col-amt" />
              <col className="col-act" />
            </colgroup>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Block no</th>
                <th>Choice</th>
                <th className="num">L</th>
                <th className="num">W</th>
                <th className="num">H</th>
                <th className="num">Net CBM</th>
                <th className="num">Rate</th>
                <th className="num">Gross</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((row, index) => {
                const ready = hasNetDims(row)
                const cbm = ready ? volCbm(row) : 0
                const gross = ready ? markGross(row) : 0
                return (
                  <tr key={row.key}>
                    <td>{index + 1}</td>
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
                      <NumberInput
                        size="small"
                        className="mk-cell-num"
                        min={1}
                        value={row.l || undefined}
                        onChange={(n) => updateLine(row.key, { l: n == null ? 0 : Number(n) })}
                      />
                    </td>
                    <td>
                      <NumberInput
                        size="small"
                        className="mk-cell-num"
                        min={1}
                        value={row.w || undefined}
                        onChange={(n) => updateLine(row.key, { w: n == null ? 0 : Number(n) })}
                      />
                    </td>
                    <td>
                      <NumberInput
                        size="small"
                        className="mk-cell-num"
                        min={1}
                        value={row.h || undefined}
                        onChange={(n) => updateLine(row.key, { h: n == null ? 0 : Number(n) })}
                      />
                    </td>
                    <td className="num">{ready ? formatCbm(cbm) : '—'}</td>
                    <td>
                      <NumberInput
                        size="small"
                        className="mk-cell-num"
                        min={0}
                        value={row.rate}
                        onChange={(n) => updateLine(row.key, { rate: n == null ? 0 : Number(n) })}
                      />
                    </td>
                    <td className="num">{ready ? money(gross) : '—'}</td>
                    <td className="mk-act">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() =>
                          setLines((current) =>
                            current.length <= 1 ? blankLines(1, gstType, gstPct) : current.filter((line) => line.key !== row.key),
                          )
                        }
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="marking-batch-actions">
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setLines((current) => [...current, blankLine(gstType, gstPct)])}>
            Add line
          </Button>
        </div>

        <MarkingTotals
          gstType={gstType}
          gstPct={gstPct}
          cbm={totals.cbm}
          gross={totals.gross}
          gstAmt={totals.gst}
          total={totals.total}
          count={totals.count}
          sized={Boolean(totals.sized)}
        />
      </div>

      <div className="marking-batch-page-footer">
        <div className="marking-batch-invoice">
          Invoice total <strong>{totals.sized ? money(totals.total) : '—'}</strong>
          {gstInvoiceHint(gstType, gstPct) ? (
            <span className="mk-invoice-hint">{gstInvoiceHint(gstType, gstPct)}</span>
          ) : null}
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
          onSave={async (draft) => {
            const party = await addParty({ ...draft, type: 'Customer' })
            form.setFieldValue('partyId', party.id)
            message.success(`${party.name} added`)
            setPartyFormOpen(false)
          }}
        />
      )}
    </div>
  )
}
