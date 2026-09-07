import { Button, Card, Col, DatePicker, Row, Space, Spin, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { errorMessage } from '@/api/http'
import { listAttendance, markAttendanceDay, saveAttendanceMark } from '@/api/attendance'
import { StatCard, TableCard } from '@/components/common'
import { useAuth } from '@/contexts/AuthContext'
import { useStaff } from '@/contexts/StaffContext'
import {
  ATTENDANCE_CODE,
  ATTENDANCE_LABEL,
  formatWorkDays,
  markKey,
  nextAttendanceStatus,
  workDayValue,
  type AttendanceMark,
  type AttendanceStatus,
} from '@/types/attendance'
import type { Staff } from '@/types/staff'
import { todayISO } from '@/utils/money'

import '@/styles/attendance.css'
import '@/styles/marking.css'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type RosterRow = Staff & {
  present: number
  absent: number
  halfDays: number
  workDays: number
}

function padDay(month: string, day: number) {
  return `${month}-${String(day).padStart(2, '0')}`
}

function statusClass(status: AttendanceStatus | null) {
  if (status === 'Present') return 'is-present'
  if (status === 'Absent') return 'is-absent'
  if (status === 'HalfDay') return 'is-halfday'
  return ''
}

export function AttendancePage() {
  const { user, activeQuarry } = useAuth()
  const { staffForQuarry, loading: staffLoading } = useStaff()
  const canEdit = user?.role !== 'Viewer'
  const quarryId = activeQuarry?.id
  const today = todayISO()

  const [month, setMonth] = useState(today.slice(0, 7))
  const [marks, setMarks] = useState<AttendanceMark[]>([])
  const [days, setDays] = useState(dayjs(`${today.slice(0, 7)}-01`).daysInMonth())
  const [loading, setLoading] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!quarryId) return
    setLoading(true)
    try {
      const payload = await listAttendance(quarryId, month)
      setMarks(payload.marks)
      setDays(payload.days)
    } catch (error) {
      message.error(errorMessage(error, 'Could not load attendance') ?? 'Could not load attendance')
    } finally {
      setLoading(false)
    }
  }, [quarryId, month])

  useEffect(() => {
    void reload()
  }, [reload])

  const markMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus | null>()
    for (const row of marks) map.set(markKey(row.staffId, row.date), row.status)
    return map
  }, [marks])

  const roster = useMemo(() => {
    const people = staffForQuarry(quarryId)
    const markedIds = new Set(marks.map((row) => row.staffId))
    return people.filter((person) => person.status === 'Active' || markedIds.has(person.id))
  }, [staffForQuarry, quarryId, marks])

  const rows: RosterRow[] = useMemo(
    () =>
      roster.map((person) => {
        let present = 0
        let absent = 0
        let halfDays = 0
        let workDays = 0
        for (let day = 1; day <= days; day += 1) {
          const status = markMap.get(markKey(person.id, padDay(month, day))) ?? null
          if (status === 'Present') present += 1
          if (status === 'Absent') absent += 1
          if (status === 'HalfDay') halfDays += 1
          workDays += workDayValue(status)
        }
        return { ...person, present, absent, halfDays, workDays }
      }),
    [roster, days, markMap, month],
  )

  const todayInMonth = today.startsWith(month)
  const presentToday = todayInMonth
    ? roster.filter((person) => markMap.get(markKey(person.id, today)) === 'Present').length
    : 0
  const absentToday = todayInMonth
    ? roster.filter((person) => markMap.get(markKey(person.id, today)) === 'Absent').length
    : 0
  const unmarkedToday = todayInMonth
    ? roster.filter((person) => person.status === 'Active' && !markMap.get(markKey(person.id, today))).length
    : 0

  const setCell = useCallback(
    async (staffId: string, date: string, status: AttendanceStatus | null) => {
      if (!quarryId) return
      const previous = marks
      setMarks((current) => {
        const next = current.filter((row) => !(row.staffId === staffId && row.date === date))
        if (status) next.push({ staffId, date, status, quarryId })
        return next
      })
      setSavingKey(markKey(staffId, date))
      try {
        await saveAttendanceMark({ quarryId, staffId, date, status })
      } catch (error) {
        setMarks(previous)
        message.error(errorMessage(error, 'Could not save attendance') ?? 'Could not save attendance')
      } finally {
        setSavingKey(null)
      }
    },
    [quarryId, marks],
  )

  const columns: ColumnsType<RosterRow> = useMemo(() => {
    const dayCols: ColumnsType<RosterRow> = []
    for (let day = 1; day <= days; day += 1) {
      const date = padDay(month, day)
      const weekday = dayjs(date).day()
      const isSunday = weekday === 0
      const isToday = date === today
      dayCols.push({
        title: (
          <div className="attendance-day-head">
            <span>{day}</span>
            <span className="dow">{WEEKDAYS[weekday]}</span>
          </div>
        ),
        key: date,
        width: 36,
        align: 'center',
        className: isSunday ? 'is-sunday' : undefined,
        render: (_value, record) => {
          const status = markMap.get(markKey(record.id, date)) ?? null
          return (
            <button
              type="button"
              className={`attendance-cell ${statusClass(status)} ${isToday ? 'is-today' : ''}`}
              disabled={!canEdit || savingKey === markKey(record.id, date)}
              title={status ? ATTENDANCE_LABEL[status] : 'Not marked — click to cycle X / A / H'}
              onClick={() => void setCell(record.id, date, nextAttendanceStatus(status))}
            >
              {status ? ATTENDANCE_CODE[status] : ''}
            </button>
          )
        },
      })
    }

    return [
      {
        title: 'Staff',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        width: 150,
        ellipsis: true,
        render: (value: string, record) => (
          <div>
            <Typography.Text strong ellipsis style={{ display: 'block', maxWidth: 140 }}>
              {value}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {record.designation || '—'}
            </Typography.Text>
          </div>
        ),
      },
      ...dayCols,
      {
        title: 'Days',
        dataIndex: 'workDays',
        key: 'workDays',
        fixed: 'right',
        width: 56,
        align: 'center',
        render: (value: number) => <Typography.Text strong>{formatWorkDays(value)}</Typography.Text>,
      },
    ]
  }, [days, month, today, markMap, canEdit, savingKey, setCell])

  if (!activeQuarry) {
    return <Card>Select a quarry to mark attendance.</Card>
  }

  return (
    <div className="marking-page">
      <div className="page-head">
        <div>
          <h1>Attendance</h1>
          <p>Daily register for {activeQuarry.name} — X present, A absent, H half-day (0.5).</p>
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
          {canEdit && todayInMonth ? (
            <Button
              type="primary"
              onClick={async () => {
                try {
                  const saved = await markAttendanceDay({
                    quarryId: activeQuarry.id,
                    date: today,
                    status: 'Present',
                  })
                  setMarks((current) => {
                    const others = current.filter((row) => row.date !== today)
                    return [...others, ...saved.marks]
                  })
                  message.success(`Marked ${saved.count} staff present today`)
                } catch (error) {
                  message.error(errorMessage(error, 'Could not mark today') ?? 'Could not mark today')
                }
              }}
            >
              Mark today present
            </Button>
          ) : null}
        </Space>
      </div>

      <Row gutter={[12, 12]} className="page-stats-row">
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title="Staff on register" value={rows.length} />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard
            title={todayInMonth ? 'Present today' : 'Work days'}
            value={todayInMonth ? presentToday : rows.reduce((sum, row) => sum + row.workDays, 0)}
          />
        </Col>
        <Col xs={12} sm={8} flex="1 1 140px">
          <StatCard title={todayInMonth ? 'Absent today' : 'Absences'} value={todayInMonth ? absentToday : rows.reduce((sum, row) => sum + row.absent, 0)} />
        </Col>
        {todayInMonth ? (
          <Col xs={12} sm={8} flex="1 1 140px">
            <StatCard title="Unmarked today" value={unmarkedToday} />
          </Col>
        ) : null}
      </Row>

      <TableCard
        title={`${dayjs(`${month}-01`).format('MMMM YYYY')} register`}
        extra={
          <div className="attendance-legend">
            <span>
              <b className="attendance-cell is-present">X</b> Present
            </span>
            <span>
              <b className="attendance-cell is-absent">A</b> Absent
            </span>
            <span>
              <b className="attendance-cell is-halfday">H</b> Half-day (0.5)
            </span>
            <span>Click a cell to cycle</span>
          </div>
        }
      >
        <Spin spinning={loading || staffLoading}>
          {rows.length === 0 ? (
            <Typography.Text type="secondary">No staff yet. Add people in Staff Management first.</Typography.Text>
          ) : (
            <Table<RosterRow>
              className="attendance-register"
              rowKey="id"
              size="small"
              pagination={false}
              columns={columns}
              dataSource={rows}
              scroll={{ x: 150 + days * 36 + 56, y: 520 }}
              sticky
            />
          )}
        </Spin>
      </TableCard>
    </div>
  )
}
