import { EditOutlined } from '@ant-design/icons'
import { Button, Descriptions, Modal } from 'antd'

import type { Quarry } from '@/types/app'

type QuarryDetailModalProps = {
  open: boolean
  quarry: Quarry | null
  onClose: () => void
  onEdit: () => void
}

export function QuarryDetailModal({ open, quarry, onClose, onEdit }: QuarryDetailModalProps) {
  return (
    <Modal
      open={open}
      title={quarry?.name ?? 'Quarry'}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Close</Button>
          <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
            Edit
          </Button>
        </div>
      }
      width={480}
    >
      {quarry && (
        <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
          <Descriptions.Item label="Name">{quarry.name}</Descriptions.Item>
          <Descriptions.Item label="Code">{quarry.code}</Descriptions.Item>
          <Descriptions.Item label="Place">{quarry.place || '—'}</Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  )
}
