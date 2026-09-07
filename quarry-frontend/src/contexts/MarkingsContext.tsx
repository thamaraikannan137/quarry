import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { message } from 'antd'

import { errorMessage } from '@/api/http'
import {
  createMarkingBatch,
  deleteMarkingBatch,
  listMarkingBlocks,
  updateMarkingBatch,
  updateMarkingBlock,
} from '@/api/markings'
import type { BlockMarking, MarkingBatchDraft, MarkingBatchEditDraft, MarkingBatchSummary, MarkingUpdateDraft } from '@/types/marking'
import { summarizeBatches } from '@/utils/marking'

const LEGACY_KEYS = ['quarry-markings-v3', 'quarry-markings-v2', 'quarry-markings-v1']

type MarkingsContextValue = {
  markings: BlockMarking[]
  loading: boolean
  markingsForQuarry: (quarryId?: string) => BlockMarking[]
  batchesForQuarry: (quarryId?: string) => MarkingBatchSummary[]
  getBatch: (batchId?: string | null) => MarkingBatchSummary | undefined
  getMarking: (id?: string | null) => BlockMarking | undefined
  addBatch: (quarryId: string, draft: MarkingBatchDraft) => Promise<{ batchId: string; blocks: BlockMarking[] }>
  updateBatch: (batchId: string, draft: MarkingBatchEditDraft) => Promise<{ batchId: string; blocks: BlockMarking[] }>
  updateMarking: (id: string, draft: MarkingUpdateDraft) => Promise<void>
  deleteMarking: (id: string) => Promise<void>
  deleteBatch: (batchId: string) => Promise<void>
  reloadMarkings: () => Promise<void>
}

const MarkingsContext = createContext<MarkingsContextValue | null>(null)

export function MarkingsProvider({ children }: { children: ReactNode }) {
  const [markings, setMarkings] = useState<BlockMarking[]>([])
  const [loading, setLoading] = useState(true)

  const reloadMarkings = useCallback(async () => {
    const rows = await listMarkingBlocks()
    setMarkings(rows)
  }, [])

  useEffect(() => {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key)
    reloadMarkings()
      .catch((error) => {
        message.error(errorMessage(error, 'Could not load markings') ?? 'Could not load markings')
      })
      .finally(() => setLoading(false))
  }, [reloadMarkings])

  const markingsForQuarry = useCallback(
    (quarryId?: string) => {
      const list = quarryId ? markings.filter((row) => row.quarryId === quarryId) : markings
      return [...list].sort((a, b) => b.date.localeCompare(a.date) || a.blockNo.localeCompare(b.blockNo))
    },
    [markings],
  )

  const batchesForQuarry = useCallback(
    (quarryId?: string) => summarizeBatches(markingsForQuarry(quarryId)),
    [markingsForQuarry],
  )

  const getBatch = useCallback(
    (batchId?: string | null) => {
      if (!batchId) return undefined
      return summarizeBatches(markings.filter((row) => row.batchId === batchId))[0]
    },
    [markings],
  )

  const getMarking = useCallback((id?: string | null) => markings.find((row) => row.id === id), [markings])

  const addBatch = useCallback(async (quarryId: string, draft: MarkingBatchDraft) => {
    const saved = await createMarkingBatch(quarryId, draft)
    await reloadMarkings()
    return saved
  }, [reloadMarkings])

  const updateBatch = useCallback(async (batchId: string, draft: MarkingBatchEditDraft) => {
    const quarryId = markings.find((row) => row.batchId === batchId)?.quarryId
    if (!quarryId) throw new Error('Marking batch not found')
    const saved = await updateMarkingBatch(batchId, quarryId, draft)
    await reloadMarkings()
    return saved
  }, [markings, reloadMarkings])

  const updateMarking = useCallback(async (id: string, draft: MarkingUpdateDraft) => {
    const current = markings.find((row) => row.id === id)
    if (!current) throw new Error('Marking not found')
    await updateMarkingBlock(id, current.quarryId, markings, draft)
    await reloadMarkings()
  }, [markings, reloadMarkings])

  const deleteMarking = useCallback(async (id: string) => {
    const current = markings.find((row) => row.id === id)
    if (!current) return
    const siblings = markings.filter((row) => row.batchId === current.batchId)
    if (siblings.length <= 1) {
      await deleteMarkingBatch(current.batchId)
      await reloadMarkings()
      return
    }
    await updateMarkingBatch(current.batchId, current.quarryId, {
      date: current.date,
      partyId: current.partyId,
      markerName: current.markerName,
      lines: siblings
        .filter((row) => row.id !== id)
        .map((row) => ({
          id: row.id,
          blockNo: row.blockNo,
          choice: row.choice,
          l: row.l,
          w: row.w,
          h: row.h,
          rate: row.rate,
          gstPct: row.gstPct,
          gstType: row.gstType,
          load: row.load,
          markerName: row.markerName,
        })),
    })
    await reloadMarkings()
  }, [markings, reloadMarkings])

  const deleteBatch = useCallback(async (batchId: string) => {
    await deleteMarkingBatch(batchId)
    await reloadMarkings()
  }, [reloadMarkings])

  const value = useMemo(
    () => ({
      markings,
      loading,
      markingsForQuarry,
      batchesForQuarry,
      getBatch,
      getMarking,
      addBatch,
      updateBatch,
      updateMarking,
      deleteMarking,
      deleteBatch,
      reloadMarkings,
    }),
    [
      markings,
      loading,
      markingsForQuarry,
      batchesForQuarry,
      getBatch,
      getMarking,
      addBatch,
      updateBatch,
      updateMarking,
      deleteMarking,
      deleteBatch,
      reloadMarkings,
    ],
  )

  return <MarkingsContext.Provider value={value}>{children}</MarkingsContext.Provider>
}

export function useMarkings() {
  const ctx = useContext(MarkingsContext)
  if (!ctx) throw new Error('useMarkings must be used within MarkingsProvider')
  return ctx
}
