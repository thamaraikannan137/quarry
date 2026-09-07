import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Descriptions, Modal, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'

import { errorMessage } from '@/api/http'
import { useAuth } from '@/contexts/AuthContext'
import { useDispatch } from '@/contexts/DispatchContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useParties } from '@/contexts/PartiesContext'
import type { BlockMarking } from '@/types/marking'
import { formatCbm, formatMarkingNo, formatSize, volCbm } from '@/utils/marking'
import { formatDate } from '@/utils/money'

import '@/styles/marking.css'

type BlockRow = BlockMarking & {
  cbm: number
  partyName: string
}

export function LoadDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getTrip, deleteTrip } = useDispatch()
  const { getMarking } = useMarkings()
  const { getParty } = useParties()
  const canEdit = user?.role !== 'Viewer'

  const trip = getTrip(tripId)

  const rows = useMemo(() => {
    if (!trip) return []
    return trip.blockIds
      .map((id) => getMarking(id))
      .filter((block): block is BlockMarking => Boolean(block))
      .map((block) => ({
        ...block,
        cbm: volCbm(block),
        partyName: getParty(block.partyId)?.name ?? '—',
      }))
      .sort((a, b) => a.partyName.localeCompare(b.partyName) || a.date.localeCompare(b.date) || a.blockNo.localeCompare(b.blockNo))
  }, [trip, getMarking, getParty])

  const totalCbm = useMemo(() => rows.reduce((sum, row) => sum + row.cbm, 0), [rows])

  const markingGroups = useMemo(() => {
    const map = new Map<string, BlockRow[]>()
    for (const row of rows) {
      const list = map.get(row.batchId)
      if (list) list.push(row)
      else map.set(row.batchId, [row])
    }
    return [...map.entries()].map(([batchId, blocks]) => ({
      batchId,
      partyName: blocks[0].partyName,
      date: blocks[0].date,
      blocks,
    }))
  }, [rows])

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

  const handleDelete = () => {
    Modal.confirm({
      title: `Delete load ${trip.loadNo}?`,
      content: `Removes trip ${trip.loadNo} (${trip.lorryNo}). Blocks return to Pending load status.`,
      okText: 'Delete load',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteTrip(trip.id)
          message.success('Load deleted')
          navigate('/loads')
        } catch (error) {
          const text = errorMessage(error)
          if (text) message.error(text)
          throw error
        }
      },
    })
  }

  const columns: ColumnsType<BlockRow> = [
    {
      title: 'Block',
      dataIndex: 'blockNo',
      key: 'blockNo',
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Party',
      dataIndex: 'partyName',
      key: 'partyName',
    },
    {
      title: 'Marking',
      key: 'marking',
      render: (_value, row) => (
        <Link to={`/marking/${row.batchId}`} onClick={(event) => event.stopPropagation()}>
          {formatMarkingNo(row)}
        </Link>
      ),
    },
    {
      title: 'Choice',
      dataIndex: 'choice',
      key: 'choice',
      width: 80,
      render: (value: string) => <Tag>{value || '—'}</Tag>,
    },
    {
      title: 'Size',
      key: 'size',
      width: 120,
      render: (_value, row) => formatSize(row),
    },
    {
      title: 'CBM',
      dataIndex: 'cbm',
      key: 'cbm',
      width: 90,
      align: 'right',
      render: (value: number) => formatCbm(value),
    },
  ]

  return (
    <div className="marking-page marking-detail-page">
      <div className="page-head">
        <div>
          <Space size={8} align="center" style={{ marginBottom: 4 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/loads')} aria-label="Back to loads" />
            <h1 style={{ margin: 0 }}>
              {trip.loadNo} · {trip.lorryNo}
            </h1>
          </Space>
          <p>
            {formatDate(trip.date)} · {trip.fromLocation} → {trip.toLocation} · {rows.length} block
            {rows.length === 1 ? '' : 's'}
          </p>
        </div>
        {canEdit && (
          <Space wrap>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/loads/${trip.id}/edit`)}>
              Edit load
            </Button>
            <Button danger onClick={handleDelete}>
              Delete load
            </Button>
          </Space>
        )}
      </div>

      <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} style={{ marginBottom: 16 }} bordered>
        <Descriptions.Item label="Load ID">
          <Typography.Text code strong>
            {trip.loadNo}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Date">{formatDate(trip.date)}</Descriptions.Item>
        <Descriptions.Item label="Lorry">
          <Typography.Text strong>{trip.lorryNo}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="From">{trip.fromLocation}</Descriptions.Item>
        <Descriptions.Item label="To">{trip.toLocation}</Descriptions.Item>
        <Descriptions.Item label="Blocks">{rows.length}</Descriptions.Item>
        <Descriptions.Item label="Total CBM">
          <Typography.Text strong>{formatCbm(totalCbm)}</Typography.Text>
        </Descriptions.Item>
        {trip.notes ? (
          <Descriptions.Item label="Notes" span={3}>
            {trip.notes}
          </Descriptions.Item>
        ) : null}
      </Descriptions>

      {markingGroups.length > 1 && (
        <div style={{ marginBottom: 12, color: 'var(--mk-muted)', fontSize: '0.9rem' }}>
          This lorry carries blocks from <strong>{markingGroups.length}</strong> different markings.
        </div>
      )}

      <div className="marking-register-panel">
        <div className="panel-head">
          <h2>Blocks on this load</h2>
        </div>
        <div style={{ padding: 12 }}>
          <Table<BlockRow>
            size="small"
            rowKey="id"
            pagination={false}
            scroll={{ x: 720 }}
            dataSource={rows}
            columns={columns}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}>
                  <Typography.Text strong>Total</Typography.Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Typography.Text strong>{formatCbm(totalCbm)}</Typography.Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </div>
      </div>
    </div>
  )
}
