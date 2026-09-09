export type PartyKind = 'Customer' | 'Vendor'

export type GstType = 'Unregistered/Consumer' | 'Registered Regular' | 'Composition'

export type Party = {
  id: string
  name: string
  type: PartyKind
  phone: string
  email: string
  gstin: string
  gstType: GstType
  state: string
  billingAddress: string
  shippingAddress: string
  openingBalance: number
  asOf: string
  creditLimit: number
  contact: string
  notes: string
  quarryIds: string[]
}

export type PartyDraft = Omit<Party, 'id'> & { id?: string }

export const TN_STATES = [
  'Tamil Nadu',
  'Kerala',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
  'Puducherry',
  'Other',
] as const

export function isCustomerParty(party: Pick<Party, 'type'>) {
  return party.type === 'Customer'
}

export function isVendorParty(party: Pick<Party, 'type'>) {
  return party.type === 'Vendor'
}

export function emptyPartyDraft(quarryId: string): PartyDraft {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    name: '',
    type: 'Customer',
    phone: '',
    email: '',
    gstin: '',
    gstType: 'Unregistered/Consumer',
    state: 'Tamil Nadu',
    billingAddress: '',
    shippingAddress: '',
    openingBalance: 0,
    asOf: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
    creditLimit: 0,
    contact: '',
    notes: '',
    quarryIds: [quarryId],
  }
}
