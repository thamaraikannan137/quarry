import { EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Input, Select, Space, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router'

import { createUser, deleteUser, listUsers, updateUser } from '@/api/users'
import { errorMessage } from '@/api/http'
import { DataTable, TableCard } from '@/components/common'
import { UserDetailModal } from '@/components/users/UserDetailModal'
import { UserFormModal } from '@/components/users/UserFormModal'
import { quarryAccessLabel, useAuth } from '@/contexts/AuthContext'
import type { AppUser, Role } from '@/types/app'
import { ROLES } from '@/types/app'

import '@/styles/marking.css'

type StatusFilter = 'all' | 'active' | 'inactive'

export function UsersPage() {
  const { user, quarries, patchSession } = useAuth()
  const [rows, setRows] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [viewing, setViewing] = useState<AppUser | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setRows(await listUsers())
    } catch (error) {
      const text = errorMessage(error)
      if (text) message.error(text)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (roleFilter !== 'all' && row.role !== roleFilter) return false
      if (statusFilter === 'active' && !row.active) return false
      if (statusFilter === 'inactive' && row.active) return false
      if (!q) return true
      return `${row.name} ${row.username} ${row.role}`.toLowerCase().includes(q)
    })
  }, [rows, search, roleFilter, statusFilter])

  if (!user || user.role !== 'Owner') return <Navigate to="/" replace />

  const openEdit = (row: AppUser) => {
    setViewing(null)
    setEditing(row)
    setFormOpen(true)
  }

  const columns: ColumnsType<AppUser> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    { title: 'Username', dataIndex: 'username', key: 'username', width: 140 },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 130,
      render: (value: Role) => <Tag>{value}</Tag>,
    },
    {
      title: 'Quarries',
      key: 'quarries',
      ellipsis: true,
      render: (_value, row) => quarryAccessLabel(row, quarries),
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      render: (active: boolean) => <Tag color={active ? 'success' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>,
    },
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
          <h1>Users & roles</h1>
          <p>Logins for the quarry app. Role controls what they can see and edit.</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          Add user
        </Button>
      </div>

      <TableCard
        title="Users"
        extra={
          <Space wrap size={8}>
            <Select
              style={{ minWidth: 140 }}
              value={roleFilter}
              onChange={setRoleFilter}
              options={[{ value: 'all', label: 'All roles' }, ...ROLES.map((role) => ({ value: role, label: role }))]}
            />
            <Select
              style={{ minWidth: 130 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search name / username…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 220 }}
            />
          </Space>
        }
      >
        <DataTable<AppUser>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filtered}
          resetKey={`${roleFilter}:${statusFilter}:${search}`}
          scrollX={800}
          emptyText="No users yet. Add a login and assign a role."
          onRow={(record) => ({
            onClick: () => setViewing(record),
            style: { cursor: 'pointer' },
          })}
        />
      </TableCard>

      <UserDetailModal
        open={Boolean(viewing)}
        user={viewing}
        quarries={quarries}
        canDelete={Boolean(viewing && viewing.id !== user.id)}
        onClose={() => setViewing(null)}
        onEdit={() => viewing && openEdit(viewing)}
        onDelete={async () => {
          if (!viewing) return
          try {
            await deleteUser(viewing.id)
            setRows((current) => current.filter((row) => row.id !== viewing.id))
            message.success(`${viewing.name} deleted`)
            setViewing(null)
          } catch (error) {
            const text = errorMessage(error)
            if (text) message.error(text)
            throw error
          }
        }}
      />

      {formOpen && (
        <UserFormModal
          open
          quarries={quarries}
          initial={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSave={async (draft) => {
            if (editing) {
              const saved = await updateUser(editing.id, draft)
              setRows((current) => current.map((row) => (row.id === saved.id ? saved : row)))
              if (saved.id === user.id) {
                patchSession({
                  name: saved.name,
                  username: saved.username,
                  role: saved.role,
                  quarryIds: saved.quarryIds,
                  lastQuarryId: saved.lastQuarryId,
                })
              }
              message.success(`${saved.name} updated`)
              return
            }
            if (!draft.password) throw new Error('Password is required')
            const created = await createUser({ ...draft, password: draft.password })
            setRows((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
            message.success(`${created.name} added`)
          }}
        />
      )}
    </div>
  )
}
