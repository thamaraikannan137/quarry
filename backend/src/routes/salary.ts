import { Op } from 'sequelize'
import { Router } from 'express'

import { AttendanceMark, Quarry, Staff, Transaction } from '../db/models/index.js'
import { asyncHandler, badRequest, notFound } from '../lib/http.js'
import {
  SALARY_MONTH_DAYS,
  earnedSalary,
  isSalaryAdvanceHead,
  isSalaryPayoutHead,
  monthRange,
  payStatus,
  workDayValue,
} from '../lib/payroll.js'

export const salaryRouter = Router()

salaryRouter.get(
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
    const [staffRows, marks, txns] = await Promise.all([
      Staff.findAll({
        where: { quarryId, kind: 'Staff' },
        order: [
          ['status', 'ASC'],
          ['name', 'ASC'],
        ],
      }),
      AttendanceMark.findAll({
        where: { quarryId, date: { [Op.between]: [from, to] } },
      }),
      Transaction.findAll({
        where: {
          quarryId,
          type: 'Debit',
          date: { [Op.between]: [from, to] },
        },
      }),
    ])

    const presentByStaff = new Map<string, number>()
    const halfByStaff = new Map<string, number>()
    const absentByStaff = new Map<string, number>()
    const workByStaff = new Map<string, number>()
    const markedIds = new Set<string>()

    for (const row of marks) {
      markedIds.add(row.staffId)
      const status = row.status
      presentByStaff.set(row.staffId, (presentByStaff.get(row.staffId) ?? 0) + (status === 'Present' ? 1 : 0))
      halfByStaff.set(
        row.staffId,
        (halfByStaff.get(row.staffId) ?? 0) + (status === 'HalfDay' || status === 'Holiday' ? 1 : 0),
      )
      absentByStaff.set(row.staffId, (absentByStaff.get(row.staffId) ?? 0) + (status === 'Absent' ? 1 : 0))
      workByStaff.set(row.staffId, (workByStaff.get(row.staffId) ?? 0) + workDayValue(status))
    }

    const advanceByStaff = new Map<string, number>()
    const paidByStaff = new Map<string, number>()
    const linkedIds = new Set<string>()

    for (const row of txns) {
      if (!row.personId) continue
      if (isSalaryAdvanceHead(row.head)) {
        linkedIds.add(row.personId)
        advanceByStaff.set(row.personId, (advanceByStaff.get(row.personId) ?? 0) + (Number(row.debit) || 0))
      } else if (isSalaryPayoutHead(row.head)) {
        linkedIds.add(row.personId)
        paidByStaff.set(row.personId, (paidByStaff.get(row.personId) ?? 0) + (Number(row.debit) || 0))
      }
    }

    const people = staffRows.filter(
      (person) => person.status === 'Active' || markedIds.has(person.id) || linkedIds.has(person.id),
    )

    const rows = people.map((person, index) => {
      const workDays = workByStaff.get(person.id) ?? 0
      const salary = earnedSalary(Number(person.basicSalary) || 0, workDays)
      const advance = advanceByStaff.get(person.id) ?? 0
      const netSalary = salary - advance
      const salaryPaid = paidByStaff.get(person.id) ?? 0
      const due = Math.max(0, netSalary - salaryPaid)
      const status = payStatus(netSalary, salaryPaid)

      return {
        sno: index + 1,
        staffId: person.id,
        name: person.name,
        designation: person.designation,
        staffStatus: person.status,
        basicSalary: Number(person.basicSalary) || 0,
        present: presentByStaff.get(person.id) ?? 0,
        halfDays: halfByStaff.get(person.id) ?? 0,
        absent: absentByStaff.get(person.id) ?? 0,
        workDays,
        salary,
        advance,
        netSalary,
        salaryPaid,
        due,
        payStatus: status,
      }
    })

    const totals = rows.reduce(
      (sum, row) => ({
        workDays: sum.workDays + row.workDays,
        salary: sum.salary + row.salary,
        advance: sum.advance + row.advance,
        netSalary: sum.netSalary + row.netSalary,
        salaryPaid: sum.salaryPaid + row.salaryPaid,
        due: sum.due + row.due,
      }),
      { workDays: 0, salary: 0, advance: 0, netSalary: 0, salaryPaid: 0, due: 0 },
    )

    res.json({
      quarryId,
      month,
      days,
      salaryMonthDays: SALARY_MONTH_DAYS,
      rows,
      totals,
    })
  }),
)
