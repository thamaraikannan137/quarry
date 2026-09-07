import type { TxnType } from '@/types/transaction'

export type ExtraFieldKey = 'party' | 'advanceLink' | 'litres' | 'refNote' | 'paymentMethod' | 'markingBatch'

export type PartySource = 'customer' | 'vendor' | 'all'

export type ExtraFieldDef = {
  key: ExtraFieldKey
  label: string
  required?: boolean
  hint?: string
  /** Who appears in the party / supplier dropdown. */
  partySource?: PartySource
}

export type CategoryFieldRule = {
  /** Match category name (case-insensitive). */
  heads: string[]
  /** Only for these voucher types; omit = both. */
  types?: TxnType[]
  fields: ExtraFieldDef[]
}

/**
 * When the selected category matches a rule, those extra inputs appear in the voucher form.
 * Add a new rule here when a category needs more fields — no form rewrite required.
 */
export const CATEGORY_FIELD_RULES: CategoryFieldRule[] = [
  {
    heads: ['Cash Received'],
    types: ['Credit'],
    fields: [
      {
        key: 'party',
        label: 'From party',
        required: true,
        hint: 'Customer / party who paid',
        partySource: 'customer',
      },
      {
        key: 'paymentMethod',
        label: 'Payment type',
        required: true,
        hint: 'Cash, GPay, UPI, Bank…',
      },
      {
        key: 'markingBatch',
        label: 'Apply to marking',
        required: false,
        hint: 'Optional — unpaid invoice for this customer',
      },
    ],
  },
  {
    heads: ['Salary Advance', 'Salary'],
    types: ['Debit'],
    fields: [
      {
        key: 'advanceLink',
        label: 'Staff',
        required: true,
        hint: 'Staff this entry is for',
      },
    ],
  },
  {
    heads: ['Labour Advance', 'Labour Wage'],
    types: ['Debit'],
    fields: [
      {
        key: 'advanceLink',
        label: 'Labour gang',
        required: true,
        hint: 'Who this wage / advance is for',
      },
    ],
  },
  {
    heads: ['Vendor Payment', 'Vendor Bill'],
    types: ['Debit'],
    fields: [
      {
        key: 'party',
        label: 'Vendor / party',
        required: true,
        hint: 'Updates that vendor’s pending balance',
        partySource: 'vendor',
      },
    ],
  },
  {
    heads: ['Diesel'],
    types: ['Debit'],
    fields: [
      {
        key: 'litres',
        label: 'Litres',
        required: true,
        hint: 'Diesel quantity in litres',
      },
      {
        key: 'party',
        label: 'Supplier (optional)',
        required: false,
        hint: 'Diesel supplier / vendor',
        partySource: 'vendor',
      },
    ],
  },
  {
    heads: ['Machinery Rent'],
    types: ['Debit'],
    fields: [
      {
        key: 'refNote',
        label: 'Machinery name',
        required: true,
        hint: 'e.g. HM Crane, Hitachi 370',
      },
      {
        key: 'party',
        label: 'Owner / party (optional)',
        required: false,
        partySource: 'vendor',
      },
    ],
  },
  {
    heads: ['Purchase'],
    types: ['Debit', 'Credit'],
    fields: [
      {
        key: 'party',
        label: 'Supplier',
        required: false,
        hint: 'Vendor for this purchase',
        partySource: 'vendor',
      },
      {
        key: 'refNote',
        label: 'Reference',
        required: false,
        hint: 'Invoice / DC / block ref',
      },
    ],
  },
  {
    heads: ['Monthly Gift'],
    types: ['Debit'],
    fields: [
      {
        key: 'refNote',
        label: 'Name',
        required: true,
        hint: 'Person who received the gift',
      },
    ],
  },
  {
    heads: ['Royalty'],
    types: ['Debit', 'Credit'],
    fields: [
      {
        key: 'party',
        label: 'Party',
        required: false,
        hint: 'Royalty agent / authority',
        partySource: 'vendor',
      },
      {
        key: 'refNote',
        label: 'Reference',
        required: false,
        hint: 'Permit / DC / block ref',
      },
    ],
  },
]

export function fieldsForCategory(head: string, type: TxnType): ExtraFieldDef[] {
  const key = head.trim().toLowerCase()
  if (!key) return []
  const matched = CATEGORY_FIELD_RULES.filter((rule) => {
    if (rule.types && !rule.types.includes(type)) return false
    return rule.heads.some((name) => name.toLowerCase() === key)
  })
  // Merge fields if multiple rules hit the same head (rare)
  const seen = new Set<ExtraFieldKey>()
  const fields: ExtraFieldDef[] = []
  for (const rule of matched) {
    for (const field of rule.fields) {
      if (seen.has(field.key)) continue
      seen.add(field.key)
      fields.push(field)
    }
  }
  return fields
}
