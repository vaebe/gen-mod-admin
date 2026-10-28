const encoder = new TextEncoder()
export const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
const unhex = (value: string) => Uint8Array.from(value.match(/../g) ?? [], pair => parseInt(pair, 16))
export async function digest(value: string) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value))) }
async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt).buffer, iterations }, key, 256))
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$100000$${hex(salt)}$${await derive(password, salt, 100000)}`
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, rounds, salt, expected] = encoded.split('$')
  if (algorithm !== 'pbkdf2' || !salt || !expected) { return false }
  const actual = await derive(password, unhex(salt), Number(rounds))
  let difference = actual.length ^ expected.length
  for (let index = 0; index < actual.length; index++) { difference |= actual.charCodeAt(index) ^ (expected.charCodeAt(index) || 0) }
  return difference === 0
}
