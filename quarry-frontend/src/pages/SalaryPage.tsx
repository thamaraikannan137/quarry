import { Button, Card, Col, DatePicker, Row, Space, Spin, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { errorMessage } from '@/api/http'
import { listSalarySheet } from '@/api/salary'
import { StatCard, TableCard } from '@/components/common'
import { VoucherDialog } from '@/components/transactions/VoucherDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactions } from '@/contexts/TransactionsContext'
import type { SalaryPayStatus, SalaryRow, SalarySheet } from '@/types/salary'
import { formatWorkDays } from '@/types/attendance'
import { money, monthLabel, todayISO } from '@/utils/money'

import '@/styles/marking.css'

function emptyTotals(): SalarySheet['totals'] {
  return { workDays: 0, salary: 0, advance: 0, netSalary: 0, salaryPaid: 0, due: 0 }
}

function statusColor(status: SalaryPayStatus) {
  if (status === 'Paid') return 'success'
  if (status === 'Partial') return 'warning'
  if (status === 'Unpaid') return 'error'
  return 'default'
}

function statusLabel(status: SalaryPayStatus) {
  if (status === 'None') return '—'
  return status
}

export function SalaryPage() {
  const navigate = useNavigate()
  const { user, activeQuarry } = useAuth()
  const { addVoucher } = useTransactions()
  const canEdit = user?.role !== 'Viewer'
  const today = todayISO()

  const [month, setMonth] = useState(today.slice(0, 7))
  const [sheet, setSheet] = useState<SalarySheet | null>(null)
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState<SalaryRow | null>(null)

  const quarryId = activeQuarry?.id

  const reload = useCallback(async () => {
    if (!quarryId) return
    setLoading(true)
    try {
      setSheet(await listSalarySheet(quarryId, month))
    } catch (error) {
      message.error(errorMessage(error, 'Could not load salary sheet') ?? 'Could not load salary sheet')
    } finally {
      setLoading(false)
    }
  }, [quarryId, month])

  useEffect(() => {
    void reload()
  }, [reload])

  const rows = sheet?.rows ?? []
  const totals = sheet?.totals ?? emptyTotals()
  const monthTitle = dayjs(`${month}-01`).format('MMMM YYYY')

  const columns: ColumnsType<SalaryRow> = useMemo(
    () => [
      { title: '#', dataIndex: 'sno', key: 'sno', width: 48, align: 'center' },
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 160,
        ellipsis: true,
        render: (value: string, record) => (
          <div>
            <Typography.Text strong ellipsis style={{ display: 'block', maxWidth: 150 }}>
              {value}
            </Typography.Text>
            {record.staffStatus !== 'Active' ? (
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                Inactive
              </Typography.Text>
            ) : null}
          </div>
        ),
      },
      {
        title: 'Designation',
        dataIndex: 'designation',
        key: 'designation',
        width: 130,
        ellipsis: true,
        render: (value: string) => value || '—',
      },
      {
        title: 'Basic',
        dataIndex: 'basicSalary',
        key: 'basicSalary',
        width: 110,
        align: 'right',
        render: (value: number) => money(value),
      },
      {
        title: 'Days',
        dataIndex: 'workDays',
        key: 'workDays',
        width: 72,
        align: 'center',
        render: (value: number) => formatWorkDays(value),
      },
      {
        title: 'Salary',
        dataIndex: 'salary',
        key: 'salary',
        width: 120,
        align: 'right',
        render: (value: number) => money(value),
      },
      {
        title: 'Adv',
        dataIndex: 'advance',
        key: 'advance',
        width: 110,
        align: 'right',
        render: (value: number) => (value ? money(value) : '—'),
      },
      {
        title: 'Net',
        dataIndex: 'netSalary',
        key: 'netSalary',
        width: 120,
        align: 'right',
        render: (value: number) => (
          <Typography.Text strong type={value < 0 ? 'danger' : undefined}>
            {money(value)}
          </Typography.Text>
        ),
      },
      {
        title: 'Paid',
        dataIndex: 'salaryPaid',
        key: 'salaryPaid',
        width: 110,
        align: 'right',
        render: (value: number) => (value ? money(value) : '—'),
      },
      {
        title: 'Due',
        dataIndex: 'due',
        key: 'due',
        width: 110,
        align: 'right',
        render: (value: number) =>
          value >= 1 ? (
            <Typography.Text type="danger" strong>
              {money(value)}
            </Typography.Text>
          ) : (
            '—'
          ),
      },
      {
        title: 'Status',
        dataIndex: 'payStatus',
        key: 'payStatus',
        width: 100,
        render: (value: SalaryPayStatus) => <Tag color={statusColor(value)}>{statusLabel(value)}</Tag>,
      },
      ...(canEdit
        ? [
            {
              title: '',
              key: 'pay',
              width: 88,
              render: (_value: unknown, record: SalaryRow) =>
                record.due >= 1 ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation()
                      setPaying(record)
                    }}
                  >
                    Pay
                  </Button>
                ) : null,
            },
          ]
        : []),
    ],
    [canEdit],
  )

  if (!activeQuarry) {
    return <Card>Select a quarry to open the salary sheet.</Card>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <h1>Salary Sheet</h1>
          <p>
            {activeQuarry.name} — salary = basic × days / 30, less salary advances this month.{' '}
            <Link to="/attendance">Attendance</Link>
          </p>
        </div>
        <Space wrap>
          <DatePicker
            picker="month"
            value={dayjs(`${month}-01`)}
            format="MMM YYYY"
            allowClear={false}
            onChange={(value: Dayjs | null) => {
              if (value) setMonth(value.format('YYYY-MM'))
            }}
          />
        </Space>
      </div>

      <Row gutter={[12, 12]} className="page-stats-row">
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Staff" value={rows.length} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Gross salary" value={totals.salary} formatter={(value) => money(Number(value))} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Advances" value={totals.advance} formatter={(value) => money(Number(value))} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Net payable" value={totals.due} formatter={(value) => money(Number(value))} />
        </Col>
      </Row>

      <TableCard
        title={`${monthTitle} salary`}
        extra={
          totals.workDays === 0 && rows.length > 0 ? (
            <Typography.Text type="secondary">No attendance this month yet — days stay 0 until marked.</Typography.Text>
          ) : null
        }
      >
        <Spin spinning={loading}>
          {rows.length === 0 ? (
            <Typography.Text type="secondary">No staff yet. Add people in Staff Management first.</Typography.Text>
          ) : (
            <Table<SalaryRow>
              rowKey="staffId"
              size="small"
              pagination={false}
              columns={columns}
              dataSource={rows}
              scroll={{ x: 1280 }}
              onRow={(record) => ({
                onClick: () => navigate(`/staff/${record.staffId}`),
                style: { cursor: 'pointer' },
              })}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4}>
                      <Typography.Text strong>Total</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="center">
                      <Typography.Text strong>{formatWorkDays(totals.workDays)}</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <Typography.Text strong>{money(totals.salary)}</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right">
                      <Typography.Text strong>{money(totals.advance)}</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="right">
                      <Typography.Text strong>{money(totals.netSalary)}</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="right">
                      <Typography.Text strong>{money(totals.salaryPaid)}</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={9} align="right">
                      <Typography.Text strong>{money(totals.due)}</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={10} colSpan={canEdit ? 2 : 1} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          )}
        </Spin>
      </TableCard>

      {paying && (
        <VoucherDialog
          open
          type="Debit"
          quarryId={activeQuarry.id}
          quarryName={activeQuarry.name}
          heads={['Salary']}
          defaultHead="Salary"
          lockHead
          defaultPersonId={paying.staffId}
          lockPerson
          defaultAmount={Math.round(paying.due)}
          defaultParticulars={`Salary — ${paying.name} — ${monthLabel(month)}`}
          onClose={() => setPaying(null)}
          onSave={async (draft) => {
            await addVoucher(activeQuarry.id, 'Debit', {
              ...draft,
              head: 'Salary',
              personId: paying.staffId,
              labourId: null,
              particulars: draft.particulars.trim() || `Salary — ${paying.name} — ${monthLabel(month)}`,
            })
            message.success(`Salary saved for ${paying.name}`)
            await reload()
          }}
        />
      )}
    </div>
  )
}
