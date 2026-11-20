import colture from '../data/colture.json'
import { kvGet, kvSet } from '../adapters/storage/kv'
import { EMPTY_USER_CROPS, type Crop, type UserCrops } from '../core/sowing/crops'

/** The built-in table (src/data/colture.json). */
export const BASE_CROPS = colture as unknown as Crop[]

const KEY = 'crops:user'

export async function loadUserCrops(): Promise<UserCrops> {
  const v = await kvGet<UserCrops>(KEY)
  return v ? { overrides: v.overrides ?? {}, custom: v.custom ?? [] } : EMPTY_USER_CROPS
}

export async function saveUserCrops(u: UserCrops): Promise<void> {
  // UI state may be reactive proxies, which IndexedDB cannot clone: store plain data
  await kvSet(KEY, JSON.parse(JSON.stringify(u)))
}
