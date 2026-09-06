import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { DEMO_DISPATCHES } from '@/data/demoDispatches'
import type { DispatchTrip, DispatchTripDraft } from '@/types/dispatch'
import { newId } from '@/utils/money'

const STORAGE_KEY = 'quarry-dispatches-v2'
const LEGACY_KEYS = ['quarry-dispatches-v1']

type DispatchContextValue = {
  trips: DispatchTrip[]
  tripsForQuarry: (quarryId?: string) => DispatchTrip[]
  getTrip: (id?: string | null) => DispatchTrip | undefined
  tripForBlock: (blockId?: string | null) => DispatchTrip | undefined
  dispatchedBlockIds: (quarryId?: string) => Set<string>
  isBlockDispatched: (blockId: string) => boolean
  addTrip: (quarryId: string, draft: DispatchTripDraft) => DispatchTrip
  updateTrip: (id: string, draft: DispatchTripDraft) => DispatchTrip | undefined
  deleteTrip: (id: string) => void
}

const DispatchContext = createContext<DispatchContextValue | null>(null)

function nextLoadNo(trips: DispatchTrip[], quarryId: string) {
  let max = 0
  for (const trip of trips) {
    if (trip.quarryId !== quarryId) continue
    const match = /^LD-(\d+)$/i.exec(trip.loadNo || '')
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `LD-${String(max + 1).padStart(3, '0')}`
}

function ensureLoadNo(trip: DispatchTrip & { loadNo?: string }, index: number): DispatchTrip {
  if (trip.loadNo?.trim()) return trip as DispatchTrip
  return { ...trip, loadNo: `LD-${String(index + 1).padStart(3, '0')}` }
}

function readStored(): DispatchTrip[] {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEMO_DISPATCHES
    const parsed = JSON.parse(raw) as Array<DispatchTrip & { loadNo?: string }>
    if (!Array.isArray(parsed) || !parsed.length) return DEMO_DISPATCHES
    return parsed.map(ensureLoadNo)
  } catch {
    return DEMO_DISPATCHES
  }
}

export function DispatchProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<DispatchTrip[]>(readStored)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
  }, [trips])

  const tripsForQuarry = useCallback(
    (quarryId?: string) => {
      const list = quarryId ? trips.filter((row) => row.quarryId === quarryId) : trips
      return [...list].sort(
        (a, b) => b.date.localeCompare(a.date) || a.loadNo.localeCompare(b.loadNo) || a.lorryNo.localeCompare(b.lorryNo),
      )
    },
    [trips],
  )

  const getTrip = useCallback((id?: string | null) => trips.find((row) => row.id === id), [trips])

  const tripForBlock = useCallback(
    (blockId?: string | null) => {
      if (!blockId) return undefined
      return trips.find((trip) => trip.blockIds.includes(blockId))
    },
    [trips],
  )

  const dispatchedBlockIds = useCallback(
    (quarryId?: string) => {
      const ids = new Set<string>()
      for (const trip of trips) {
        if (quarryId && trip.quarryId !== quarryId) continue
        for (const blockId of trip.blockIds) ids.add(blockId)
      }
      return ids
    },
    [trips],
  )

  const isBlockDispatched = useCallback(
    (blockId: string) => trips.some((trip) => trip.blockIds.includes(blockId)),
    [trips],
  )

  const addTrip = useCallback((quarryId: string, draft: DispatchTripDraft) => {
    const trip: DispatchTrip = {
      id: newId('dp'),
      loadNo: '',
      quarryId,
      date: draft.date,
      lorryNo: draft.lorryNo.trim(),
      fromLocation: draft.fromLocation.trim(),
      toLocation: draft.toLocation.trim(),
      blockIds: [...new Set(draft.blockIds)],
      notes: draft.notes?.trim() || undefined,
    }
    setTrips((current) => {
      trip.loadNo = nextLoadNo(current, quarryId)
      return [trip, ...current]
    })
    return trip
  }, [])

  const updateTrip = useCallback((id: string, draft: DispatchTripDraft) => {
    let updated: DispatchTrip | undefined
    setTrips((current) =>
      current.map((row) => {
        if (row.id !== id) return row
        updated = {
          ...row,
          date: draft.date,
          lorryNo: draft.lorryNo.trim(),
          fromLocation: draft.fromLocation.trim(),
          toLocation: draft.toLocation.trim(),
          blockIds: [...new Set(draft.blockIds)],
          notes: draft.notes?.trim() || undefined,
        }
        return updated
      }),
    )
    return updated
  }, [])

  const deleteTrip = useCallback((id: string) => {
    setTrips((current) => current.filter((row) => row.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      trips,
      tripsForQuarry,
      getTrip,
      tripForBlock,
      dispatchedBlockIds,
      isBlockDispatched,
      addTrip,
      updateTrip,
      deleteTrip,
    }),
    [
      trips,
      tripsForQuarry,
      getTrip,
      tripForBlock,
      dispatchedBlockIds,
      isBlockDispatched,
      addTrip,
      updateTrip,
      deleteTrip,
    ],
  )

  return <DispatchContext.Provider value={value}>{children}</DispatchContext.Provider>
}

export function useDispatch() {
  const ctx = useContext(DispatchContext)
  if (!ctx) throw new Error('useDispatch must be used within DispatchProvider')
  return ctx
}
