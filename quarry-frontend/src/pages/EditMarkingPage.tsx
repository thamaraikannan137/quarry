import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons'
import {
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  message,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'

import { CustomerFormModal } from '@/components/customers/CustomerFormModal'
import { NumberInput } from '@/components/common'
import { BlockChoiceSelect } from '@/components/marking/BlockChoiceSelect'
import { errorMessage } from '@/api/http'
import { useAuth } from '@/contexts/AuthContext'
import { useDispatch } from '@/contexts/DispatchContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useParties } from '@/contexts/PartiesContext'
import { DEMO_MARKERS } from '@/data/demoMarkers'
import { DEFAULT_GST_PCT, emptyMarkingLine, type MarkingLineDraft } from '@/types/marking'
import { dimsToCm, formatCbm, hasNetDims, markGross, markGstAmt, markTotal, volCbm } from '@/utils/marking'
import { formatDate, money, newId } from '@/utils/money'

import '@/styles/marking.css'

type HeaderValues = {
  date: Dayjs
  partyId: string
  markerName: string
}

type LineRow = MarkingLineDraft & { key: string; id?: string }

function blankLine(): LineRow {
  return { ...emptyMarkingLine(), key: newId('ln') }
}

export function EditMarkingPage() {
  const { batchId } = useParams<{ batchId: string }>()
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { customersForQuarry, addParty, getParty } = useParties()
  const { markingsForQuarry, getBatch, updateBatch } = useMarkings()
  const { isBlockDispatched } = useDispatch()
  const [form] = Form.useForm<HeaderValues>()
  const [lines, setLines] = useState<LineRow[]>([])
  const [saving, setSaving] = useState(false)
  const [partyFormOpen, setPartyFormOpen] = useState(false)

  const canEdit = user?.role !== 'Viewer'
  const quarryId = activeQuarry?.id
  const batch = getBatch(batchId)
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
    if (!batch) return
    form.setFieldsValue({
      date: dayjs(batch.date),
      partyId: batch.partyId,
      markerName: batch.markerName,
    })
    setLines(
      batch.blocks.map((block) => ({
        key: block.id,
        id: block.id,
        blockNo: block.blockNo,
        choice: block.choice || 'I',
        l: block.l,
        w: block.w,
        h: block.h,
        rate: block.rate,
        gstPct: block.gstPct || DEFAULT_GST_PCT,
        load: block.load || 'Pending',
        markerName: block.markerName,
      })),
    )
  }, [batch?.batchId, form])

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

  const goBack = () => navigate(batchId ? `/marking/${batchId}` : '/marking')

  const handleSave = async () => {
    if (!batchId || !quarryId || !batch) return
    try {
      const values = await form.validateFields()
      const valid = lines.filter((line) => line.blockNo.trim() && hasNetDims(line))
      if (!valid.length) {
        message.warning('Enter at least one block (block no + L×W×H)')
        return
      }

      const removedLoaded = batch.blocks.filter(
        (block) => isBlockDispatched(block.id) && !valid.some((line) => line.id === block.id),
      )
      if (removedLoaded.length) {
        message.warning(
          `Cannot remove loaded block${removedLoaded.length === 1 ? '' : 's'}: ${removedLoaded
            .map((block) => block.blockNo)
            .join(', ')}`,
        )
        return
      }

      setSaving(true)
      const draft = {
        date: values.date.format('YYYY-MM-DD'),
        partyId: values.partyId,
        markerName: values.markerName?.trim() || undefined,
        lines: valid.map(({ key: _key, id, ...line }) => {
          const cm = dimsToCm(line)
          return {
            id,
            ...line,
            l: cm.l,
            w: cm.w,
            h: cm.h,
            gstPct: line.gstPct || DEFAULT_GST_PCT,
          }
        }),
      }
      const saved = await updateBatch(batchId, draft)
      message.success(
        `Updated ${saved.blocks.length} block${saved.blocks.length === 1 ? '' : 's'} · ${getParty(draft.partyId)?.name ?? 'party'} · ${formatDate(draft.date)}`,
      )
      navigate(`/marking/${batchId}`)
    } catch (error) {
      const text = errorMessage(error)
      if (text) message.error(text)
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) return <Navigate to="/marking" replace />
  if (!batchId) return <Navigate to="/marking" replace />
  if (!batch) {
    return (
      <div className="marking-page">
        <p>Marking not found.</p>
        <Button type="primary" onClick={() => navigate('/marking')}>
          Back to summary
        </Button>
      </div>
    )
  }
  if (!activeQuarry || !quarryId) {
    return <div className="marking-page">Select a quarry to edit block markings.</div>
  }

  if (!lines.length) {
    return <div className="marking-page">Loading…</div>
  }

  return (
    <div className="marking-page marking-add-page">
      <div className="page-head">
        <div>
          <Space size={8} align="center" style={{ marginBottom: 4 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack} aria-label="Back to marking" />
            <h1 style={{ margin: 0 }}>Edit marking</h1>
          </Space>
          <p>
            {getParty(batch.partyId)?.name ?? 'Party'} · {formatDate(batch.date)} · {activeQuarry.name}
          </p>
        </div>
        <div className="marking-batch-footer-btns">
          <Button onClick={goBack}>Cancel</Button>
          <Button type="primary" loading={saving} disabled={!buyers.length} onClick={handleSave}>
            Save changes
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
                const readyDims = hasNetDims(row)
                const cbm = readyDims ? volCbm(row) : 0
                const gross = readyDims ? markGross(row) : 0
                const gst = readyDims ? markGstAmt(row) : 0
                const total = readyDims ? markTotal(row) : 0
                const loaded = Boolean(row.id && isBlockDispatched(row.id))
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
                    <td>
                      <NumberInput
                        size="small"
                        className="mk-cell-num"
                        min={0}
                        value={row.rate}
                        onChange={(n) => updateLine(row.key, { rate: n == null ? 0 : Number(n) })}
                      />
                    </td>
                    <td>
                      <NumberInput
                        decimal
                        size="small"
                        className="mk-cell-num"
                        min={0}
                        step={0.01}
                        value={row.gstPct}
                        onChange={(n) => updateLine(row.key, { gstPct: n == null ? 0 : Number(n) })}
                      />
                    </td>
                    <td className="num">{readyDims ? formatCbm(cbm) : '—'}</td>
                    <td className="num">{readyDims ? money(gross) : '—'}</td>
                    <td className="num">{readyDims ? money(gst) : '—'}</td>
                    <td className="num">{readyDims ? money(total) : '—'}</td>
                    <td className="mk-act">
                      <Button
                        type="text"
                        size="small"
                        danger
                        disabled={loaded || lines.length <= 1}
                        title={loaded ? 'Loaded on a lorry — cannot remove here' : undefined}
                        icon={<DeleteOutlined />}
                        onClick={() =>
                          setLines((current) =>
                            current.length <= 1 ? [blankLine()] : current.filter((line) => line.key !== row.key),
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
            Save changes
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
