import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, DatePicker, Form, Input, Select, Space, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { useAuth } from '@/contexts/AuthContext'
import { useDispatch } from '@/contexts/DispatchContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useParties } from '@/contexts/PartiesContext'
import type { BlockMarking } from '@/types/marking'
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

export function AddLoadPage() {
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { markingsForQuarry, getMarking } = useMarkings()
  const { dispatchedBlockIds, addTrip } = useDispatch()
  const { getParty } = useParties()
  const [form] = Form.useForm<HeaderValues>()
  const [lines, setLines] = useState<LineRow[]>(() => [blankLine()])
  const [saving, setSaving] = useState(false)

  const canEdit = user?.role !== 'Viewer'
  const quarryId = activeQuarry?.id
  const dispatched = useMemo(() => dispatchedBlockIds(quarryId), [dispatchedBlockIds, quarryId])

  const selectedIds = useMemo(
    () => new Set(lines.map((line) => line.blockId).filter(Boolean) as string[]),
    [lines],
  )

  const pendingBlocks = useMemo(() => {
    if (!quarryId) return []
    return markingsForQuarry(quarryId).filter((block) => !dispatched.has(block.id))
  }, [markingsForQuarry, quarryId, dispatched])

  const blockOptionsForRow = (rowKey: string) => {
    const currentId = lines.find((line) => line.key === rowKey)?.blockId
    return pendingBlocks
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

  const goBack = () => navigate('/loads')

  const setLineBlock = (key: string, blockId: string | undefined) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, blockId } : line)))
  }

  const handleSave = async () => {
    if (!quarryId) return
    try {
      const values = await form.validateFields()
      const blockIds = [...new Set(lines.map((line) => line.blockId).filter(Boolean) as string[])].filter(
        (id) => !dispatched.has(id),
      )
      if (!blockIds.length) {
        message.warning('Type and pick at least one pending block')
        return
      }
      setSaving(true)
      const trip = addTrip(quarryId, {
        date: values.date.format('YYYY-MM-DD'),
        lorryNo: values.lorryNo,
        fromLocation: values.fromLocation,
        toLocation: values.toLocation,
        notes: values.notes,
        blockIds,
      })
      message.success(
        `Load ${trip.loadNo} saved · ${trip.lorryNo} · ${blockIds.length} block${blockIds.length === 1 ? '' : 's'}`,
      )
      navigate(`/loads/${trip.id}`)
    } catch {
      // validation
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) return <Navigate to="/loads" replace />

  if (!activeQuarry || !quarryId) {
    return <div className="marking-page">Select a quarry to create a load trip.</div>
  }

  return (
    <div className="marking-page marking-add-page">
      <div className="page-head">
        <div>
          <Space size={8} align="center" style={{ marginBottom: 4 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack} aria-label="Back to loads" />
            <h1 style={{ margin: 0 }}>New load</h1>
          </Space>
          <p>Type a block no in each row — matching marked blocks appear as you type.</p>
        </div>
        <div className="marking-batch-footer-btns">
          <Button onClick={goBack}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            Save load
          </Button>
        </div>
      </div>

      <div className="marking-batch marking-batch-panel">
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          styles={{ label: { fontWeight: 600 } }}
          initialValues={{
            date: dayjs(),
            fromLocation: activeQuarry.name,
          }}
        >
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
                <BlockPickRow
                  key={row.key}
                  block={row.block}
                  options={blockOptionsForRow(row.key)}
                  canRemove={lines.length > 1}
                  onPick={(blockId) => setLineBlock(row.key, blockId)}
                  onClear={() => setLineBlock(row.key, undefined)}
                  onRemove={() =>
                    setLines((current) =>
                      current.length <= 1 ? [blankLine()] : current.filter((line) => line.key !== row.key),
                    )
                  }
                  partyName={row.block ? getParty(row.block.partyId)?.name ?? '—' : '—'}
                />
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

        {!pendingBlocks.length && (
          <p style={{ margin: '12px 0 0', color: 'var(--mk-muted)', fontSize: '0.9rem' }}>
            No pending marked blocks left to load for this quarry.
          </p>
        )}
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
            Save load
          </Button>
        </div>
      </div>
    </div>
  )
}

function BlockPickRow({
  block,
  options,
  partyName,
  canRemove,
  onPick,
  onClear,
  onRemove,
}: {
  block?: BlockMarking
  options: Array<{ value: string; label: string; block: BlockMarking }>
  partyName: string
  canRemove: boolean
  onPick: (blockId: string) => void
  onClear: () => void
  onRemove: () => void
}) {
  return (
    <tr>
      <td>
        <Select
          showSearch
          allowClear
          size="small"
          style={{ width: '100%' }}
          placeholder="Type block no…"
          value={block?.id}
          options={options.map((opt) => ({ value: opt.value, label: opt.label }))}
          filterOption={(input, option) =>
            String(option?.label ?? '')
              .toLowerCase()
              .includes(input.trim().toLowerCase())
          }
          optionFilterProp="label"
          onChange={(value) => {
            if (!value) onClear()
            else onPick(String(value))
          }}
          notFoundContent="No pending block match"
        />
      </td>
      <td>{partyName}</td>
      <td>{block?.date ?? '—'}</td>
      <td>{block?.choice || '—'}</td>
      <td className="num">{block ? formatCbm(volCbm(block)) : '—'}</td>
      <td className="mk-act">
        <Button type="text" size="small" danger disabled={!canRemove && !block} icon={<DeleteOutlined />} onClick={onRemove} />
      </td>
    </tr>
  )
}
