import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { message } from 'antd'

import { createStaff, deleteStaff, listStaff, updateStaff } from '@/api/staff'
import { errorMessage } from '@/api/http'
import type { Staff, StaffDraft } from '@/types/staff'

type StaffContextValue = {
  staff: Staff[]
  loading: boolean
  staffForQuarry: (quarryId?: string) => Staff[]
  getStaff: (id?: string | null) => Staff | undefined
  addStaff: (draft: StaffDraft) => Promise<Staff>
  updateStaffMember: (id: string, draft: StaffDraft) => Promise<void>
  removeStaff: (id: string) => Promise<void>
}

const StaffContext = createContext<StaffContextValue | null>(null)

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const rows = await listStaff()
    setStaff(rows)
  }, [])

  useEffect(() => {
    reload()
      .catch((error) => {
        message.error(errorMessage(error, 'Could not load staff') ?? 'Could not load staff')
      })
      .finally(() => setLoading(false))
  }, [reload])

  const staffForQuarry = useCallback(
    (quarryId?: string) => {
      const list = quarryId ? staff.filter((row) => row.quarryId === quarryId) : staff
      return [...list].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'Active' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    },
    [staff],
  )

  const getStaff = useCallback((id?: string | null) => staff.find((row) => row.id === id), [staff])

  const addStaff = useCallback(async (draft: StaffDraft) => {
    const next = await createStaff(draft)
    setStaff((current) => [next, ...current.filter((row) => row.id !== next.id)])
    return next
  }, [])

  const updateStaffMember = useCallback(async (id: string, draft: StaffDraft) => {
    const next = await updateStaff(id, draft)
    setStaff((current) => current.map((row) => (row.id === id ? next : row)))
  }, [])

  const removeStaff = useCallback(async (id: string) => {
    await deleteStaff(id)
    setStaff((current) => current.filter((row) => row.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      staff,
      loading,
      staffForQuarry,
      getStaff,
      addStaff,
      updateStaffMember,
      removeStaff,
    }),
    [staff, loading, staffForQuarry, getStaff, addStaff, updateStaffMember, removeStaff],
  )

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>
}

export function useStaff() {
  const ctx = useContext(StaffContext)
  if (!ctx) throw new Error('useStaff must be used within StaffProvider')
  return ctx
}
