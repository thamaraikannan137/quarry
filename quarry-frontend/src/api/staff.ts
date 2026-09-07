import { api } from '@/api/http'
import type { Staff, StaffDraft } from '@/types/staff'

type ApiStaff = Staff & { kind: string; status: string }

function fromApi(row: ApiStaff): Staff {
  return {
    id: row.id,
    quarryId: row.quarryId,
    name: row.name,
    designation: row.designation ?? '',
    basicSalary: Number(row.basicSalary) || 0,
    phone: row.phone ?? '',
    bankName: row.bankName ?? '',
    accountNumber: row.accountNumber ?? '',
    ifsc: row.ifsc ?? '',
    branch: row.branch ?? '',
    status: row.status === 'Inactive' ? 'Inactive' : 'Active',
    notes: row.notes ?? '',
  }
}

function toPayload(draft: StaffDraft) {
  return {
    name: draft.name.trim(),
    designation: draft.designation.trim(),
    kind: 'Staff',
    basicSalary: Number(draft.basicSalary) || 0,
    phone: draft.phone.trim(),
    bankName: draft.bankName.trim(),
    accountNumber: draft.accountNumber.trim(),
    ifsc: draft.ifsc.trim(),
    branch: draft.branch.trim(),
    status: draft.status,
    notes: draft.notes.trim(),
    quarryId: draft.quarryId,
  }
}

export async function listStaff() {
  const rows = await api<ApiStaff[]>('/api/staff')
  return rows.map(fromApi)
}

export async function createStaff(draft: StaffDraft) {
  const row = await api<ApiStaff>('/api/staff', {
    method: 'POST',
    body: JSON.stringify(toPayload(draft)),
  })
  return fromApi(row)
}

export async function updateStaff(id: string, draft: StaffDraft) {
  const row = await api<ApiStaff>(`/api/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toPayload(draft)),
  })
  return fromApi(row)
}

export async function deleteStaff(id: string) {
  await api<void>(`/api/staff/${id}`, { method: 'DELETE' })
}
