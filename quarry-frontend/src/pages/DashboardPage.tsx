import { ArrowRightOutlined, FallOutlined, RiseOutlined, SwapOutlined } from '@ant-design/icons'
import { Button, Card, Col, Empty, List, Row, Select, Space, Statistic, Tag, Typography, theme } from 'antd'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
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

import { useAuth } from '@/contexts/AuthContext'
import { useMarkings } from '@/contexts/MarkingsContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import type { Transaction } from '@/types/transaction'
import { formatCbm, volCbm } from '@/utils/marking'
import { money, monthKey, monthLabel } from '@/utils/money'

const CREDIT_COLOR = '#389e0d'
const DEBIT_COLOR = '#cf1322'
const PIE_COLORS = ['#1677ff', '#13c2c2', '#fa8c16', '#722ed1', '#eb2f96', '#52c41a', '#faad14', '#2f54eb']

function formatDate(value: string) {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD MMM YYYY') : value
}

function compactMoney(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`
  return money(value)
}

type MonthBucket = {
  key: string
  label: string
  debit: number
  credit: number
}

type CategoryBucket = {
  name: string
  value: number
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
  const { transactions } = useTransactions()
  const { markingsForQuarry } = useMarkings()
  const canEdit = user?.role !== 'Viewer'
  const [month, setMonth] = useState('all')

  const quarryRows = useMemo(
    () => transactions.filter((row) => row.quarryId === activeQuarry?.id),
    [transactions, activeQuarry?.id],
  )

  const quarryMarkings = useMemo(
    () => markingsForQuarry(activeQuarry?.id),
    [markingsForQuarry, activeQuarry?.id],
  )

  const months = useMemo(
    () => [...new Set(quarryRows.map((row) => monthKey(row.date)))].sort().reverse(),
    [quarryRows],
  )

  const filtered = useMemo(() => {
    if (month === 'all') return quarryRows
    return quarryRows.filter((row) => monthKey(row.date) === month)
  }, [quarryRows, month])

  const debit = filtered.reduce((sum, row) => sum + row.debit, 0)
  const credit = filtered.reduce((sum, row) => sum + row.credit, 0)
  const balance = credit - debit

  const monthlyFlow = useMemo(() => {
    const map = new Map<string, MonthBucket>()
    for (const row of quarryRows) {
      const key = monthKey(row.date)
      const current = map.get(key) ?? { key, label: monthLabel(key), debit: 0, credit: 0 }
      current.debit += row.debit
      current.credit += row.credit
      map.set(key, current)
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
  }, [quarryRows])

  const categories = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of filtered) {
      if (!row.debit) continue
      map.set(row.head || 'Other', (map.get(row.head || 'Other') ?? 0) + row.debit)
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }) satisfies CategoryBucket)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [filtered])

  const categoryTotal = categories.reduce((sum, item) => sum + item.value, 0)

  const recent = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => {
          const byDate = b.date.localeCompare(a.date)
          if (byDate) return byDate
          return b.id.localeCompare(a.id)
        })
        .slice(0, 8),
    [filtered],
  )

  const periodLabel = month === 'all' ? 'All months' : monthLabel(month)
  const axisColor = token.colorTextSecondary
  const gridColor = token.colorBorderSecondary

  const markingPeriod = useMemo(() => {
    const list =
      month === 'all' ? quarryMarkings : quarryMarkings.filter((row) => monthKey(row.date) === month)
    const cbm = list.reduce((sum, row) => sum + volCbm(row), 0)
    return { blocks: list.length, cbm }
  }, [quarryMarkings, month])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
        }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Dashboard
          </Typography.Title>
          <Typography.Text type="secondary">
            Cash overview for {activeQuarry?.name ?? 'this quarry'} · {user?.role}
          </Typography.Text>
        </div>
        <Space wrap>
          <Select
            style={{ minWidth: 160 }}
            value={month}
            onChange={setMonth}
            options={[
              { value: 'all', label: 'All months' },
              ...months.map((key) => ({ value: key, label: monthLabel(key) })),
            ]}
          />
          <Button type="primary" icon={<SwapOutlined />} onClick={() => navigate('/transactions')}>
            All Transactions
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Cash balance"
              value={balance}
              formatter={(value) => money(Number(value))}
              styles={{ content: { color: balance >= 0 ? CREDIT_COLOR : DEBIT_COLOR } }}
              prefix={balance >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {periodLabel}
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Debit / expenses"
              value={debit}
              formatter={(value) => money(Number(value))}
              styles={{ content: { color: DEBIT_COLOR } }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {filtered.filter((row) => row.debit > 0).length} debit vouchers
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Credit / receipts"
              value={credit}
              formatter={(value) => money(Number(value))}
              styles={{ content: { color: CREDIT_COLOR } }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {filtered.filter((row) => row.credit > 0).length} credit vouchers
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Entries"
              value={filtered.length}
              suffix={<Typography.Text type="secondary">of {quarryRows.length}</Typography.Text>}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {periodLabel}
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
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
          <Card title="Production snapshot">
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Statistic title="Blocks marked" value={markingPeriod.blocks} />
              </Col>
              <Col span={12}>
                <Statistic title="Total CBM" value={Number(formatCbm(markingPeriod.cbm))} precision={3} />
              </Col>
            </Row>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              From Block Marking for {periodLabel}. Sale receipts and HR counts come in later phases.
            </Typography.Paragraph>
            <Space orientation="vertical" style={{ width: '100%' }} size={8}>
              <Button block type="primary" onClick={() => navigate('/marking')}>
                Open Block Marking
              </Button>
              <Button block onClick={() => navigate('/reports')}>
                Reports / P&amp;L (soon)
              </Button>
              {canEdit && (
                <Button block onClick={() => navigate('/transactions')}>
                  Go to cash book
                </Button>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
