import { ArrowRightOutlined, FallOutlined, RiseOutlined, SwapOutlined, WalletOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Empty, List, Row, Select, Space, Spin, Statistic, Tag, Typography, theme } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { errorMessage } from '@/api/http'
import { getDashboard, type DashboardPayload } from '@/api/dashboard'
import { useAuth } from '@/contexts/AuthContext'
import type { Transaction } from '@/types/transaction'
import { formatDate, money, monthLabel, todayISO } from '@/utils/money'

import '@/styles/marking.css'

const CREDIT_COLOR = '#389e0d'
const DEBIT_COLOR = '#cf1322'
const LEDGER_COLOR = '#d48806'
const PIE_COLORS = ['#1677ff', '#13c2c2', '#fa8c16', '#722ed1', '#eb2f96', '#52c41a', '#faad14', '#2f54eb']

const EMPTY_DASHBOARD: DashboardPayload = {
  quarryId: '',
  quarryName: '',
  month: 'all',
  periodLabel: 'All months',
  months: [],
  summary: {
    balance: 0,
    debit: 0,
    credit: 0,
    debitCount: 0,
    creditCount: 0,
    entries: 0,
    totalEntries: 0,
    inLedgers: 0,
  },
  ledgers: {
    openCount: 0,
    in: 0,
    out: 0,
    balance: 0,
    holders: [],
  },
  monthlyFlow: [],
  categories: [],
  recent: [],
  production: { blocks: 0, cbm: 0 },
}

