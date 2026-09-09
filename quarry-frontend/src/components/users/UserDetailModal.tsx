import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Descriptions, Modal, Popconfirm, Tag } from 'antd'

import { quarryAccessLabel } from '@/contexts/AuthContext'
import type { AppUser, Quarry } from '@/types/app'

type UserDetailModalProps = {
  open: boolean
  user: AppUser | null
  quarries: Quarry[]
  canDelete: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void | Promise<void>
}

export function UserDetailModal({
  open,
  user,
  quarries,
  canDelete,
  onClose,
  onEdit,
  onDelete,
}: UserDetailModalProps) {
  return (
    <Modal
      open={open}
      title={user?.name ?? 'User'}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Close</Button>
          {canDelete && (
            <Popconfirm
              title={`Delete ${user?.name}?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={onDelete}
            >
              <Button danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          )}
          <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
            Edit
          </Button>
        </div>
      }
      width={480}
    >
      {user && (
        <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
          <Descriptions.Item label="Name">{user.name}</Descriptions.Item>
          <Descriptions.Item label="Username">{user.username}</Descriptions.Item>
          <Descriptions.Item label="Role">{user.role}</Descriptions.Item>
          <Descriptions.Item label="Quarries">{quarryAccessLabel(user, quarries)}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={user.active ? 'success' : 'default'}>{user.active ? 'Active' : 'Inactive'}</Tag>
          </Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  )
}
