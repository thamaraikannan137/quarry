import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { message } from 'antd'

import { errorMessage } from '@/api/http'
import { createLoad, deleteLoad, listLoads, updateLoad } from '@/api/loads'
import { useMarkings } from '@/contexts/MarkingsContext'
import type { DispatchTrip, DispatchTripDraft } from '@/types/dispatch'

const LEGACY_KEYS = ['quarry-dispatches-v2', 'quarry-dispatches-v1']

type DispatchContextValue = {
  trips: DispatchTrip[]
  loading: boolean
  tripsForQuarry: (quarryId?: string) => DispatchTrip[]
  getTrip: (id?: string | null) => DispatchTrip | undefined
  tripForBlock: (blockId?: string | null) => DispatchTrip | undefined
  dispatchedBlockIds: (quarryId?: string) => Set<string>
  isBlockDispatched: (blockId: string) => boolean
  addTrip: (quarryId: string, draft: DispatchTripDraft) => Promise<DispatchTrip>
  updateTrip: (id: string, draft: DispatchTripDraft) => Promise<DispatchTrip>
  deleteTrip: (id: string) => Promise<void>
}

const DispatchContext = createContext<DispatchContextValue | null>(null)

export function DispatchProvider({ children }: { children: ReactNode }) {
  const { reloadMarkings } = useMarkings()
  const [trips, setTrips] = useState<DispatchTrip[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const rows = await listLoads()
    setTrips(rows)
  }, [])

  useEffect(() => {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key)
    reload()
      .catch((error) => {
        message.error(errorMessage(error, 'Could not load trips') ?? 'Could not load trips')
      })
      .finally(() => setLoading(false))
  }, [reload])

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

  const addTrip = useCallback(async (quarryId: string, draft: DispatchTripDraft) => {
    const trip = await createLoad(quarryId, draft)
    await reload()
    await reloadMarkings().catch(() => undefined)
    return trip
  }, [reload, reloadMarkings])

  const updateTrip = useCallback(async (id: string, draft: DispatchTripDraft) => {
    const existing = trips.find((row) => row.id === id)
    if (!existing) throw new Error('Load not found')
    const trip = await updateLoad(id, existing.quarryId, draft)
    await reload()
    await reloadMarkings().catch(() => undefined)
    return trip
  }, [trips, reload, reloadMarkings])

  const deleteTrip = useCallback(async (id: string) => {
    await deleteLoad(id)
    await reload()
    await reloadMarkings().catch(() => undefined)
  }, [reload, reloadMarkings])

  const value = useMemo(
    () => ({
      trips,
      loading,
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
      loading,
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
