import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, DatePicker, Form, Input, Select, Space, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'

import { useAuth } from '@/contexts/AuthContext'
import { useDispatch } from '@/contexts/DispatchContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useParties } from '@/contexts/PartiesContext'
import { formatCbm, volCbm } from '@/utils/marking'
import { newId } from '@/utils/money'

import '@/styles/marking.css'

type HeaderValues = {
  date: Dayjs
  lorryNo: string
  fromLocation: string
  toLocation: string
  notes?: string
}

type LineRow = {
  key: string
  blockId?: string
}

function blankLine(): LineRow {
  return { key: newId('ll') }
}

export function EditLoadPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { markingsForQuarry, getMarking } = useMarkings()
  const { getTrip, dispatchedBlockIds, tripForBlock, updateTrip } = useDispatch()
  const { getParty } = useParties()
  const [form] = Form.useForm<HeaderValues>()
  const [lines, setLines] = useState<LineRow[]>(() => [blankLine()])
  const [saving, setSaving] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const canEdit = user?.role !== 'Viewer'
  const trip = getTrip(tripId)
  const quarryId = trip?.quarryId ?? activeQuarry?.id
  const dispatched = useMemo(() => dispatchedBlockIds(quarryId), [dispatchedBlockIds, quarryId])

  const selectedIds = useMemo(
    () => new Set(lines.map((line) => line.blockId).filter(Boolean) as string[]),
    [lines],
  )

  const availableBlocks = useMemo(() => {
    if (!quarryId || !trip) return []
    return markingsForQuarry(quarryId).filter((block) => {
      if (trip.blockIds.includes(block.id)) return true
      if (!dispatched.has(block.id)) return true
      return false
    })
  }, [markingsForQuarry, quarryId, dispatched, trip])

  const blockOptionsForRow = (rowKey: string) => {
    const currentId = lines.find((line) => line.key === rowKey)?.blockId
    return availableBlocks
      .filter((block) => block.id === currentId || !selectedIds.has(block.id))
      .map((block) => ({
        value: block.id,
        label: `${block.blockNo} · ${getParty(block.partyId)?.name ?? '—'} · ${block.date}`,
        block,
      }))
  }

  const resolvedLines = useMemo(() => {
    return lines.map((line) => {
      const block = line.blockId ? getMarking(line.blockId) : undefined
      return { ...line, block }
    })
  }, [lines, getMarking])

  const selectedCbm = useMemo(() => {
    return resolvedLines.reduce((sum, line) => sum + (line.block ? volCbm(line.block) : 0), 0)
  }, [resolvedLines])

  const selectedCount = resolvedLines.filter((line) => line.block).length

  useEffect(() => {
    if (!trip || hydrated) return
    form.setFieldsValue({
      date: dayjs(trip.date),
      lorryNo: trip.lorryNo,
      fromLocation: trip.fromLocation,
      toLocation: trip.toLocation,
      notes: trip.notes,
    })
    setLines(
      trip.blockIds.length
        ? trip.blockIds.map((blockId) => ({ key: newId('ll'), blockId }))
        : [blankLine()],
    )
    setHydrated(true)
  }, [trip, hydrated, form])

  const goBack = () => navigate(trip ? `/loads/${trip.id}` : '/loads')

  const setLineBlock = (key: string, blockId: string | undefined) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, blockId } : line)))
  }

  const handleSave = async () => {
    if (!trip) return
    try {
      const values = await form.validateFields()
      const blockIds = [...new Set(lines.map((line) => line.blockId).filter(Boolean) as string[])].filter(
        (id) => {
          const other = tripForBlock(id)
          return !other || other.id === trip.id
        },
      )
      if (!blockIds.length) {
        message.warning('Type and pick at least one block')
        return
      }
      setSaving(true)
      updateTrip(trip.id, {
        date: values.date.format('YYYY-MM-DD'),
        lorryNo: values.lorryNo,
        fromLocation: values.fromLocation,
        toLocation: values.toLocation,
        notes: values.notes,
        blockIds,
      })
      message.success(`Load ${trip.loadNo} updated`)
      navigate(`/loads/${trip.id}`)
    } catch {
      // validation
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) return <Navigate to="/loads" replace />
  if (!tripId) return <Navigate to="/loads" replace />
  if (!trip) {
    return (
      <div className="marking-page">
        <p>Load trip not found.</p>
        <Button type="primary" onClick={() => navigate('/loads')}>
          Back to loads
        </Button>
      </div>
    )
  }

  return (
    <div className="marking-page marking-add-page">
      <div className="page-head">
        <div>
          <Space size={8} align="center" style={{ marginBottom: 4 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack} aria-label="Back" />
            <h1 style={{ margin: 0 }}>Edit {trip.loadNo}</h1>
          </Space>
          <p>Update lorry details or change blocks on this load.</p>
        </div>
        <div className="marking-batch-footer-btns">
          <Button onClick={goBack}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </div>

      <div className="marking-batch marking-batch-panel">
        <Form form={form} layout="vertical" requiredMark={false} styles={{ label: { fontWeight: 600 } }}>
          <div
            className="marking-batch-fields"
            style={{ gridTemplateColumns: '148px minmax(140px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr)' }}
          >
            <Form.Item name="date" label="Date" rules={[{ required: true }]} className="mk-field">
              <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>
            <Form.Item
              name="lorryNo"
              label="Lorry no"
              rules={[{ required: true, message: 'Enter lorry number' }]}
              className="mk-field"
            >
              <Input placeholder="e.g. TN-58-AB-4421" />
            </Form.Item>
            <Form.Item
              name="fromLocation"
              label="From"
              rules={[{ required: true, message: 'Enter from location' }]}
              className="mk-field"
            >
              <Input placeholder="Quarry / yard" />
            </Form.Item>
            <Form.Item
              name="toLocation"
              label="To"
              rules={[{ required: true, message: 'Enter destination' }]}
              className="mk-field"
            >
              <Input placeholder="Delivery place" />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Notes" className="mk-field">
            <Input.TextArea rows={2} placeholder="Optional" />
          </Form.Item>
        </Form>

        <div className="marking-lines-wrap" style={{ maxHeight: 'min(55vh, 480px)' }}>
          <table className="marking-lines" style={{ minWidth: 780 }}>
            <thead>
              <tr>
                <th style={{ width: 220 }}>Block</th>
                <th>Party</th>
                <th>Marking date</th>
                <th>Choice</th>
                <th className="num">CBM</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {resolvedLines.map((row) => (
                <tr key={row.key}>
                  <td>
                    <Select
                      showSearch
                      allowClear
                      size="small"
                      style={{ width: '100%' }}
                      placeholder="Type block no…"
                      value={row.block?.id}
                      options={blockOptionsForRow(row.key).map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                      }))}
                      filterOption={(input, option) =>
                        String(option?.label ?? '')
                          .toLowerCase()
                          .includes(input.trim().toLowerCase())
                      }
                      optionFilterProp="label"
                      onChange={(value) => {
                        if (!value) setLineBlock(row.key, undefined)
                        else setLineBlock(row.key, String(value))
                      }}
                      notFoundContent="No block match"
                    />
                  </td>
                  <td>{row.block ? getParty(row.block.partyId)?.name ?? '—' : '—'}</td>
                  <td>{row.block?.date ?? '—'}</td>
                  <td>{row.block?.choice || '—'}</td>
                  <td className="num">{row.block ? formatCbm(volCbm(row.block)) : '—'}</td>
                  <td className="mk-act">
                    <Button
                      type="text"
                      size="small"
                      danger
                      disabled={lines.length <= 1 && !row.block}
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        setLines((current) =>
                          current.length <= 1 ? [blankLine()] : current.filter((line) => line.key !== row.key),
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>
                  <strong>Total</strong>
                  {selectedCount ? ` · ${selectedCount} block${selectedCount === 1 ? '' : 's'}` : ''}
                </td>
                <td className="num">{selectedCount ? formatCbm(selectedCbm) : '0.000'}</td>
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
          Selected <strong>{selectedCount}</strong>
          {selectedCount ? (
            <>
              {' '}
              · CBM <strong>{formatCbm(selectedCbm)}</strong>
            </>
          ) : null}
        </div>
        <div className="marking-batch-footer-btns">
          <Button onClick={goBack}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}
