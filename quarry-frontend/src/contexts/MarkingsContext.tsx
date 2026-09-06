import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { DEMO_MARKINGS } from '@/data/demoMarkings'
import type { BlockMarking, MarkingBatchDraft, MarkingBatchEditDraft, MarkingBatchSummary, MarkingUpdateDraft } from '@/types/marking'
import { summarizeBatches } from '@/utils/marking'
import { newId } from '@/utils/money'

const STORAGE_KEY = 'quarry-markings-v3'
const LEGACY_KEYS = ['quarry-markings-v2', 'quarry-markings-v1']

type MarkingsContextValue = {
  markings: BlockMarking[]
  markingsForQuarry: (quarryId?: string) => BlockMarking[]
  batchesForQuarry: (quarryId?: string) => MarkingBatchSummary[]
  getBatch: (batchId?: string | null) => MarkingBatchSummary | undefined
  getMarking: (id?: string | null) => BlockMarking | undefined
  addBatch: (quarryId: string, draft: MarkingBatchDraft) => { batchId: string; blocks: BlockMarking[] }
  updateBatch: (batchId: string, draft: MarkingBatchEditDraft) => { batchId: string; blocks: BlockMarking[] }
  updateMarking: (id: string, draft: MarkingUpdateDraft) => void
  deleteMarking: (id: string) => void
  deleteBatch: (batchId: string) => void
}

const MarkingsContext = createContext<MarkingsContextValue | null>(null)

function ensureBatchId(row: BlockMarking & { batchId?: string }): BlockMarking {
  if (row.batchId) return row as BlockMarking
  // Legacy flat rows: invent a stable batch from quarry+date+party
  return {
    ...row,
    batchId: `legacy_${row.quarryId}_${row.date}_${row.partyId}`,
  }
}

function readStored(): BlockMarking[] {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEMO_MARKINGS
    const parsed = JSON.parse(raw) as BlockMarking[]
    if (!Array.isArray(parsed) || !parsed.length) return DEMO_MARKINGS
    return parsed.map(ensureBatchId)
  } catch {
    return DEMO_MARKINGS
  }
}

export function MarkingsProvider({ children }: { children: ReactNode }) {
  const [markings, setMarkings] = useState<BlockMarking[]>(readStored)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(markings))
  }, [markings])

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

  const addBatch = useCallback((quarryId: string, draft: MarkingBatchDraft) => {
    const batchId = newId('mb')
    const batchMarker = draft.markerName?.trim() || undefined
    const blocks: BlockMarking[] = draft.lines
      .filter((line) => line.blockNo.trim() && line.l > 0 && line.w > 0 && line.h > 0)
      .map((line) => ({
        id: newId('mk'),
        batchId,
        quarryId,
        date: draft.date,
        partyId: draft.partyId,
        blockNo: line.blockNo.trim(),
        choice: line.choice || 'I',
        l: Number(line.l) || 0,
        w: Number(line.w) || 0,
        h: Number(line.h) || 0,
        rate: Number(line.rate) || 0,
        gstPct: Number(line.gstPct) || 0,
        load: line.load || 'Pending',
        markerName: line.markerName?.trim() || batchMarker,
      }))

    if (blocks.length) {
      setMarkings((current) => [...blocks, ...current])
    }
    return { batchId, blocks }
  }, [])

  const updateBatch = useCallback((batchId: string, draft: MarkingBatchEditDraft) => {
    const batchMarker = draft.markerName?.trim() || undefined
    let nextBlocks: BlockMarking[] = []

    setMarkings((current) => {
      const existingById = new Map(current.filter((row) => row.batchId === batchId).map((row) => [row.id, row]))
      const quarryId = existingById.values().next().value?.quarryId ?? current.find((row) => row.batchId === batchId)?.quarryId

      nextBlocks = draft.lines
        .filter((line) => line.blockNo.trim() && line.l > 0 && line.w > 0 && line.h > 0)
        .map((line) => {
          const prev = line.id ? existingById.get(line.id) : undefined
          return {
            id: prev?.id ?? newId('mk'),
            batchId,
            quarryId: prev?.quarryId ?? quarryId ?? '',
            date: draft.date,
            partyId: draft.partyId,
            blockNo: line.blockNo.trim(),
            choice: line.choice || 'I',
            l: Number(line.l) || 0,
            w: Number(line.w) || 0,
            h: Number(line.h) || 0,
            rate: Number(line.rate) || 0,
            gstPct: Number(line.gstPct) || 0,
            load: prev?.load || line.load || 'Pending',
            markerName: line.markerName?.trim() || batchMarker,
            notes: prev?.notes,
          }
        })
        .filter((block) => Boolean(block.quarryId))

      const others = current.filter((row) => row.batchId !== batchId)
      return [...nextBlocks, ...others]
    })

    return { batchId, blocks: nextBlocks }
  }, [])

  const updateMarking = useCallback((id: string, draft: MarkingUpdateDraft) => {
    setMarkings((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              date: draft.date,
              partyId: draft.partyId,
              blockNo: draft.blockNo.trim(),
              choice: draft.choice || 'I',
              l: Number(draft.l) || 0,
              w: Number(draft.w) || 0,
              h: Number(draft.h) || 0,
              rate: Number(draft.rate) || 0,
              gstPct: Number(draft.gstPct) || 0,
              load: draft.load || 'Pending',
              markerName: draft.markerName?.trim() || undefined,
              notes: draft.notes?.trim() || undefined,
            }
          : row,
      ),
    )
  }, [])

  const deleteMarking = useCallback((id: string) => {
    setMarkings((current) => current.filter((row) => row.id !== id))
  }, [])

  const deleteBatch = useCallback((batchId: string) => {
    setMarkings((current) => current.filter((row) => row.batchId !== batchId))
  }, [])

  const value = useMemo(
    () => ({
      markings,
      markingsForQuarry,
      batchesForQuarry,
      getBatch,
      getMarking,
      addBatch,
      updateBatch,
      updateMarking,
      deleteMarking,
      deleteBatch,
    }),
    [
      markings,
      markingsForQuarry,
      batchesForQuarry,
      getBatch,
      getMarking,
      addBatch,
      updateBatch,
      updateMarking,
      deleteMarking,
      deleteBatch,
    ],
  )

  return <MarkingsContext.Provider value={value}>{children}</MarkingsContext.Provider>
}

export function useMarkings() {
  const ctx = useContext(MarkingsContext)
  if (!ctx) throw new Error('useMarkings must be used within MarkingsProvider')
  return ctx
}
