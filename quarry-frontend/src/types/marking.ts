export const BLOCK_CHOICES = ['I', 'II', 'III', 'Mix', 'Other'] as const
export type BlockChoice = (typeof BLOCK_CHOICES)[number] | string

export const LOAD_STATUSES = ['OK', 'Pending'] as const
export type LoadStatus = (typeof LOAD_STATUSES)[number]

/** One granite block line inside a marking invoice (party + date slot). */
export type BlockMarking = {
  id: string
  /** Shared id for the invoice / slot (Excel: one Date+Party with many blocks). */
  batchId: string
  /** Human-facing unique marking id, e.g. MK-001 */
  markingNo: string
  quarryId: string
  date: string
  partyId: string
  blockNo: string
  choice: BlockChoice
  l: number
  w: number
  h: number
  rate: number
  gstPct: number
  load: LoadStatus
  markerName?: string
  notes?: string
}

export type MarkingLineDraft = {
  blockNo: string
  choice: BlockChoice
  l: number
  w: number
  h: number
  rate: number
  gstPct: number
  load: LoadStatus
  markerName?: string
}

export type MarkingBatchDraft = {
  date: string
  partyId: string
  markerName?: string
  lines: MarkingLineDraft[]
}

/** Edit draft lines may keep existing block ids so loads stay linked. */
export type MarkingEditLineDraft = MarkingLineDraft & {
  id?: string
}

export type MarkingBatchEditDraft = {
  date: string
  partyId: string
  markerName?: string
  lines: MarkingEditLineDraft[]
}

export type MarkingUpdateDraft = MarkingLineDraft & {
  date: string
  partyId: string
  notes?: string
}

/** Landing-page row: one marking invoice with rolled-up totals. */
export type MarkingBatchSummary = {
  batchId: string
  markingNo: string
  quarryId: string
  date: string
  partyId: string
  blocks: BlockMarking[]
  blockCount: number
  cbm: number
  gross: number
  gstAmt: number
  total: number
  loadOk: number
  loadPending: number
  markerName?: string
}

export const DEFAULT_CBM_RATES: Record<string, number> = {
  I: 18000,
  II: 16000,
  III: 14000,
  Mix: 15000,
  Other: 15000,
}

export const DEFAULT_GST_PCT = 18
export const DEFAULT_ROYALTY_PER_CBM = 2500

export function defaultCbmRate(choice: string, rates: Record<string, number> = DEFAULT_CBM_RATES) {
  return Number(rates[choice] || rates.I || 18000)
}

export function emptyMarkingLine(choice: BlockChoice = 'I', gstPct = DEFAULT_GST_PCT): MarkingLineDraft {
  return {
    blockNo: '',
    choice,
    l: 300,
    w: 150,
    h: 120,
    rate: defaultCbmRate(choice),
    gstPct,
    load: 'Pending',
  }
}
