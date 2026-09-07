import {
  DEFAULT_GST_PCT,
  type BlockMarking,
  type MarkingBatchSummary,
} from '@/types/marking'

/**
 * Dressing allowance used in MARKING DETAILS.xlsx Net Volume:
 * (L−5)×(W−5)×(H−5) ÷ 1,000,000  with L,W,H in cm.
 */
export const NET_ALLOWANCE_CM = 5

/** Convert entered sizes to cm (Excel uses cm; values like 3.2 are treated as metres). */
export function dimsToCm(m: Pick<BlockMarking, 'l' | 'w' | 'h'>) {
  const l = Number(m.l) || 0
  const w = Number(m.w) || 0
  const h = Number(m.h) || 0
  if (l > 0 && w > 0 && h > 0 && l < 20 && w < 20 && h < 20) {
    return { l: l * 100, w: w * 100, h: h * 100 }
  }
  return { l, w, h }
}

/** True when buyer gross L×W×H can produce a net CBM (each side &gt; 5 cm). */
export function hasNetDims(m: Pick<BlockMarking, 'l' | 'w' | 'h'>) {
  const { l, w, h } = dimsToCm(m)
  return l > NET_ALLOWANCE_CM && w > NET_ALLOWANCE_CM && h > NET_ALLOWANCE_CM
}

/** Buyer gross measurement CBM (no allowance). */
export function volGrossCbm(m: Pick<BlockMarking, 'l' | 'w' | 'h'>) {
  const { l, w, h } = dimsToCm(m)
  return (l * w * h) / 1e6
}

/** Net CBM — matches Excel “Net Volume”. */
export function volCbm(m: Pick<BlockMarking, 'l' | 'w' | 'h'>) {
  const { l, w, h } = dimsToCm(m)
  const nl = Math.max(0, l - NET_ALLOWANCE_CM)
  const nw = Math.max(0, w - NET_ALLOWANCE_CM)
  const nh = Math.max(0, h - NET_ALLOWANCE_CM)
  return (nl * nw * nh) / 1e6
}

export function markGstPct(m: Pick<BlockMarking, 'gstPct'>, fallback = DEFAULT_GST_PCT) {
  const n = Number(m.gstPct)
  if (Number.isFinite(n) && n >= 0) return n
  return fallback
}

export function markGross(m: Pick<BlockMarking, 'l' | 'w' | 'h' | 'rate'>) {
  return volCbm(m) * Number(m.rate || 0)
}

export function markGstAmt(m: Pick<BlockMarking, 'l' | 'w' | 'h' | 'rate' | 'gstPct'>, fallbackGst = DEFAULT_GST_PCT) {
  return markGross(m) * (markGstPct(m, fallbackGst) / 100)
}

export function markTotal(m: Pick<BlockMarking, 'l' | 'w' | 'h' | 'rate' | 'gstPct'>, fallbackGst = DEFAULT_GST_PCT) {
  return markGross(m) + markGstAmt(m, fallbackGst)
}

export function formatCbm(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '—'
  return value.toFixed(3)
}

export function formatSize(m: Pick<BlockMarking, 'l' | 'w' | 'h'>) {
  return `${m.l}×${m.w}×${m.h}`
}

/** Human-facing marking id (MK-001), falling back to the internal batch id. */
export function formatMarkingNo(row: { markingNo?: string | null; batchId: string }) {
  return row.markingNo?.trim() || row.batchId
}

/** Group block lines into invoice summaries (Excel-style Date + Party slots). */
export function summarizeBatches(blocks: BlockMarking[]): MarkingBatchSummary[] {
  const map = new Map<string, BlockMarking[]>()
  for (const block of blocks) {
    const key = block.batchId
    const list = map.get(key)
    if (list) list.push(block)
    else map.set(key, [block])
  }

  return [...map.entries()]
    .map(([batchId, rows]) => {
      const sorted = [...rows].sort((a, b) => a.blockNo.localeCompare(b.blockNo))
      const first = sorted[0]
      const cbm = sorted.reduce((sum, row) => sum + volCbm(row), 0)
      const gross = sorted.reduce((sum, row) => sum + markGross(row), 0)
      const gstAmt = sorted.reduce((sum, row) => sum + markGstAmt(row), 0)
      return {
        batchId,
        markingNo: formatMarkingNo(first),
        quarryId: first.quarryId,
        date: first.date,
        partyId: first.partyId,
        blocks: sorted,
        blockCount: sorted.length,
        cbm,
        gross,
        gstAmt,
        total: gross + gstAmt,
        loadOk: sorted.filter((row) => row.load === 'OK').length,
        loadPending: sorted.filter((row) => row.load === 'Pending').length,
        markerName: sorted.find((row) => row.markerName)?.markerName,
      } satisfies MarkingBatchSummary
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.markingNo.localeCompare(b.markingNo) || a.batchId.localeCompare(b.batchId))
}
