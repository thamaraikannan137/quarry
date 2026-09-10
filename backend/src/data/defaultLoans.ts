import { Loan } from '../db/models/Loan.js'

/** From the Chithanavasal prototype EMI due board (Sriram Finance due chat). */
export const DEFAULT_LOANS = [
  { id: 'ln1', vehicleNo: 'Lorry-TN88H8977', borrower: 'Sibi', loanNo: 'MELRB-2601230002', informDay: 3, dueDay: 5, bank: 'FEDRAL', emiAmount: 91144 },
  { id: 'ln2', vehicleNo: 'PRD-500', borrower: 'Arun', loanNo: 'MELRB-2412230004', informDay: 3, dueDay: 5, bank: 'CUB', emiAmount: 111868 },
  { id: 'ln3', vehicleNo: 'Car- High cross', borrower: 'Arun', loanNo: 'MELRB-2303090005', informDay: 8, dueDay: 10, bank: 'AXIS', emiAmount: 57000 },
  { id: 'ln4', vehicleNo: 'Lorry-TN28BK7378', borrower: 'Rishi', loanNo: 'MELRB-2602120001', informDay: 7, dueDay: 10, bank: 'TMB', emiAmount: 91332 },
  { id: 'ln5', vehicleNo: 'Kobalco-380', borrower: 'Rishi', loanNo: 'MELRB-2601230005', informDay: 7, dueDay: 10, bank: 'TMB', emiAmount: 188193 },
  { id: 'ln6', vehicleNo: 'Hittachi-370', borrower: 'Arun', loanNo: 'MELRB-2511210002', informDay: 7, dueDay: 10, bank: 'CUB', emiAmount: 154164 },
  { id: 'ln7', vehicleNo: 'PRD-250', borrower: 'Arun', loanNo: 'MELRB-2511210003', informDay: 7, dueDay: 10, bank: 'CUB', emiAmount: 90536 },
  { id: 'ln8', vehicleNo: 'Hittachi-370 New', borrower: 'Kumar Stone', loanNo: 'MELRB-2602270005', informDay: 13, dueDay: 15, bank: 'TMB', emiAmount: 267571 },
  { id: 'ln9', vehicleNo: 'Lorry-TN88L2691', borrower: 'Sibi', loanNo: 'MELRB-2607150002', informDay: 13, dueDay: 15, bank: 'FEDRAL', emiAmount: 95500 },
  { id: 'ln10', vehicleNo: 'Car', borrower: 'MKB- Appa', loanNo: 'Sbi', informDay: 13, dueDay: 15, bank: 'TMB', emiAmount: 56000 },
  { id: 'ln11', vehicleNo: 'Business- Loan', borrower: 'Arun', loanNo: 'MELRBTF-2505300001', informDay: 18, dueDay: 20, bank: 'CUB', emiAmount: 512000 },
  { id: 'ln12', vehicleNo: 'Car', borrower: 'Saravanapriya', loanNo: 'Bank Of India', informDay: 23, dueDay: 25, bank: 'HDFC', emiAmount: 66000 },
  { id: 'ln13', vehicleNo: 'Housing Loan', borrower: 'Arun', loanNo: 'Lvb', informDay: 3, dueDay: 5, bank: 'LVB', emiAmount: 30000 },
] as const

const DEFAULT_QUARRY_ID = 'q_chitha'

export async function ensureDefaultLoans() {
  const existing = await Loan.findAll({ attributes: ['id'] })
  const have = new Set(existing.map((row) => row.id))
  for (const row of DEFAULT_LOANS) {
    if (have.has(row.id)) continue
    await Loan.create({ ...row, quarryId: DEFAULT_QUARRY_ID, active: true })
  }

  // Older seeded rows may predate quarry scoping
  await Loan.update(
    { quarryId: DEFAULT_QUARRY_ID },
    { where: { quarryId: null as unknown as string } },
  ).catch(() => undefined)

  for (const row of DEFAULT_LOANS) {
    const loan = await Loan.findByPk(row.id)
    if (loan && !loan.quarryId) {
      await loan.update({ quarryId: DEFAULT_QUARRY_ID })
    }
  }
}
