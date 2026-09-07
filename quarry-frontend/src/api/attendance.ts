import { api } from '@/api/http'
import {
  normalizeAttendanceStatus,
  type AttendanceMark,
  type AttendanceMonth,
  type AttendanceStatus,
} from '@/types/attendance'
import { isoDateOnly } from '@/utils/money'

type ApiMark = AttendanceMark & { status: string }

function fromMark(row: ApiMark): AttendanceMark {
  return {
    id: row.id,
    quarryId: row.quarryId,
    staffId: row.staffId,
    date: isoDateOnly(row.date),
    status: normalizeAttendanceStatus(row.status),
  }
}

export async function listAttendance(quarryId: string, month: string) {
  const payload = await api<AttendanceMonth>(
    `/api/attendance?quarryId=${encodeURIComponent(quarryId)}&month=${encodeURIComponent(month)}`,
  )
  return {
    ...payload,
    marks: (payload.marks ?? []).map((row) => fromMark(row as ApiMark)),
  }
}

export async function saveAttendanceMark(input: {
  quarryId: string
  staffId: string
  date: string
  status: AttendanceStatus | null
}) {
  const row = await api<ApiMark>('/api/attendance', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return fromMark(row)
}

export async function markAttendanceDay(input: {
  quarryId: string
  date: string
  status: AttendanceStatus
}) {
  const payload = await api<{ date: string; status: AttendanceStatus; count: number; marks: ApiMark[] }>(
    '/api/attendance/day',
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  )
  return {
    ...payload,
    marks: (payload.marks ?? []).map(fromMark),
  }
}
