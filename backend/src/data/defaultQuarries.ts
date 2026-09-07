import { Quarry } from '../db/models/Quarry.js'

export const DEFAULT_QUARRIES = [
  {
    id: 'q_chitha',
    name: 'Chithanavasal',
    code: 'CHITHA',
    place: 'Illuppur / Pudukkottai',
  },
  {
    id: 'q_ariyur',
    name: 'Ariyur',
    code: 'ARIYUR',
    place: 'Madurai Dist',
  },
] as const

export async function ensureDefaultQuarries() {
  for (const quarry of DEFAULT_QUARRIES) {
    await Quarry.upsert({ ...quarry })
  }
}
