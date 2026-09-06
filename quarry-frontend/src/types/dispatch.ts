/** One lorry trip that can carry blocks from multiple marking invoices. */
export type DispatchTrip = {
  id: string
  /** Human-facing unique load id, e.g. LD-001 */
  loadNo: string
  quarryId: string
  date: string
  lorryNo: string
  fromLocation: string
  toLocation: string
  /** Block marking ids — may span different batchIds. */
  blockIds: string[]
  notes?: string
}

export type DispatchTripDraft = {
  date: string
  lorryNo: string
  fromLocation: string
  toLocation: string
  blockIds: string[]
  notes?: string
}
