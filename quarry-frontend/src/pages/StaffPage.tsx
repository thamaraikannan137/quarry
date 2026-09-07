import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Col, Input, Row, Select, Space, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { DataTable, StatCard, TableCard } from '@/components/common'
import { StaffFormModal } from '@/components/staff/StaffFormModal'
import { useAuth } from '@/contexts/AuthContext'
import { useStaff } from '@/contexts/StaffContext'
import type { Staff, StaffStatus } from '@/types/staff'
import { money } from '@/utils/money'

import '@/styles/marking.css'

type StatusFilter = 'all' | StaffStatus

export function StaffPage() {
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { staffForQuarry, addStaff } = useStaff()
  const canEdit = user?.role !== 'Viewer'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [formOpen, setFormOpen] = useState(false)

  const quarryId = activeQuarry?.id

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return staffForQuarry(quarryId).filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (!q) return true
      return `${row.name} ${row.designation} ${row.phone}`.toLowerCase().includes(q)
    })
  }, [staffForQuarry, quarryId, search, statusFilter])

  const all = staffForQuarry(quarryId)
  const active = all.filter((row) => row.status === 'Active')
  const payroll = active.reduce((sum, row) => sum + (Number(row.basicSalary) || 0), 0)

  const columns: ColumnsType<Staff> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 64,
      align: 'center',
      render: (_value, _record, index) => index + 1,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value) => (
        <Typography.Text strong ellipsis style={{ maxWidth: '100%', display: 'block' }}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
      width: 150,
      ellipsis: true,
      render: (value) => value || '—',
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 140, render: (v) => v || '—' },
  ]

  if (!activeQuarry) {
    return <Card>Select a quarry to manage staff.</Card>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <h1>Staff Management</h1>
          <p>People on the salary sheet at {activeQuarry.name} — used for salary and advance entries.</p>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            Add staff
          </Button>
        )}
      </div>

      <Row gutter={[12, 12]} className="page-stats-row">
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="People" value={all.length} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Active" value={active.length} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Monthly basic" value={payroll} formatter={(value) => money(Number(value))} />
        </Col>
      </Row>

      <TableCard
        title="All staff"
        extra={
          <Space wrap size={8}>
            <Select
              style={{ minWidth: 130 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All status' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search name / role…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 200 }}
            />
          </Space>
        }
      >
        <DataTable<Staff>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          resetKey={`${quarryId}:${statusFilter}:${search}`}
          emptyText="No staff yet. Add a person to use on salary and advance entries."
          onRow={(record) => ({
            onClick: () => navigate(`/staff/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </TableCard>

      {formOpen && (
        <StaffFormModal
          open
          quarryId={activeQuarry.id}
          onClose={() => setFormOpen(false)}
          onSave={async (draft) => {
            const person = await addStaff(draft)
            message.success(`${person.name} added`)
            navigate(`/staff/${person.id}`)
          }}
        />
      )}
    </div>
  )
}
