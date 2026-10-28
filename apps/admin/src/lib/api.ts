const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export async function response(path: string, init: RequestInit = {}) {
  const result = await fetch(`${base}${path}`, { ...init, credentials: 'include' })
  if (!result.ok) {
    const body = await result.json().catch(() => null)
    throw new ApiError(result.status, body?.error || body?.message || `请求失败（${result.status}）`)
  }
  return result
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  return (await response(path, {
    method,
    ...(body === undefined ? {} : body instanceof FormData ? { body } : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })).json()
}
export const message = (error: unknown) => error instanceof Error ? error.message : String(error)
