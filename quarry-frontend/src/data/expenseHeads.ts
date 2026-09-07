export const EXPENSE_HEADS = [
  'Diesel',
  'Grocery / Food',
  'Labour Advance',
  'Labour Wage',
  'Salary Advance',
  'Salary',
  'Transport',
  'Repair',
  'Purchase',
  'Royalty',
  'Machinery Rent',
  'EB / Electricity',
  'Vendor Bill',
  'Vendor Payment',
  'Finance / EMI',
  'Monthly Gift',
  'Pooja',
  'Medical',
  'Cash Received',
  'Other',
] as const

export const CREDIT_HEADS = ['Cash Received', 'Other'] as const

/** Daily quarry spend on Purchase & Expense. HR wages stay on salary / labour later. */
export const PURCHASE_EXPENSE_HEADS = [
  'Diesel',
  'Grocery / Food',
  'Transport',
  'Repair',
  'Purchase',
  'EB / Electricity',
  'Pooja',
  'Medical',
  'Vendor Bill',
  'Vendor Payment',
  'Royalty',
  'Machinery Rent',
  'Finance / EMI',
  'Monthly Gift',
  'Other',
] as const

const OTHER_MODULE_HEADS = new Set(
  [
    'Cash Received',
    'Labour Advance',
    'Labour Wage',
    'Salary Advance',
    'Salary',
    'Monthly Gift',
    'Royalty',
    'Machinery Rent',
  ].map((name) => name.toLowerCase()),
)

export function isPurchaseExpenseHead(head: string) {
  return !OTHER_MODULE_HEADS.has(head.trim().toLowerCase())
}

export function isMonthlyGiftHead(head: string) {
  return head.trim().toLowerCase() === 'monthly gift'
}

export function isRoyaltyHead(head: string) {
  return head.trim().toLowerCase() === 'royalty'
}

export function isMachineryRentHead(head: string) {
  return head.trim().toLowerCase() === 'machinery rent'
}

export function isSalaryAdvanceHead(head: string) {
  return head.trim().toLowerCase() === 'salary advance'
}

export function isSalaryPayoutHead(head: string) {
  return head.trim().toLowerCase() === 'salary'
}
