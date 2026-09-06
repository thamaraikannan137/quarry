import type { DispatchTrip } from '@/types/dispatch'

/**
 * Demo trips: mix blocks from different markings on one lorry where useful.
 * Pending demo blocks (mk5, mk10) are left off trips.
 */
export const DEMO_DISPATCHES: DispatchTrip[] = [
  {
    id: 'dp1',
    loadNo: 'LD-001',
    quarryId: 'q_chitha',
    date: '2026-07-06',
    lorryNo: 'TN-58-AB-4421',
    fromLocation: 'Chithanavasal',
    toLocation: 'Madurai yard',
    blockIds: ['mk1', 'mk2', 'mk3'],
  },
  {
    id: 'dp2',
    loadNo: 'LD-002',
    quarryId: 'q_chitha',
    date: '2026-07-10',
    lorryNo: 'TN-58-CD-1188',
    fromLocation: 'Chithanavasal',
    toLocation: 'Salem',
    // Different markings on one lorry
    blockIds: ['mk4', 'mk6'],
  },
  {
    id: 'dp3',
    loadNo: 'LD-003',
    quarryId: 'q_chitha',
    date: '2026-07-14',
    lorryNo: 'TN-58-EF-0092',
    fromLocation: 'Chithanavasal',
    toLocation: 'Tirupur',
    blockIds: ['mk7', 'mk11'],
  },
  {
    id: 'dp4',
    loadNo: 'LD-004',
    quarryId: 'q_chitha',
    date: '2026-08-05',
    lorryNo: 'TN-58-GH-7733',
    fromLocation: 'Chithanavasal',
    toLocation: 'Coimbatore',
    blockIds: ['mk8', 'mk9'],
  },
  {
    id: 'dp5',
    loadNo: 'LD-001',
    quarryId: 'q_ariyur',
    date: '2026-07-22',
    lorryNo: 'TN-45-JK-2201',
    fromLocation: 'Ariyur',
    toLocation: 'Erode',
    blockIds: ['mk12', 'mk13'],
  },
]
