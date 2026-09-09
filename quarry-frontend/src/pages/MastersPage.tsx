import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'

import { createQuarry, updateQuarry as saveQuarry } from '@/api/quarries'
import { errorMessage } from '@/api/http'
import { DataTable, NumberInput, TableCard } from '@/components/common'
import { QuarryDetailModal } from '@/components/quarries/QuarryDetailModal'
import { QuarryFormModal } from '@/components/quarries/QuarryFormModal'
import { useAuth } from '@/contexts/AuthContext'
import type { Quarry } from '@/types/app'
import { quarryGstPct } from '@/types/marking'

import '@/styles/marking.css'

export function MastersPage() {
  const { user, allowedQuarries, activeQuarry, addQuarry, setActiveQuarry, updateQuarry } = useAuth()
  const canEdit = user?.role !== 'Viewer'
  const [gstPct, setGstPct] = useState(() => quarryGstPct(activeQuarry))
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Quarry | null>(null)
  const [viewing, setViewing] = useState<Quarry | null>(null)

  useEffect(() => {
    setGstPct(quarryGstPct(activeQuarry))
  }, [activeQuarry?.id, activeQuarry?.gstPct])

  if (!canEdit) return <Navigate to="/" replace />

  const openDetails = (quarry: Quarry) => {
    setViewing(quarry)
    setActiveQuarry(quarry.id)
  }

  const openEdit = (quarry: Quarry) => {
    setViewing(null)
    setEditing(quarry)
    setFormOpen(true)
    setActiveQuarry(quarry.id)
  }

  const handleSaveGst = async () => {
    if (!activeQuarry) return
    const pct = Number.isFinite(gstPct) && gstPct >= 0 ? gstPct : 0
    setSaving(true)
    try {
      const saved = await saveQuarry(activeQuarry.id, { gstPct: pct })
      updateQuarry(saved.id, saved)
      message.success(`Default GST ${saved.gstPct}% saved for ${activeQuarry.name}`)
    } catch (error) {
      const text = errorMessage(error)
      if (text) message.error(text)
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnsType<Quarry> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (value: string, row) => (
        <Typography.Text strong={row.id === activeQuarry?.id}>{value}</Typography.Text>
      ),
    },
    { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
    { title: 'Place', dataIndex: 'place', key: 'place', render: (value: string) => value || '—' },
    {
      title: '',
      key: 'actions',
      width: 88,
      align: 'right',
      render: (_value, row) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={(event) => {
            event.stopPropagation()
            openEdit(row)
          }}
        >
          Edit
        </Button>
      ),
    },
  ]

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <h1>Masters</h1>
          <p>Quarries used in the header switcher.</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          Add quarry
        </Button>
      </div>

      <TableCard title="Quarries" cardProps={{ style: { marginBottom: 16 } }}>
        <DataTable<Quarry>
          rowKey="id"
          columns={columns}
          dataSource={allowedQuarries}
          resetKey={allowedQuarries.map((row) => row.id).join(',')}
          scrollX={640}
          emptyText="No quarries yet. Add one to start entering markings and loads."
          onRow={(record) => ({
            onClick: () => openDetails(record),
            style: { cursor: 'pointer' },
          })}
        />
      </TableCard>

      {activeQuarry ? (
        <Card title={`GST — ${activeQuarry.name}`}>
          <Form layout="vertical" style={{ maxWidth: 320 }}>
            <Form.Item label="Default GST %" extra="Used for CGST + SGST and IGST on new markings.">
              <NumberInput
                decimal
                min={0}
                max={100}
                value={gstPct}
                onChange={(n) => setGstPct(n == null ? 0 : Number(n))}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Button type="primary" loading={saving} onClick={handleSaveGst}>
              Save
            </Button>
          </Form>
        </Card>
      ) : (
        <Card>
          <Typography.Paragraph>Add a quarry to set GST defaults.</Typography.Paragraph>
        </Card>
      )}

      <QuarryDetailModal
        open={Boolean(viewing)}
        quarry={viewing}
        onClose={() => setViewing(null)}
        onEdit={() => viewing && openEdit(viewing)}
      />

      {formOpen && (
        <QuarryFormModal
          open
          initial={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSave={async (draft) => {
            if (editing) {
              const saved = await saveQuarry(editing.id, draft)
              updateQuarry(saved.id, saved)
              message.success(`${saved.name} updated`)
              return
            }
            const quarry = await createQuarry(draft)
            addQuarry(quarry)
            message.success(`${quarry.name} added`)
          }}
        />
      )}
    </div>
  )
}
