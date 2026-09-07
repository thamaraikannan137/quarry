import { readFileSync } from 'node:fs'
import { Op } from 'sequelize'

import { BlockMarking, Party, Staff, Transaction, sequelize } from './db/models/index.js'

const QUARRY_ID = 'q_chitha'
const LABOUR_PULLU = 'g_pullu'

type ExcelRow = {
  excelRow: number
  date: string
  particulars: string
  debit: number | null
  credit: number | null
  head: string | null
}

const EXTRA_STAFF = [
  { id: 's_kadar', name: 'Kadar', designation: 'W/Helper', basicSalary: 22000 },
  { id: 's_blade', name: 'Blade Op', designation: 'Blade', basicSalary: 32000 },
  { id: 's_blade2', name: 'Blade Op 2', designation: 'Blade', basicSalary: 32000 },
  { id: 's_munaf', name: 'Munaf', designation: '', basicSalary: 0 },
] as const

function parseExcelDate(value: string) {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/.exec(value.trim())
  if (!match) return null
  const day = match[1].padStart(2, '0')
  const month = match[2].padStart(2, '0')
  const year = `20${match[3]}`
  return `${year}-${month}-${day}`
}

function mapHead(excelHead: string, particulars: string) {
  if (/pooja/i.test(particulars)) return 'Pooja'
  if (/eb\b/i.test(particulars) && /cool/i.test(particulars)) return 'EB / Electricity'
  const key = excelHead.trim().toLowerCase()
  if (key === 'diesal') return 'Diesel'
  if (key === 'mess') return 'Grocery / Food'
  if (key === 'travel') return 'Transport'
  if (key === 'salary adv') return 'Salary Advance'
  if (key === 'labour adv') return 'Labour Advance'
  if (key === 'labour payment') return 'Labour Wage'
  if (key === 'machinery') return 'Repair'
  if (key === 'others') return 'Other'
  if (key === 'prd bit') return 'Purchase'
  if (key === 'sriram due') return 'Finance / EMI'
  if (key === 'gift') return 'Monthly Gift'
  if (key === 'explosive') return 'Purchase'
  if (key === 'royality') return 'Royalty'
  if (key === 'machinery rent') return 'Machinery Rent'
  if (key === 'payment') return 'Cash Received'
  if (key === 'salary') return 'Salary'
  return excelHead.trim() || 'Other'
}

function litresFrom(particulars: string) {
  const match = /(\d+(?:\.\d+)?)\s*lit/i.exec(particulars)
  return match ? Number(match[1]) : null
}

function dieselVendor(particulars: string) {
  const match = /\(([^)]+)\)/.exec(particulars)
  if (!match) return null
  const raw = match[1].replace(/\s*bulk\s*/i, ' ').trim()
  if (/periyanayagi|periyanyagi/i.test(raw)) return { name: 'Periya Nayagi', type: 'Vendor' as const }
  if (/pvr/i.test(raw)) return { name: 'PVR Bulk', type: 'Vendor' as const }
  if (/ismail/i.test(raw)) return { name: 'Ismail Bulk', type: 'Vendor' as const }
  return { name: raw, type: 'Vendor' as const }
}

function cashParty(particulars: string) {
  const text = particulars.toLowerCase()
  if (text.includes('pr granites')) return 'PR Granites'
  if (text.includes('mahadev')) return 'Sri Mahadev Granites'
  if (text.includes('jeevan')) return 'Jeevan Ram Granites'
  if (text.includes('krishna')) return 'Krishna Exports'
  if (text.includes('mameenakshi') || text.includes('meenakshi')) return 'Mameenakshi'
  if (text.includes('geo natural')) return 'Geo Natural'
  return particulars.split('(')[0].trim()
}

