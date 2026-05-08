import PocketBase from 'pocketbase'
import type { AuthUser } from './types'

const pbUrl = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090'

export const pb = new PocketBase(pbUrl)

pb.autoRefresh(true)

export function login(email: string, password: string): Promise<AuthUser> {
  return pb.collection('_superusers').authWithPassword<AuthUser>(email, password)
}

export function logout(): void {
  pb.authStore.clear()
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid
}

export function getAuthUser(): AuthUser | null {
  return isAuthenticated() ? (pb.authStore.model as AuthUser | null) : null
}
