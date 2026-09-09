import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { message } from 'antd'

import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from '@/api/customers'
import { createVendor, deleteVendor, listVendors, updateVendor } from '@/api/vendors'
import { errorMessage } from '@/api/http'
import type { Party, PartyDraft, PartyKind } from '@/types/party'
import { isCustomerParty, isVendorParty } from '@/types/party'

const LEGACY_KEYS = ['quarry-parties-v1']

type PartiesContextValue = {
  parties: Party[]
  loading: boolean
  customersForQuarry: (quarryId?: string) => Party[]
  vendorsForQuarry: (quarryId?: string) => Party[]
  partiesForQuarry: (quarryId?: string) => Party[]
  getParty: (id?: string | null) => Party | undefined
  addParty: (draft: PartyDraft) => Promise<Party>
  updateParty: (id: string, draft: PartyDraft) => Promise<void>
  deleteParty: (id: string) => Promise<void>
}

const PartiesContext = createContext<PartiesContextValue | null>(null)

function inQuarry(party: Party, quarryId?: string) {
  if (!quarryId) return true
  return party.quarryIds.includes(quarryId) || party.quarryIds.includes('*')
}

export function PartiesProvider({ children }: { children: ReactNode }) {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const [customers, vendors] = await Promise.all([listCustomers(), listVendors()])
    setParties([...customers, ...vendors])
  }, [])

  useEffect(() => {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key)
    reload()
      .catch((error) => {
        message.error(errorMessage(error, 'Could not load customers') ?? 'Could not load customers')
      })
      .finally(() => setLoading(false))
  }, [reload])

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

  const addParty = useCallback(async (draft: PartyDraft) => {
    const next = draft.type === 'Vendor' ? await createVendor(draft) : await createCustomer(draft)
    setParties((current) => [next, ...current.filter((party) => party.id !== next.id)])
    return next
  }, [])

  const updateParty = useCallback(async (id: string, draft: PartyDraft) => {
    const next = draft.type === 'Vendor' ? await updateVendor(id, draft) : await updateCustomer(id, draft)
    setParties((current) => current.map((party) => (party.id === id ? next : party)))
  }, [])

  const deleteParty = useCallback(async (id: string) => {
    const existing = parties.find((party) => party.id === id)
    if (existing?.type === 'Vendor') await deleteVendor(id)
    else await deleteCustomer(id)
    setParties((current) => current.filter((party) => party.id !== id))
  }, [parties])

  const value = useMemo(
    () => ({
      parties,
      loading,
      customersForQuarry,
      vendorsForQuarry,
      partiesForQuarry,
      getParty,
      addParty,
      updateParty,
      deleteParty,
    }),
    [parties, loading, customersForQuarry, vendorsForQuarry, partiesForQuarry, getParty, addParty, updateParty, deleteParty],
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
