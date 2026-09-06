import type { TxnType } from '@/types/transaction'

export type ExtraFieldKey = 'party' | 'advanceLink' | 'litres' | 'refNote'

export type ExtraFieldDef = {
  key: ExtraFieldKey
  label: string
  required?: boolean
  hint?: string
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
      },
    ],
  },
  {
    heads: ['Salary Advance', 'Labour Advance'],
    types: ['Debit'],
    fields: [
      {
        key: 'advanceLink',
        label: 'Link to person / gang',
        required: true,
        hint: 'So the advance shows on salary / labour sheets later',
      },
    ],
  },
  {
    heads: ['Salary', 'Labour Wage'],
    types: ['Debit'],
    fields: [
      {
        key: 'advanceLink',
        label: 'Link to person / gang',
        required: true,
        hint: 'Who this wage / salary payment is for',
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
        required: false,
        hint: 'Optional — diesel quantity',
      },
      {
        key: 'party',
        label: 'Supplier (optional)',
        required: false,
        hint: 'Bulk supplier / vendor',
      },
    ],
  },
  {
    heads: ['Machinery Rent'],
    types: ['Debit'],
    fields: [
      {
        key: 'refNote',
        label: 'Machine / unit',
        required: false,
        hint: 'e.g. HM Crane, Hitachi 370',
      },
      {
        key: 'party',
        label: 'Owner / party (optional)',
        required: false,
      },
    ],
  },
  {
    heads: ['Purchase', 'Royalty'],
    types: ['Debit', 'Credit'],
    fields: [
      {
        key: 'party',
        label: 'Party',
        required: false,
        hint: 'Customer or supplier for this entry',
      },
      {
        key: 'refNote',
        label: 'Reference',
        required: false,
        hint: 'Invoice / DC / block ref',
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
