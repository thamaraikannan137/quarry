export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'HalfDay'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export type AttendanceMark = {
  id?: string
  quarryId?: string
  staffId: string
  date: string
  status: AttendanceStatus | null
}

export type AttendanceMonth = {
  quarryId: string
  month: string
  days: number
  marks: AttendanceMark[]
}

export const ATTENDANCE_CYCLE: Array<AttendanceStatus | null> = [null, 'Present', 'Absent', 'HalfDay']

export const ATTENDANCE_CODE: Record<AttendanceStatus, string> = {
  Present: 'X',
  Absent: 'A',
  HalfDay: 'H',
}

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  Present: 'Present',
  Absent: 'Absent',
  HalfDay: 'Half-day',
}

export function normalizeAttendanceStatus(status: string | null | undefined): AttendanceStatus | null {
  if (status === 'Present' || status === 'Absent' || status === 'HalfDay') return status
  if (status === 'Holiday') return 'HalfDay'
  return null
}

export function nextAttendanceStatus(current: AttendanceStatus | null): AttendanceStatus | null {
  const index = ATTENDANCE_CYCLE.indexOf(current)
  return ATTENDANCE_CYCLE[(index + 1) % ATTENDANCE_CYCLE.length] ?? null
}

export function markKey(staffId: string, date: string) {
  return `${staffId}:${date}`
}

export function workDayValue(status: AttendanceStatus | null | undefined) {
  if (status === 'Present') return 1
  if (status === 'HalfDay') return 0.5
  return 0
}

export function formatWorkDays(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
