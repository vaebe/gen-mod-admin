export function validName(value: string) {
  return value.length >= 1 && value.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}
