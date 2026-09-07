import { api } from '@/api/http'
import type { BlockMarking, MarkingBatchDraft, MarkingBatchEditDraft, MarkingUpdateDraft } from '@/types/marking'
import { isoDateOnly } from '@/utils/money'

type ApiBlock = BlockMarking & {
  load?: string
  markerName?: string | null
  notes?: string | null
  markingNo?: string | null
}

type ApiBatch = {
  batchId: string
  markingNo?: string | null
  quarryId: string
  date: string
  partyId: string
  markerName?: string | null
  blocks: ApiBlock[]
}

function fromApi(row: ApiBlock): BlockMarking {
  return {
    id: row.id,
    batchId: row.batchId,
    markingNo: row.markingNo?.trim() || row.batchId,
    quarryId: row.quarryId,
    date: isoDateOnly(row.date),
    partyId: row.partyId,
    blockNo: row.blockNo,
    choice: row.choice,
    l: Number(row.l) || 0,
    w: Number(row.w) || 0,
    h: Number(row.h) || 0,
    rate: Number(row.rate) || 0,
    gstPct: Number(row.gstPct) || 0,
    load: row.load === 'OK' ? 'OK' : 'Pending',
    markerName: row.markerName?.trim() || undefined,
    notes: row.notes?.trim() || undefined,
  }
}

export async function listMarkingBlocks() {
  const rows = await api<ApiBlock[]>('/api/markings?as=blocks')
  return rows.map(fromApi)
}

export async function createMarkingBatch(quarryId: string, draft: MarkingBatchDraft) {
  const row = await api<ApiBatch>('/api/markings', {
    method: 'POST',
    body: JSON.stringify({
      date: draft.date,
      partyId: draft.partyId,
      quarryId,
      markerName: draft.markerName ?? null,
      lines: draft.lines.map((line) => ({
        blockNo: line.blockNo.trim(),
        choice: line.choice || 'I',
        l: Number(line.l) || 0,
        w: Number(line.w) || 0,
        h: Number(line.h) || 0,
        rate: Number(line.rate) || 0,
        gstPct: Number(line.gstPct) || 0,
        markerName: line.markerName?.trim() || draft.markerName || null,
      })),
    }),
  })
  return { batchId: row.batchId, blocks: (row.blocks ?? []).map(fromApi) }
}

export async function updateMarkingBatch(batchId: string, quarryId: string, draft: MarkingBatchEditDraft) {
  const row = await api<ApiBatch>(`/api/markings/${batchId}`, {
    method: 'PUT',
    body: JSON.stringify({
      date: draft.date,
      partyId: draft.partyId,
      quarryId,
      markerName: draft.markerName ?? null,
      lines: draft.lines.map((line) => ({
        id: line.id,
        blockNo: line.blockNo.trim(),
        choice: line.choice || 'I',
        l: Number(line.l) || 0,
        w: Number(line.w) || 0,
        h: Number(line.h) || 0,
        rate: Number(line.rate) || 0,
        gstPct: Number(line.gstPct) || 0,
        markerName: line.markerName?.trim() || draft.markerName || null,
      })),
    }),
  })
  return { batchId: row.batchId, blocks: (row.blocks ?? []).map(fromApi) }
}

export async function updateMarkingBlock(id: string, quarryId: string, batch: BlockMarking[], draft: MarkingUpdateDraft) {
  const current = batch.find((row) => row.id === id)
  if (!current) throw new Error('Marking not found')
  const siblings = batch.filter((row) => row.batchId === current.batchId)
  return updateMarkingBatch(current.batchId, quarryId, {
    date: draft.date,
    partyId: draft.partyId,
    markerName: draft.markerName ?? current.markerName,
    lines: siblings.map((row) =>
      row.id === id
        ? {
            id: row.id,
            blockNo: draft.blockNo,
            choice: draft.choice,
            l: draft.l,
            w: draft.w,
            h: draft.h,
            rate: draft.rate,
            gstPct: draft.gstPct,
            load: draft.load,
            markerName: draft.markerName,
          }
        : {
            id: row.id,
            blockNo: row.blockNo,
            choice: row.choice,
            l: row.l,
            w: row.w,
            h: row.h,
            rate: row.rate,
            gstPct: row.gstPct,
            load: row.load,
            markerName: row.markerName,
          },
    ),
  })
}

export async function deleteMarkingBatch(batchId: string) {
  await api<void>(`/api/markings/${batchId}`, { method: 'DELETE' })
}
