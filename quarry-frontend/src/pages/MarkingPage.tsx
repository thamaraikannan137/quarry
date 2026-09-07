import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Col, Input, Row, Select, Space } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { StatCard } from '@/components/common'
import { useAuth } from '@/contexts/AuthContext'
import { useDispatch } from '@/contexts/DispatchContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useParties } from '@/contexts/PartiesContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import { type MarkingBatchSummary } from '@/types/marking'
import { formatCbm, formatMarkingNo } from '@/utils/marking'
import { batchBalance, batchReceived, summarizeLoadCounts } from '@/utils/markingPayment'
import { formatDate, money, monthKey, monthLabel } from '@/utils/money'

import '@/styles/marking.css'

type SummaryRow = MarkingBatchSummary & { partyName: string }

export function MarkingPage() {
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { batchesForQuarry, markingsForQuarry } = useMarkings()
  const { customersForQuarry, getParty } = useParties()
  const { dispatchedBlockIds } = useDispatch()
  const { transactions } = useTransactions()
  const canEdit = user?.role !== 'Viewer'

  const [month, setMonth] = useState<string>('all')
  const [partyId, setPartyId] = useState<string>('all')
  const [markerFilter, setMarkerFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const quarryId = activeQuarry?.id
  const buyers = customersForQuarry(quarryId)
  const dispatched = useMemo(() => dispatchedBlockIds(quarryId), [dispatchedBlockIds, quarryId])

  const allBatches = useMemo(() => {
    return batchesForQuarry(quarryId).map((batch) => {
      const load = summarizeLoadCounts(
        batch.blocks.map((block) => block.id),
        dispatched,
      )
      return {
        ...batch,
        ...load,
        partyName: getParty(batch.partyId)?.name ?? '—',
      }
    })
  }, [batchesForQuarry, quarryId, getParty, dispatched])

  const markerOptions = useMemo(() => {
    const names = [...new Set(allBatches.map((row) => row.markerName).filter(Boolean) as string[])].sort((a, b) =>
      a.localeCompare(b),
    )
    return [{ value: 'all', label: 'All markers' }, ...names.map((name) => ({ value: name, label: name }))]
  }, [allBatches])

  const monthOptions = useMemo(() => {
    const keys = [...new Set(allBatches.map((row) => monthKey(row.date)))].sort().reverse()
    return [{ value: 'all', label: 'All months' }, ...keys.map((key) => ({ value: key, label: monthLabel(key) }))]
  }, [allBatches])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allBatches.filter((row) => {
      if (month !== 'all' && monthKey(row.date) !== month) return false
      if (partyId !== 'all' && row.partyId !== partyId) return false
      if (markerFilter !== 'all' && row.markerName !== markerFilter) return false
      if (!q) return true
      const blockNos = row.blocks.map((block) => block.blockNo).join(' ')
      return `${row.partyName} ${row.markingNo} ${row.batchId} ${blockNos} ${row.markerName ?? ''}`.toLowerCase().includes(q)
    })
  }, [allBatches, month, partyId, markerFilter, search])

  const stats = useMemo(() => {
    const cbm = groups.reduce((sum, row) => sum + row.cbm, 0)
    const blocks = groups.reduce((sum, row) => sum + row.blockCount, 0)
    const total = groups.reduce((sum, row) => sum + row.total, 0)
    const received = groups.reduce((sum, row) => sum + batchReceived(transactions, row.batchId), 0)
    const pending = groups.reduce((sum, row) => sum + Math.max(0, batchBalance(row, transactions)), 0)
    return { blocks, cbm, total, received, pending }
  }, [groups, transactions])

  if (!activeQuarry) {
    return <div className="marking-page">Select a quarry to manage block markings.</div>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <h1>Block Marking</h1>
          <p>Marked blocks, CBM and payments for {activeQuarry?.name}.</p>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/marking/new')}>
            Add markings
          </Button>
        )}
      </div>

      <Row gutter={[12, 12]} className="page-stats-row">
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Block marks" value={stats.blocks} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Total CBM" value={stats.cbm} precision={3} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Total"
            value={stats.total}
            formatter={(value) => money(Number(value))}
          />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Received"
            value={stats.received}
            formatter={(value) => money(Number(value))}
            valueColor="#389e0d"
          />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title="Pending"
            value={stats.pending}
            formatter={(value) => money(Number(value))}
            valueColor={stats.pending > 0.5 ? '#cf1322' : '#389e0d'}
          />
        </Col>
      </Row>

      <div className="marking-register-panel">
        <div className="panel-head">
          <h2>Marking summary</h2>
          <Space wrap size={8}>
            <Select style={{ minWidth: 120 }} value={month} onChange={setMonth} options={monthOptions} />
            <Select
              style={{ minWidth: 150 }}
              value={partyId}
              onChange={setPartyId}
              showSearch
              optionFilterProp="label"
              options={[
                { value: 'all', label: 'All parties' },
                ...buyers.map((party) => ({ value: party.id, label: party.name })),
              ]}
            />
            <Select
              style={{ minWidth: 130 }}
              value={markerFilter}
              onChange={setMarkerFilter}
              showSearch
              optionFilterProp="label"
              options={markerOptions}
            />
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search MK-001 / party…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 180 }}
            />
          </Space>
        </div>

        <div className="marking-register-wrap">
          <table className="marking-register marking-summary">
            <thead>
              <tr>
                <th>Marking ID</th>
                <th>Date</th>
                <th>Party</th>
                <th>Marker</th>
                <th className="num">Blocks</th>
                <th className="num">CBM</th>
                <th className="num">Total</th>
                <th className="num">Pending</th>
                <th>Load</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty">
                      No markings for {activeQuarry.name}
                      {markingsForQuarry(quarryId).length ? ' with this filter' : ''}.
                    </div>
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <SummaryBatchRow
                    key={group.batchId}
                    group={group}
                    balance={batchBalance(group, transactions)}
                    onOpen={() => navigate(`/marking/${group.batchId}`)}
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

function SummaryBatchRow({
  group,
  balance,
  onOpen,
}: {
  group: SummaryRow
  balance: number
  onOpen: () => void
}) {
  const loadLabel =
    group.loadPending === 0
      ? 'OK'
      : group.loadOk === 0
        ? 'Pending'
        : `${group.loadOk} OK · ${group.loadPending} pending`

  return (
    <tr className="summary-row" onClick={onOpen}>
      <td>
        <strong>{formatMarkingNo(group)}</strong>
      </td>
      <td>{formatDate(group.date)}</td>
      <td>
        <strong>{group.partyName}</strong>
      </td>
      <td>{group.markerName || '—'}</td>
      <td className="num">{group.blockCount}</td>
      <td className="num">{formatCbm(group.cbm)}</td>
      <td className="num">{money(group.total)}</td>
      <td className="num">{money(Math.max(0, balance))}</td>
      <td>
        <span className={`badge ${group.loadPending === 0 ? 'ok' : 'warn'}`}>{loadLabel}</span>
      </td>
    </tr>
  )
}
