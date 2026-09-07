import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import { Button, Col, Descriptions, Modal, Row, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'

import { errorMessage } from '@/api/http'
import { StatCard } from '@/components/common'
import { ReceivePaymentModal } from '@/components/marking/ReceivePaymentModal'
import { useAuth } from '@/contexts/AuthContext'
import { useDispatch } from '@/contexts/DispatchContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useParties } from '@/contexts/PartiesContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import type { BlockMarking } from '@/types/marking'
import {
  formatCbm,
  formatGstRate,
  formatMarkingNo,
  formatSize,
  markGross,
  markGstPct,
  markGstType,
  splitIntraGst,
  volCbm,
} from '@/utils/marking'
import {
  batchBalance,
  batchPayStatus,
  batchReceived,
  paymentsForBatch,
} from '@/utils/markingPayment'
import { formatDate, money } from '@/utils/money'

import '@/styles/marking.css'

type BlockRow = BlockMarking & {
  cbm: number
  gross: number
  loadStatus: 'OK' | 'Pending'
  tripId?: string
  tripLabel?: string
}

export function MarkingDetailPage() {
  const { batchId } = useParams<{ batchId: string }>()
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { getBatch, deleteBatch, deleteMarking } = useMarkings()
  const { getParty } = useParties()
  const { tripForBlock, isBlockDispatched } = useDispatch()
  const { transactions, deleteTransaction } = useTransactions()
  const [payOpen, setPayOpen] = useState(false)
  const canEdit = user?.role !== 'Viewer'

  const batch = getBatch(batchId)
  const party = getParty(batch?.partyId)

  const received = batch ? batchReceived(transactions, batch.batchId) : 0
  const balance = batch ? batchBalance(batch, transactions) : 0
  const payStatus = batch ? batchPayStatus(batch, transactions) : null
  const payments = batch ? paymentsForBatch(transactions, batch.batchId) : []
  const gstSplit = splitIntraGst(batch?.gstAmt ?? 0)
  const gstType = batch ? markGstType(batch.blocks[0] ?? { gstType: 'none', gstPct: 0 }) : 'none'
  const gstPct = batch ? markGstPct(batch.blocks[0] ?? { gstPct: 0 }, 0) : 0

  const rows = useMemo(() => {
    if (!batch) return []
    return batch.blocks.map((block) => {
      const trip = tripForBlock(block.id)
      return {
        ...block,
        cbm: volCbm(block),
        gross: markGross(block),
        loadStatus: isBlockDispatched(block.id) ? ('OK' as const) : ('Pending' as const),
        tripId: trip?.id,
        tripLabel: trip ? `${trip.loadNo} · ${trip.lorryNo}` : undefined,
      }
    })
  }, [batch, tripForBlock, isBlockDispatched])

  if (!batchId) return <Navigate to="/marking" replace />
  if (!batch) {
    return (
      <div className="marking-page">
        <p>Marking not found.</p>
        <Button type="primary" onClick={() => navigate('/marking')}>
          Back to summary
        </Button>
      </div>
    )
  }

  const handleDeleteBatch = () => {
    Modal.confirm({
      title: `Delete marking ${formatMarkingNo(batch)}?`,
      content: `Removes all ${batch.blockCount} block${batch.blockCount === 1 ? '' : 's'} for ${party?.name ?? 'party'} on ${formatDate(batch.date)}.`,
      okText: 'Delete marking',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteBatch(batch.batchId)
          message.success('Marking deleted')
          navigate('/marking')
        } catch (error) {
          const text = errorMessage(error)
          if (text) message.error(text)
          throw error
        }
      },
    })
  }

  const colW = 120
  const snoW = 56
  const textSort = (a?: string | null, b?: string | null) =>
    (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' })
  const columns: ColumnsType<BlockRow> = [
    {
      title: 'S.No',
      key: 'sno',
      width: snoW,
      align: 'left',
      render: (_value, _row, index) => index + 1,
    },
    {
      title: 'Block',
      dataIndex: 'blockNo',
      key: 'blockNo',
      width: colW,
      ellipsis: true,
      sorter: (a, b) => textSort(a.blockNo, b.blockNo),
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Choice',
      dataIndex: 'choice',
      key: 'choice',
      width: colW,
      ellipsis: true,
      sorter: (a, b) => textSort(a.choice, b.choice),
      render: (value: string) => <Tag>{value || '—'}</Tag>,
    },
    {
      title: 'Buyer gross measurement',
      key: 'size',
      width: colW,
      ellipsis: true,
      sorter: (a, b) => a.l - b.l || a.w - b.w || a.h - b.h,
      render: (_value, row) => formatSize(row),
    },
    {
      title: 'Net CBM',
      dataIndex: 'cbm',
      key: 'cbm',
      width: colW,
      align: 'right',
      sorter: (a, b) => a.cbm - b.cbm,
      render: (value: number) => formatCbm(value),
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      width: colW,
      align: 'right',
      sorter: (a, b) => a.rate - b.rate,
      render: (value: number) => money(value),
    },
    {
      title: 'Gross',
      dataIndex: 'gross',
      key: 'gross',
      width: colW,
      align: 'right',
      sorter: (a, b) => a.gross - b.gross,
      render: (value: number) => money(value),
    },
    {
      title: 'Load',
      key: 'load',
      width: colW,
      sorter: (a, b) => textSort(a.loadStatus, b.loadStatus),
      render: (_value, row) => (
        <Tag color={row.loadStatus === 'OK' ? 'success' : 'warning'}>{row.loadStatus}</Tag>
      ),
    },
    {
      title: 'Lorry / trip',
      key: 'trip',
      width: colW,
      ellipsis: true,
      sorter: (a, b) => textSort(a.tripLabel, b.tripLabel),
      render: (_value, row) =>
        row.tripId ? (
          <Link to={`/loads/${row.tripId}`} onClick={(event) => event.stopPropagation()}>
            {row.tripLabel}
          </Link>
        ) : (
          '—'
        ),
    },
  ]

  if (canEdit) {
    columns.push({
      title: '',
      key: 'actions',
      width: 48,
      render: (_value, row) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          aria-label={`Remove block ${row.blockNo}`}
          disabled={batch.blockCount <= 1}
          onClick={() => {
            Modal.confirm({
              title: `Remove block ${row.blockNo}?`,
              okText: 'Remove',
              okButtonProps: { danger: true },
              onOk: async () => {
                try {
                  await deleteMarking(row.id)
                  message.success('Block removed')
                  if (batch.blockCount <= 1) navigate('/marking')
                } catch (error) {
                  const text = errorMessage(error)
                  if (text) message.error(text)
                  throw error
                }
              },
            })
          }}
        />
      ),
    })
  }

  return (
    <div className="marking-page marking-detail-page">
      <div className="page-head">
        <div>
          <Space size={8} align="center" style={{ marginBottom: 4 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/marking')} aria-label="Back to summary" />
            <h1 style={{ margin: 0 }}>
              {formatMarkingNo(batch)} · {party?.name ?? 'Party'}
            </h1>
          </Space>
          <p>
            {batch.blockCount} block{batch.blockCount === 1 ? '' : 's'}
            {batch.markerName ? ` · Marker ${batch.markerName}` : ''}
            {payStatus ? ` · ${payStatus.label}` : ''}
          </p>
        </div>
        <Space wrap>
          {canEdit && (
            <Button onClick={() => navigate(`/marking/${batch.batchId}/edit`)}>Edit marking</Button>
          )}
          {canEdit && balance > 0.5 && (
            <Button type="primary" onClick={() => setPayOpen(true)}>
              Receive payment
            </Button>
          )}
          {canEdit && (
            <Button danger onClick={handleDeleteBatch}>
              Delete marking
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={6}>
          <StatCard title="Invoice total" value={batch.total} formatter={(value) => money(Number(value))} />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title="Received"
            value={received}
            formatter={(value) => money(Number(value))}
            valueColor="#389e0d"
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard
            title="Balance"
            value={balance}
            formatter={(value) => money(Number(value))}
            valueColor={balance > 0.5 ? undefined : '#389e0d'}
          />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard title="Payment" value={payStatus?.label ?? '—'} />
        </Col>
      </Row>

      <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} style={{ marginBottom: 16 }} bordered>
        <Descriptions.Item label="Marking ID">
          <Typography.Text code strong>
            {formatMarkingNo(batch)}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Party">{party?.name ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Marker">
          <Typography.Text strong>{batch.markerName || '—'}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Date">{formatDate(batch.date)}</Descriptions.Item>
        <Descriptions.Item label="Blocks">{batch.blockCount}</Descriptions.Item>
        <Descriptions.Item label="Total net CBM">
          <Typography.Text strong>{formatCbm(batch.cbm)}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Gross">{money(batch.gross)}</Descriptions.Item>
        {gstType === 'intra' && (
          <>
            <Descriptions.Item label={`CGST ${formatGstRate(gstPct / 2)}%`}>{money(gstSplit.cgst)}</Descriptions.Item>
            <Descriptions.Item label={`SGST ${formatGstRate(gstPct / 2)}%`}>{money(gstSplit.sgst)}</Descriptions.Item>
          </>
        )}
        {gstType === 'igst' && (
          <Descriptions.Item label={`IGST ${formatGstRate(gstPct)}%`}>{money(batch.gstAmt)}</Descriptions.Item>
        )}
        {gstType === 'gst' && (
          <Descriptions.Item label={`GST ${formatGstRate(gstPct)}%`}>{money(batch.gstAmt)}</Descriptions.Item>
        )}
        <Descriptions.Item label="Final total">
          <Typography.Text strong style={{ color: '#389e0d' }}>
            {money(batch.total)}
          </Typography.Text>
        </Descriptions.Item>
      </Descriptions>

      <div className="marking-register-panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <h2>Block lines</h2>
        </div>
        <div style={{ padding: 12 }}>
          <Table<BlockRow>
            className="mk-block-lines-table"
            size="small"
            rowKey="id"
            pagination={false}
            tableLayout="fixed"
            showSorterTooltip={false}
            scroll={{ x: canEdit ? snoW + colW * 8 + 48 : snoW + colW * 8 }}
            dataSource={rows}
            columns={columns}
            summary={() => {
              const rest = canEdit ? 3 : 2
              return (
                <>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4}>
                      <Typography.Text strong>Gross total</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <Typography.Text strong>{formatCbm(batch.cbm)}</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} />
                    <Table.Summary.Cell index={6} align="right">
                      <Typography.Text strong>{money(batch.gross)}</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} colSpan={rest} />
                  </Table.Summary.Row>
                  {gstType === 'intra' && (
                    <>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={6} align="right">
                          CGST {formatGstRate(gstPct / 2)}%
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6} align="right">
                          {money(gstSplit.cgst)}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={7} colSpan={rest} />
                      </Table.Summary.Row>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={6} align="right">
                          SGST {formatGstRate(gstPct / 2)}%
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6} align="right">
                          {money(gstSplit.sgst)}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={7} colSpan={rest} />
                      </Table.Summary.Row>
                    </>
                  )}
                  {gstType === 'igst' && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">
                        IGST {formatGstRate(gstPct)}%
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} align="right">
                        {money(batch.gstAmt)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} colSpan={rest} />
                    </Table.Summary.Row>
                  )}
                  {gstType === 'gst' && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">
                        GST {formatGstRate(gstPct)}%
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} align="right">
                        {money(batch.gstAmt)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} colSpan={rest} />
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={6} align="right">
                      <Typography.Text strong>Final total</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right">
                      <Typography.Text strong style={{ color: '#389e0d' }}>
                        {money(batch.total)}
                      </Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} colSpan={rest} />
                  </Table.Summary.Row>
                </>
              )
            }}
          />
        </div>
      </div>

      <div className="marking-register-panel">
        <div className="panel-head">
          <h2>Payments</h2>
          {canEdit && balance > 0.5 && (
            <Button size="small" type="primary" onClick={() => setPayOpen(true)}>
              Receive payment
            </Button>
          )}
        </div>
        <div style={{ padding: 12 }}>
          {payments.length === 0 ? (
            <div className="empty">No payments yet — receive full or partial against this invoice.</div>
          ) : (
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={payments}
              columns={[
                { title: 'Date', dataIndex: 'date', key: 'date', width: 120 },
                {
                  title: 'Payment type',
                  dataIndex: 'paymentMethod',
                  key: 'paymentMethod',
                  width: 100,
                  render: (value?: string | null) => value || '—',
                },
                {
                  title: 'Amount',
                  dataIndex: 'credit',
                  key: 'credit',
                  align: 'right' as const,
                  width: 120,
                  render: (value: number) => money(value),
                },
                { title: 'Particulars', dataIndex: 'particulars', key: 'particulars' },
                ...(canEdit
                  ? [
                      {
                        title: '',
                        key: 'actions',
                        width: 80,
                        render: (_: unknown, row: (typeof payments)[0]) => (
                          <Button
                            type="link"
                            danger
                            size="small"
                            onClick={() => {
                              Modal.confirm({
                                title: 'Delete this receipt?',
                                okText: 'Delete',
                                okButtonProps: { danger: true },
                                onOk: async () => {
                                  await deleteTransaction(row.id)
                                  message.success('Receipt removed')
                                },
                              })
                            }}
                          >
                            Delete
                          </Button>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </div>
      </div>

      {payOpen && activeQuarry && (
        <ReceivePaymentModal open quarryId={activeQuarry.id} batch={batch} onClose={() => setPayOpen(false)} />
      )}
    </div>
  )
}
