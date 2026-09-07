import { Op } from 'sequelize'
import { Router } from 'express'
import { z } from 'zod'

import { AttendanceMark, Quarry, Staff } from '../db/models/index.js'
import { asyncHandler, badRequest, notFound } from '../lib/http.js'

export const attendanceRouter = Router()

const INPUT_STATUSES = ['Present', 'Absent', 'HalfDay', 'Holiday'] as const

function normalizeStatus(status: string | null) {
  if (!status) return null
  if (status === 'Holiday') return 'HalfDay'
  if (status === 'Present' || status === 'Absent' || status === 'HalfDay') return status
  return null
}

function daysInMonth(month: string) {
  const [year, mon] = month.split('-').map(Number)
  return new Date(year, mon, 0).getDate()
}

function monthRange(month: string) {
  const last = daysInMonth(month)
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}`, days: last }
}

attendanceRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const quarryId = typeof req.query.quarryId === 'string' ? req.query.quarryId : ''
    const monthRaw = typeof req.query.month === 'string' ? req.query.month : ''
    const month = /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : ''

    if (!quarryId) return badRequest(res, 'quarryId is required')
    if (!month) return badRequest(res, 'month is required (YYYY-MM)')

    const quarry = await Quarry.findByPk(quarryId)
    if (!quarry) return notFound(res, 'Quarry not found')

    const { from, to, days } = monthRange(month)
    const marks = await AttendanceMark.findAll({
      where: {
        quarryId,
        date: { [Op.between]: [from, to] },
      },
      order: [['date', 'ASC']],
    })

    res.json({
      quarryId,
      month,
      days,
      marks: marks.map((row) => {
        const json = row.toJSON()
        return { ...json, status: normalizeStatus(json.status) ?? json.status }
      }),
    })
  }),
)

const markSchema = z.object({
  quarryId: z.string().min(1),
  staffId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(INPUT_STATUSES).nullable(),
})

attendanceRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = markSchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    const { quarryId, staffId, date } = parsed.data
    const status = normalizeStatus(parsed.data.status)
    const quarry = await Quarry.findByPk(quarryId)
    if (!quarry) return badRequest(res, 'Invalid quarryId')
    const staff = await Staff.findByPk(staffId)
    if (!staff || staff.quarryId !== quarryId) return badRequest(res, 'Invalid staffId')

    const existing = await AttendanceMark.findOne({ where: { staffId, date } })
    if (!status) {
      if (existing) await existing.destroy()
      return res.json({ staffId, date, status: null })
    }

    if (existing) {
      await existing.update({ status, quarryId })
      return res.json(existing)
    }

    const created = await AttendanceMark.create({ quarryId, staffId, date, status })
    res.status(201).json(created)
  }),
)

const daySchema = z.object({
  quarryId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(INPUT_STATUSES),
})

attendanceRouter.put(
  '/day',
  asyncHandler(async (req, res) => {
    const parsed = daySchema.safeParse(req.body)
    if (!parsed.success) return badRequest(res, parsed.error.message)

    const { quarryId, date } = parsed.data
    const status = normalizeStatus(parsed.data.status)
    if (!status) return badRequest(res, 'Invalid status')
    const quarry = await Quarry.findByPk(quarryId)
    if (!quarry) return badRequest(res, 'Invalid quarryId')

    const staffRows = await Staff.findAll({
      where: { quarryId, kind: 'Staff', status: 'Active' },
    })

    const saved = []
    for (const person of staffRows) {
      const existing = await AttendanceMark.findOne({ where: { staffId: person.id, date } })
      if (existing) {
        await existing.update({ status, quarryId })
        saved.push(existing)
      } else {
        saved.push(await AttendanceMark.create({ quarryId, staffId: person.id, date, status }))
      }
    }

    res.json({ date, status, count: saved.length, marks: saved })
  }),
)
