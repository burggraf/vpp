import PocketBase from 'pocketbase'
import { config } from './config'

let pb: PocketBase | null = null

export function getPb(): PocketBase {
  if (!pb) {
    pb = new PocketBase(config.PB_URL)
  }
  return pb
}

export async function authAdmin(): Promise<PocketBase> {
  const client = getPb()
  try {
    await client.admins.authWithPassword(
      config.PB_ADMIN_EMAIL,
      config.PB_ADMIN_PASSWORD
    )
  } catch (err) {
    console.error('❌ PocketBase admin auth failed:', err)
    throw err
  }
  return client
}

// Generic CRUD helpers
export async function pbList(
  collection: string,
  params?: Record<string, unknown>
) {
  const pb = await authAdmin()
  return pb.collection(collection).getList(1, 50, {
    ...params,
    sort: '-created',
  })
}

export async function pbGetOne(collection: string, id: string) {
  const pb = await authAdmin()
  return pb.collection(collection).getOne(id)
}

export async function pbCreate(
  collection: string,
  data: Record<string, unknown>
) {
  const pb = await authAdmin()
  return pb.collection(collection).create(data)
}

export async function pbUpdate(
  collection: string,
  id: string,
  data: Record<string, unknown>
) {
  const pb = await authAdmin()
  return pb.collection(collection).update(id, data)
}

export async function pbDelete(collection: string, id: string) {
  const pb = await authAdmin()
  return pb.collection(collection).delete(id)
}
