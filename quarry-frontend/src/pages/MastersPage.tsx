import { Button, Card, Form, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'

import { NumberInput } from '@/components/common'
import { errorMessage } from '@/api/http'
import { updateQuarry as saveQuarry } from '@/api/quarries'
import { useAuth } from '@/contexts/AuthContext'
import { quarryGstPct } from '@/types/marking'

export function MastersPage() {
  const { user, activeQuarry, updateQuarry } = useAuth()
  const canEdit = user?.role !== 'Viewer'
  const [gstPct, setGstPct] = useState(() => quarryGstPct(activeQuarry))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setGstPct(quarryGstPct(activeQuarry))
  }, [activeQuarry?.id, activeQuarry?.gstPct])

  if (!canEdit) return <Navigate to="/" replace />

  if (!activeQuarry) {
    return (
      <Card>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          Masters
        </Typography.Title>
        <Typography.Paragraph>Select a quarry to edit GST defaults.</Typography.Paragraph>
      </Card>
    )
  }

  const handleSave = async () => {
    const pct = Number.isFinite(gstPct) && gstPct >= 0 ? gstPct : 0
    setSaving(true)
    try {
      const saved = await saveQuarry(activeQuarry.id, { gstPct: pct })
      updateQuarry(saved.id, { gstPct: saved.gstPct })
      message.success(`Default GST ${saved.gstPct}% saved for ${activeQuarry.name}`)
    } catch (error) {
      const text = errorMessage(error)
      if (text) message.error(text)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Masters
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Defaults for {activeQuarry.name}. New markings use this GST % unless you change it on the invoice.
      </Typography.Paragraph>
      <Card title="GST">
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
          <Button type="primary" loading={saving} onClick={handleSave}>
            Save
          </Button>
        </Form>
      </Card>
    </div>
  )
}