function compactMoney(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`
  return money(value)
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.96)',
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
      }}
    >
      {label ? (
        <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
          {label}
        </Typography.Text>
      ) : null}
      {payload.map((entry) => (
        <div key={String(entry.name)} style={{ color: entry.color, fontSize: 12 }}>
          {entry.name}: {money(Number(entry.value ?? 0))}
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const canEdit = user?.role !== 'Viewer'
  const [month, setMonth] = useState(() => todayISO().slice(0, 7))
  const [data, setData] = useState<DashboardPayload>(EMPTY_DASHBOARD)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeQuarry?.id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getDashboard(activeQuarry.id, month)
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Could not load dashboard') ?? 'Could not load dashboard')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeQuarry?.id, month])

  const debit = data.summary.debit
  const credit = data.summary.credit
  const balance = data.summary.balance
  const inLedgers = data.summary.inLedgers
  const ledgers = data.ledgers
  const monthlyFlow = data.monthlyFlow
  const categories = data.categories
  const categoryTotal = categories.reduce((sum, item) => sum + item.value, 0)
  const recent = data.recent
  const periodLabel = data.periodLabel
  const axisColor = token.colorTextSecondary
  const gridColor = token.colorBorderSecondary
  const markingPeriod = data.production
  const monthOptions = [
    { value: 'all', label: 'All months' },
    ...(month !== 'all' && !data.months.some((item) => item.key === month)
      ? [{ value: month, label: monthLabel(month) }]
      : []),
    ...data.months.map((item) => ({ value: item.key, label: item.label })),
  ]

  return (
    <Spin spinning={loading}>
      <div className="marking-page">
        {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
        <div className="page-head">
          <div>
            <h1>Dashboard</h1>
            <Typography.Text type="secondary">
              {activeQuarry?.name ?? 'This quarry'} · {periodLabel}
            </Typography.Text>
          </div>
          <Space wrap>
            <Select style={{ minWidth: 160 }} value={month} onChange={setMonth} options={monthOptions} />
            <Button icon={<WalletOutlined />} onClick={() => navigate('/ledger')}>
              Ledger
            </Button>
            <Button type="primary" icon={<SwapOutlined />} onClick={() => navigate('/transactions')}>
              All Transactions
            </Button>
          </Space>
        </div>

        <Row gutter={[12, 12]} className="page-stats-row">
          <Col xs={12} sm={8} flex="1 1 140px">
            <Card size="small">
              <Statistic
                title="Credit"
                value={credit}
                formatter={(value) => money(Number(value))}
                styles={{ content: { color: CREDIT_COLOR } }}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {data.summary.creditCount} vouchers
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={12} sm={8} flex="1 1 140px">
            <Card size="small">
              <Statistic
                title="Debit"
                value={debit}
                formatter={(value) => money(Number(value))}
                styles={{ content: { color: DEBIT_COLOR } }}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {data.summary.debitCount} vouchers
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={12} sm={8} flex="1 1 140px">
            <Card size="small">
              <Statistic
                title="Balance"
                value={balance}
                formatter={(value) => money(Number(value))}
                styles={{ content: { color: balance >= 0 ? CREDIT_COLOR : DEBIT_COLOR } }}
                prefix={balance >= 0 ? <RiseOutlined /> : <FallOutlined />}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Cash book
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={12} sm={8} flex="1 1 140px">
            <Card size="small">
              <Statistic
                title="In ledgers"
                value={inLedgers}
                formatter={(value) => money(Number(value))}
                styles={{ content: { color: inLedgers > 0.5 ? LEDGER_COLOR : CREDIT_COLOR } }}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {ledgers.openCount} open · {periodLabel === 'All months' ? 'current' : 'open balances'}
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={12} sm={8} flex="1 1 140px">
            <Card size="small">
              <Statistic
                title="Entries"
                value={data.summary.entries}
                suffix={<Typography.Text type="secondary">of {data.summary.totalEntries}</Typography.Text>}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {periodLabel}
              </Typography.Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16, marginTop: 16 }}>
          <Col xs={24} lg={14}>
            <Card
              title="Monthly cash flow"
              extra={<Typography.Text type="secondary">Credit vs Debit</Typography.Text>}
            >
              {monthlyFlow.length === 0 ? (
                <Empty description="No vouchers yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={monthlyFlow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tickFormatter={compactMoney}
                        tick={{ fill: axisColor, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={56}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: token.colorFillSecondary }} />
                      <Legend />
                      <Bar dataKey="credit" name="Credit" fill={CREDIT_COLOR} radius={[6, 6, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="debit" name="Debit" fill={DEBIT_COLOR} radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="Expense by category" extra={<Typography.Text type="secondary">{periodLabel}</Typography.Text>}>
              {categories.length === 0 ? (
                <Empty description="No debit expenses" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categories}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={100}
                        paddingAngle={2}
                        stroke={token.colorBgContainer}
                        strokeWidth={2}
                      >
                        {categories.map((item, index) => (
                          <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: 12, maxWidth: 140 }}
                        formatter={(value) => {
                          const row = categories.find((item) => item.name === value)
                          const pct = row && categoryTotal ? Math.round((row.value / categoryTotal) * 100) : 0
                          return `${value} (${pct}%)`
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card
              title="Recent transactions"
              extra={
                <Link to="/transactions">
                  View all <ArrowRightOutlined />
                </Link>
              }
            >
              {recent.length === 0 ? (
                <Empty description="No entries for this period" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                  {canEdit ? (
                    <Button type="primary" onClick={() => navigate('/transactions')}>
                      Add first entry
                    </Button>
                  ) : null}
                </Empty>
              ) : (
                <List
                  itemLayout="horizontal"
                  dataSource={recent}
                  renderItem={(item: Transaction) => {
                    const isCredit = item.type === 'Credit'
                    const amount = isCredit ? item.credit : item.debit
                    return (
                      <List.Item
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/transactions')}
                        actions={[
                          <Typography.Text
                            key="amt"
                            strong
                            type={isCredit ? undefined : 'danger'}
                            style={isCredit ? { color: CREDIT_COLOR } : undefined}
                          >
                            {isCredit ? '+' : '−'}
                            {money(amount)}
                          </Typography.Text>,
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Space size={8} wrap>
                              <span>{item.particulars || item.head}</span>
                              <Tag color={isCredit ? 'success' : 'error'}>{item.type}</Tag>
                            </Space>
                          }
                          description={`${formatDate(item.date)} · ${item.head}`}
                        />
                      </List.Item>
                    )
                  }}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              <Card
                title="Open ledgers"
                extra={
                  <Link to="/ledger">
                    View all <ArrowRightOutlined />
                  </Link>
                }
              >
                <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                  <Col span={8}>
                    <Statistic title="Open" value={ledgers.openCount} />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="In"
                      value={ledgers.in}
                      formatter={(value) => money(Number(value))}
                      styles={{ content: { color: CREDIT_COLOR, fontSize: 18 } }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Balance"
                      value={ledgers.balance}
                      formatter={(value) => money(Number(value))}
                      styles={{ content: { color: ledgers.balance > 0.5 ? LEDGER_COLOR : CREDIT_COLOR, fontSize: 18 } }}
                    />
                  </Col>
                </Row>
                {ledgers.holders.length === 0 ? (
                  <Empty description="No open ledgers" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                    {canEdit ? (
                      <Button type="primary" onClick={() => navigate('/ledger')}>
                        Add ledger
                      </Button>
                    ) : null}
                  </Empty>
                ) : (
                  <List
                    size="small"
                    dataSource={ledgers.holders}
                    renderItem={(item) => (
                      <List.Item
                        style={{ cursor: 'pointer', paddingInline: 0 }}
                        onClick={() => navigate(`/ledger/${item.id}`)}
                        actions={[
                          <Typography.Text
                            key="bal"
                            strong
                            style={{ color: item.balance > 0.5 ? LEDGER_COLOR : CREDIT_COLOR }}
                          >
                            {money(item.balance)}
                          </Typography.Text>,
                        ]}
                      >
                        <List.Item.Meta
                          title={item.holderName}
                          description={`In ${money(item.in)} · Out ${money(item.out)}`}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>

              <Card title="Production snapshot">
                <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                  <Col span={12}>
                    <Statistic title="Blocks marked" value={markingPeriod.blocks} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Total CBM" value={markingPeriod.cbm} precision={3} />
                  </Col>
                </Row>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                  From Block Marking for {periodLabel}.
                </Typography.Paragraph>
                <Space orientation="vertical" style={{ width: '100%' }} size={8}>
                  <Button block type="primary" onClick={() => navigate('/marking')}>
                    Open Block Marking
                  </Button>
                  <Button block onClick={() => navigate('/reports')}>
                    Reports / P&amp;L (soon)
                  </Button>
                </Space>
              </Card>
            </Space>
          </Col>
        </Row>
      </div>
    </Spin>
  )
}
