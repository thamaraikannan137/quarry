export type LedgerStatus = 'open' | 'closed'

export type Ledger = {
  id: string
  quarryId: string
  holderName: string
  personId: string | null
  date: string
  amount: number
  notes: string
  status: LedgerStatus
  returnedAmount: number
  closedDate: string | null
  spent: number
  balance: number
}

export type LedgerDraft = {
  quarryId: string
  holderName: string
  personId?: string | null
  date: string
  amount: number
  notes: string
  status?: LedgerStatus
  closedDate?: string | null
}

export type LedgerReturnDraft = {
  amount: number
  date?: string
  close?: boolean
}

export type LedgerCloseDraft = {
  returnedAmount?: number
  date?: string
}

export type LedgerTransferDraft = {
  amount: number
  date?: string
  notes?: string
  close?: boolean
  toLedgerId?: string
  toHolderName?: string
  toPersonId?: string | null
}

export function emptyLedgerDraft(quarryId: string, date: string): LedgerDraft {
  return {
    quarryId,
    holderName: '',
    personId: null,
    date,
    amount: 0,
    notes: '',
  }
}

export function ledgerLabel(row: Ledger) {
  return row.holderName
}
