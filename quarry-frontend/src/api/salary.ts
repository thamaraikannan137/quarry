import { api } from '@/api/http'
import type { SalarySheet } from '@/types/salary'

export async function listSalarySheet(quarryId: string, month: string) {
  return api<SalarySheet>(
    `/api/salary?quarryId=${encodeURIComponent(quarryId)}&month=${encodeURIComponent(month)}`,
  )
}
