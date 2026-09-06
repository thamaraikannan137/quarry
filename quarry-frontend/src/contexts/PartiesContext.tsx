import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { DEMO_PARTIES } from '@/data/demoParties'
import type { Party, PartyDraft, PartyKind } from '@/types/party'
import { isCustomerParty, isVendorParty } from '@/types/party'
import { newId } from '@/utils/money'

const STORAGE_KEY = 'quarry-parties-v1'

type PartiesContextValue = {
  parties: Party[]
  customersForQuarry: (quarryId?: string) => Party[]
  vendorsForQuarry: (quarryId?: string) => Party[]
  partiesForQuarry: (quarryId?: string) => Party[]
  getParty: (id?: string | null) => Party | undefined
  addParty: (draft: PartyDraft) => Party
  updateParty: (id: string, draft: PartyDraft) => void
  deleteParty: (id: string) => void
}

const PartiesContext = createContext<PartiesContextValue | null>(null)

function mergeDemoParties(stored: Party[]): Party[] {
  const byId = new Map(stored.map((party) => [party.id, party]))
  for (const demo of DEMO_PARTIES) {
    if (!byId.has(demo.id)) byId.set(demo.id, demo)
  }
  return [...byId.values()]
}

function readStored(): Party[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEMO_PARTIES
    const parsed = JSON.parse(raw) as Party[]
    return Array.isArray(parsed) && parsed.length ? mergeDemoParties(parsed) : DEMO_PARTIES
  } catch {
    return DEMO_PARTIES
  }
}

function inQuarry(party: Party, quarryId?: string) {
  if (!quarryId) return true
  return party.quarryIds.includes(quarryId) || party.quarryIds.includes('*')
}

function normalizeDraft(draft: PartyDraft, id: string): Party {
  return {
    id,
    name: draft.name.trim(),
    type: draft.type,
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    gstin: draft.gstin.trim() || '—',
    gstType: draft.gstType,
    state: draft.state,
    billingAddress: draft.billingAddress.trim(),
    shippingAddress: draft.shippingAddress.trim(),
    openingBalance: Number(draft.openingBalance) || 0,
    asOf: draft.asOf,
    creditLimit: Number(draft.creditLimit) || 0,
    contact: draft.contact.trim(),
    notes: draft.notes.trim(),
    quarryIds: draft.quarryIds.length ? draft.quarryIds : ['q_chitha'],
  }
}

export function PartiesProvider({ children }: { children: ReactNode }) {
  const [parties, setParties] = useState<Party[]>(readStored)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parties))
  }, [parties])

  const partiesForQuarry = useCallback(
    (quarryId?: string) => parties.filter((party) => inQuarry(party, quarryId)).sort((a, b) => a.name.localeCompare(b.name)),
    [parties],
  )

  const customersForQuarry = useCallback(
    (quarryId?: string) => partiesForQuarry(quarryId).filter(isCustomerParty),
    [partiesForQuarry],
  )

  const vendorsForQuarry = useCallback(
    (quarryId?: string) => partiesForQuarry(quarryId).filter(isVendorParty),
    [partiesForQuarry],
  )

  const getParty = useCallback((id?: string | null) => parties.find((party) => party.id === id), [parties])

  const addParty = useCallback((draft: PartyDraft) => {
    const next = normalizeDraft(draft, draft.id || newId('p'))
    setParties((current) => [next, ...current])
    return next
  }, [])

  const updateParty = useCallback((id: string, draft: PartyDraft) => {
    const next = normalizeDraft(draft, id)
    setParties((current) => current.map((party) => (party.id === id ? next : party)))
  }, [])

  const deleteParty = useCallback((id: string) => {
    setParties((current) => current.filter((party) => party.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      parties,
      customersForQuarry,
      vendorsForQuarry,
      partiesForQuarry,
      getParty,
      addParty,
      updateParty,
      deleteParty,
    }),
    [parties, customersForQuarry, vendorsForQuarry, partiesForQuarry, getParty, addParty, updateParty, deleteParty],
  )

  return <PartiesContext.Provider value={value}>{children}</PartiesContext.Provider>
}

export function useParties() {
  const ctx = useContext(PartiesContext)
  if (!ctx) throw new Error('useParties must be used within PartiesProvider')
  return ctx
}

export function partyKindLabel(kind: PartyKind) {
  return kind
}
