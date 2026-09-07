export type LinkPerson = {
  id: string
  name: string
  role: string
  kind: 'Staff'
  quarryId: string
}

export type LinkGang = {
  id: string
  name: string
  fy: string
  quarryId: string
}

/** Temporary labour gang masters until the labour module is built. Staff lives in Staff Management. */
export const DEMO_PEOPLE: LinkPerson[] = [
  { id: 's_ragul', name: 'P. Ragul', role: 'Incharge', kind: 'Staff', quarryId: 'q_chitha' },
  { id: 's_selva', name: 'Selvakumar', role: 'Pit Incharge', kind: 'Staff', quarryId: 'q_chitha' },
  { id: 's_arun', name: 'Arun', role: 'POC Op', kind: 'Staff', quarryId: 'q_chitha' },
  { id: 's_arunpoc', name: 'Arun Poc', role: 'Com/Op', kind: 'Staff', quarryId: 'q_chitha' },
  { id: 's_chithra', name: 'Chithra', role: 'Mess', kind: 'Staff', quarryId: 'q_chitha' },
  { id: 's_bharathi', name: 'Bharathi', role: 'PRD/op', kind: 'Staff', quarryId: 'q_chitha' },
  { id: 's_chandran', name: 'Chandran', role: 'Welder', kind: 'Staff', quarryId: 'q_chitha' },
  { id: 's_thilak', name: 'Thilak', role: 'WS.OP', kind: 'Staff', quarryId: 'q_chitha' },
  { id: 's_suresh', name: 'Suresh', role: 'Crane Op', kind: 'Staff', quarryId: 'q_chitha' },
  { id: 's_thalapathi', name: 'Thalapathi', role: 'Office', kind: 'Staff', quarryId: 'q_chitha' },
  { id: 's_marikannu', name: 'Marikannu', role: 'Mess', kind: 'Staff', quarryId: 'q_chitha' },
]

export const DEMO_GANGS: LinkGang[] = [
  { id: 'g_pullu', name: 'Pullu Labour', fy: '2025-26', quarryId: 'q_chitha' },
  { id: 'g_pancha', name: 'Pancha Labour', fy: '2025-26', quarryId: 'q_chitha' },
]

export function peopleForQuarry(quarryId?: string) {
  if (!quarryId) return DEMO_PEOPLE
  return DEMO_PEOPLE.filter((person) => person.quarryId === quarryId)
}

export function gangsForQuarry(quarryId?: string) {
  if (!quarryId) return DEMO_GANGS
  return DEMO_GANGS.filter((gang) => gang.quarryId === quarryId)
}

export function advanceLinkLabel(personId?: string | null, labourId?: string | null) {
  if (personId) {
    const person = DEMO_PEOPLE.find((item) => item.id === personId)
    return person ? `${person.name} · ${person.kind}` : personId
  }
  if (labourId) {
    const gang = DEMO_GANGS.find((item) => item.id === labourId)
    return gang ? `${gang.name} · FY ${gang.fy}` : labourId
  }
  return null
}
