export const STAFF_STATUSES = ['Active', 'Inactive'] as const
export type StaffStatus = (typeof STAFF_STATUSES)[number]

export type Staff = {
  id: string
  quarryId: string
  name: string
  designation: string
  basicSalary: number
  phone: string
  bankName: string
  accountNumber: string
  ifsc: string
  branch: string
  status: StaffStatus
  notes: string
}

export type StaffDraft = {
  name: string
  designation: string
  basicSalary: number
  phone: string
  bankName: string
  accountNumber: string
  ifsc: string
  branch: string
  status: StaffStatus
  notes: string
  quarryId: string
}

export function emptyStaffDraft(quarryId: string): StaffDraft {
  return {
    name: '',
    designation: '',
    basicSalary: 0,
    phone: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    branch: '',
    status: 'Active',
    notes: '',
    quarryId,
  }
}
