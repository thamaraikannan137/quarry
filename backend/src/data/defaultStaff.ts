import { Staff } from '../db/models/Staff.js'

/** Chithanavasal roster from STAFF SALARY DETAILS (July-26) + attendance. */
export const DEFAULT_STAFF = [
  { id: 's_ragul', name: 'P. Ragul', designation: 'Incharge', kind: 'Staff', basicSalary: 15000, quarryId: 'q_chitha' },
  { id: 's_selva', name: 'Selvakumar', designation: 'Pit Incharge', kind: 'Staff', basicSalary: 40000, quarryId: 'q_chitha' },
  { id: 's_arun', name: 'Arun', designation: 'Com/Op', kind: 'Staff', basicSalary: 17000, quarryId: 'q_chitha' },
  { id: 's_arunpoc', name: 'Arun Poc', designation: 'Poc/op', kind: 'Staff', basicSalary: 32000, quarryId: 'q_chitha' },
  { id: 's_chithra', name: 'Chithra', designation: 'Cook', kind: 'Staff', basicSalary: 12000, quarryId: 'q_chitha' },
  { id: 's_marikannu', name: 'Marikannu', designation: 'Cook', kind: 'Staff', basicSalary: 10000, quarryId: 'q_chitha' },
  { id: 's_bharathi', name: 'Bharathi', designation: 'PRD/op', kind: 'Staff', basicSalary: 30000, quarryId: 'q_chitha' },
  { id: 's_chandran', name: 'Chandran', designation: 'Welder', kind: 'Staff', basicSalary: 25000, quarryId: 'q_chitha' },
  { id: 's_thilak', name: 'Thilak', designation: 'WS.OP', kind: 'Staff', basicSalary: 32000, quarryId: 'q_chitha' },
  { id: 's_suresh', name: 'Suresh', designation: 'Crane Op', kind: 'Staff', basicSalary: 35000, quarryId: 'q_chitha' },
  { id: 's_thalapathi', name: 'Thalapathi', designation: 'Office', kind: 'Staff', basicSalary: 25000, quarryId: 'q_chitha' },
  { id: 's_rajesh', name: 'Rajesh', designation: 'WS.OP', kind: 'Staff', basicSalary: 0, quarryId: 'q_chitha' },
  { id: 's_vickram', name: 'Vickram Singh', designation: 'WS.OP', kind: 'Staff', basicSalary: 0, quarryId: 'q_chitha' },
] as const

export async function ensureDefaultStaff() {
  await Staff.destroy({ where: { kind: 'Worker' } })
  for (const row of DEFAULT_STAFF) {
    const existing = await Staff.findByPk(row.id)
    if (existing) continue
    await Staff.create({
      ...row,
      phone: '',
      bankName: '',
      accountNumber: '',
      ifsc: '',
      branch: '',
      status: 'Active',
      notes: '',
    })
  }
}
