import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Col, Input, Row, Space } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { StatCard } from '@/components/common'
import { useAuth } from '@/contexts/AuthContext'
import { useDispatch } from '@/contexts/DispatchContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import type { DispatchTrip } from '@/types/dispatch'
import { formatCbm, volCbm } from '@/utils/marking'

import '@/styles/marking.css'

export function LoadsPage() {
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { tripsForQuarry } = useDispatch()
  const { getMarking } = useMarkings()
  const canEdit = user?.role !== 'Viewer'

  const [search, setSearch] = useState('')
  const quarryId = activeQuarry?.id

  const trips = useMemo(() => tripsForQuarry(quarryId), [tripsForQuarry, quarryId])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return trips
      .map((trip) => {
        const blocks = trip.blockIds.map((id) => getMarking(id)).filter(Boolean)
        const cbm = blocks.reduce((sum, block) => sum + volCbm(block!), 0)
        const blockNos = blocks.map((block) => block!.blockNo).join(', ')
        return { trip, blockCount: trip.blockIds.length, cbm, blockNos }
      })
      .filter(({ trip, blockNos }) => {
        if (!q) return true
        return `${trip.loadNo} ${trip.lorryNo} ${trip.fromLocation} ${trip.toLocation} ${trip.date} ${blockNos}`
          .toLowerCase()
          .includes(q)
      })
  }, [trips, getMarking, search])

  const stats = useMemo(() => {
    const cbm = rows.reduce((sum, row) => sum + row.cbm, 0)
    const blocks = rows.reduce((sum, row) => sum + row.blockCount, 0)
    return { trips: rows.length, blocks, cbm }
  }, [rows])

  if (!activeQuarry) {
    return <div className="marking-page">Select a quarry to manage block loads.</div>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <h1>Block Load</h1>
          <p>Lorry trips — date, from → to, blocks from any markings.</p>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/loads/new')}>
            New load
          </Button>
        )}
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8} md={8}>
          <StatCard title="Trips" value={stats.trips} />
        </Col>
        <Col xs={12} sm={8} md={8}>
          <StatCard title="Blocks loaded" value={stats.blocks} />
        </Col>
        <Col xs={12} sm={8} md={8}>
          <StatCard title="Total CBM" value={stats.cbm} precision={3} />
        </Col>
      </Row>

      <div className="marking-register-panel">
        <div className="panel-head">
          <h2>Load trips</h2>
          <Space wrap size={8}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search load id / lorry / block…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 220 }}
            />
          </Space>
        </div>

        <div className="marking-register-wrap">
          <table className="marking-register marking-summary">
            <thead>
              <tr>
                <th>Load ID</th>
                <th>Date</th>
                <th>Lorry</th>
                <th>From</th>
                <th>To</th>
                <th className="num">Blocks</th>
                <th className="num">CBM</th>
                <th>Block nos</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty">No load trips for {activeQuarry.name}.</div>
                  </td>
                </tr>
              ) : (
                rows.map(({ trip, blockCount, cbm, blockNos }) => (
                  <TripRow
                    key={trip.id}
                    trip={trip}
                    blockCount={blockCount}
                    cbm={cbm}
                    blockNos={blockNos}
                    onOpen={() => navigate(`/loads/${trip.id}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TripRow({
  trip,
  blockCount,
  cbm,
  blockNos,
  onOpen,
}: {
  trip: DispatchTrip
  blockCount: number
  cbm: number
  blockNos: string
  onOpen: () => void
}) {
  return (
    <tr className="summary-row" onClick={onOpen}>
      <td>
        <strong>{trip.loadNo}</strong>
      </td>
      <td>{trip.date}</td>
      <td>{trip.lorryNo}</td>
      <td>{trip.fromLocation}</td>
      <td>{trip.toLocation}</td>
      <td className="num">{blockCount}</td>
      <td className="num">{formatCbm(cbm)}</td>
      <td>{blockNos || '—'}</td>
    </tr>
  )
}