function markingDay(particulars: string) {
  const match = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(particulars)
  if (!match) return null
  return `2026-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
}

function machineryName(particulars: string) {
  return particulars.replace(/\s*Aug\b[\s\S]*$/i, '').replace(/\s*-\s*26[\s\S]*$/i, '').trim()
}

function giftName(particulars: string) {
  return particulars.replace(/\s*gift\s*$/i, '').trim()
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

type StaffRow = { id: string; name: string }

function matchStaff(particulars: string, staff: StaffRow[], bladeSalaryIndex: { n: number }) {
  const text = particulars.toLowerCase()
  const ordered: Array<[RegExp, string | ((staff: StaffRow[]) => string | null)]> = [
    [/arun\s*poc/i, 's_arunpoc'],
    [/selvakumar/i, 's_selva'],
    [/marikannu/i, 's_marikannu'],
    [/chandran/i, 's_chandran'],
    [/bharathi/i, 's_bharathi'],
    [/vickram/i, 's_vickram'],
    [/suresh/i, 's_suresh'],
    [/thilak/i, 's_thilak'],
    [/chith?ra/i, 's_chithra'],
    [/ragul/i, 's_ragul'],
    [/rajesh/i, 's_rajesh'],
    [/kadar/i, 's_kadar'],
    [/munaf/i, 's_munaf'],
    [
      /blade/i,
      () => {
        if (/salary paid/i.test(particulars)) {
          const id = bladeSalaryIndex.n === 0 ? 's_blade' : 's_blade2'
          bladeSalaryIndex.n += 1
          return id
        }
        return 's_blade'
      },
    ],
    [/arun/i, 's_arun'],
  ]
  for (const [pattern, target] of ordered) {
    if (!pattern.test(text)) continue
    const id = typeof target === 'function' ? target(staff) : target
    return id && staff.some((row) => row.id === id) ? id : null
  }
  return null
}

async function ensureParty(name: string, type: 'Customer' | 'Vendor') {
  const existing = await Party.findAll({ where: { quarryId: QUARRY_ID } })
  const needle = normalizeName(name)
  const found = existing.find((row) => {
    const current = normalizeName(row.name)
    return current === needle || current.includes(needle) || needle.includes(current)
  })
  if (found) return found
  return Party.create({
    name,
    type,
    quarryId: QUARRY_ID,
  })
}

async function ensureStaff() {
  for (const row of EXTRA_STAFF) {
    const existing = await Staff.findByPk(row.id)
    if (existing) continue
    await Staff.create({
      ...row,
      kind: 'Staff',
      quarryId: QUARRY_ID,
      phone: '',
      bankName: '',
      accountNumber: '',
      ifsc: '',
      branch: '',
      status: 'Active',
      notes: 'From ACCOUNT.xlsx August 2026',
    })
  }
  return Staff.findAll({ where: { quarryId: QUARRY_ID } })
}

async function main() {
  const source = process.argv[2]
  if (!source) throw new Error('Usage: tsx src/seedAccount.ts <account.json>')
  const rows = JSON.parse(readFileSync(source, 'utf8')) as ExcelRow[]

  await sequelize.authenticate()
  await sequelize.sync()
  await ensureStaff()
  const staff = (await Staff.findAll({ where: { quarryId: QUARRY_ID } })).map((row) => ({
    id: row.id,
    name: row.name,
  }))

  const batches = await BlockMarking.findAll({
    where: { quarryId: QUARRY_ID },
    attributes: ['batchId', 'date', 'partyId'],
  })
  const batchByKey = new Map<string, string>()
  for (const row of batches) batchByKey.set(`${row.partyId}:${row.date}`, row.batchId)

  await Transaction.destroy({
    where: {
      quarryId: QUARRY_ID,
      date: { [Op.between]: ['2026-08-01', '2026-08-31'] },
    },
  })

  const bladeSalaryIndex = { n: 0 }
  let imported = 0
  for (const row of rows) {
    const date = parseExcelDate(String(row.date ?? ''))
    const particulars = String(row.particulars ?? '').trim()
    const debit = Number(row.debit) || 0
    const credit = Number(row.credit) || 0
    if (!date || !particulars || (debit <= 0 && credit <= 0)) continue

    const excelHead = String(row.head ?? '').trim()
    const head = mapHead(excelHead, particulars)
    const type = credit > 0 ? 'Credit' : 'Debit'
    let partyId: string | null = null
    let personId: string | null = null
    let labourId: string | null = null
    let litres: number | null = null
    let refNote: string | null = null
    let markingBatchId: string | null = null
    let paymentMethod: string | null = null

    if (head === 'Salary' || head === 'Salary Advance') {
      personId = matchStaff(particulars, staff, bladeSalaryIndex)
    }
    if (head === 'Labour Advance' || head === 'Labour Wage') {
      labourId = /pullu|pulllu/i.test(particulars) ? LABOUR_PULLU : null
    }
    if (head === 'Diesel') {
      litres = litresFrom(particulars)
      const vendor = dieselVendor(particulars)
      if (vendor) partyId = (await ensureParty(vendor.name, vendor.type)).id
    }
    if (head === 'Cash Received') {
      const party = await ensureParty(cashParty(particulars), 'Customer')
      partyId = party.id
      paymentMethod = 'Bank'
      const markedOn = markingDay(particulars)
      if (markedOn) markingBatchId = batchByKey.get(`${party.id}:${markedOn}`) ?? null
    }
    if (head === 'Royalty') {
      partyId = (await ensureParty('Narayanasamy', 'Vendor')).id
      refNote = particulars
    }
    if (head === 'Machinery Rent') {
      refNote = machineryName(particulars) || particulars
    }
    if (head === 'Monthly Gift') {
      refNote = giftName(particulars) || particulars
    }
    if (head === 'Finance / EMI') {
      partyId = (await ensureParty('Sri Ram Finance', 'Vendor')).id
    }
    if (head === 'Purchase' && /explosive/i.test(particulars)) {
      partyId = (await ensureParty('Bhuvana Explosive', 'Vendor')).id
    }

    await Transaction.create({
      quarryId: QUARRY_ID,
      date,
      type,
      head,
      particulars,
      debit: type === 'Debit' ? debit : 0,
      credit: type === 'Credit' ? credit : 0,
      partyId,
      personId,
      labourId,
      litres,
      refNote,
      markingBatchId,
      paymentMethod,
    })
    imported += 1
  }

  const totals = await Transaction.findAll({ where: { quarryId: QUARRY_ID } })
  const debit = totals.reduce((sum, row) => sum + (Number(row.debit) || 0), 0)
  const credit = totals.reduce((sum, row) => sum + (Number(row.credit) || 0), 0)
  console.log(`Imported ${imported} August vouchers`)
  console.log(`Debit ${debit}  Credit ${credit}  Net ${debit - credit}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await sequelize.close()
  })
