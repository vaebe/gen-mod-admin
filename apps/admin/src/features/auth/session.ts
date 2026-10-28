import { shallowRef } from 'vue'
import type { AuthUser } from '../../types'
import { api, ApiError } from '../../lib/api'
export const user = shallowRef<AuthUser | null>(null)
let loaded = false
export async function loadUser() {
  if (!loaded) {
    try { user.value = await api<AuthUser>('/auth/me') }
    catch (error) { if (!(error instanceof ApiError) || error.status !== 401) { throw error }; user.value = null }
    loaded = true
  }
  return user.value
}
export function loggedIn(value: AuthUser) { user.value = { email: value.email, role: value.role }; loaded = true }
export async function logout() { await api('/auth/logout', 'POST', {}); user.value = null; loaded = true }
