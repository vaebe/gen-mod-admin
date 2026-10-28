import { unzipSync } from 'fflate'
import { parse } from 'yaml'
import type { ManifestSnapshot } from '../../../packages/contracts/src/index'
import { validName } from './validation'
import { hex } from './password'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
export function relativePath(value: string) {
  if (!value || /[:\\]/.test(value)) { throw new Error('无效相对路径') }
  for (const segment of value.split('/')) {
    if (!segment || segment === '.' || segment === '..' || /[ .]$|[<>"|?*\x00-\x1f\x7f]/.test(segment)
      || /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(?:\.|$)/i.test(segment)) { throw new Error('路径越界或 Windows 文件名无效') }
  }
  return value
}
function compareUtf8(a: string, b: string) {
  const left = encoder.encode(a); const right = encoder.encode(b)
  for (let i = 0; i < Math.min(left.length, right.length); i++) { if (left[i] !== right[i]) { return left[i]! - right[i]! } }
  return left.length - right.length
}
export function readPackage(bytes: Uint8Array) {
  // 中央目录保留 Unix 文件类型，解压前拒绝符号链接、加密及 Windows 路径冲突。
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = bytes.length - 22
  while (end >= Math.max(0, bytes.length - 65557) && view.getUint32(end, true) !== 0x06054b50) { end-- }
  if (end < 0 || end < bytes.length - 65557) { throw new Error('zip 格式无效') }
  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)
  const seen = new Set<string>()
  for (let index = 0; index < count; index++) {
    if (view.getUint32(offset, true) !== 0x02014b50) { throw new Error('zip 目录无效') }
    const length = view.getUint16(offset + 28, true)
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + length))
    const clean = name.endsWith('/') ? name.slice(0, -1) : name
    relativePath(clean)
    const key = name.toLowerCase()
    if (seen.has(key)) { throw new Error('zip 文件路径重复') }
    seen.add(key)
    if ((view.getUint16(offset + 8, true) & 1) || ((view.getUint32(offset + 38, true) >>> 16) & 0xf000) === 0xa000) { throw new Error('zip 不允许加密或符号链接') }
    offset += 46 + length + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true)
  }
  const unpacked = unzipSync(bytes)
  const files: Record<string, Uint8Array> = Object.create(null)
  for (const [path, content] of Object.entries(unpacked)) { if (!path.endsWith('/')) { relativePath(path); files[path] = content } }
  if (files['registry.json']) { throw new Error('zip 只包含文件本体，不得携带 registry.json') }
  return files
}
function inspection(bytes: Uint8Array) {
  const rule = JSON.parse(decoder.decode(bytes))
  const keys = (item: any, allowed: string[]) => item && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).every(key => allowed.includes(key))
  if (!keys(rule, ['schemaVersion', 'profiles']) || rule.schemaVersion !== 1 || !Array.isArray(rule.profiles) || rule.profiles.length < 1 || rule.profiles.length > 2) { throw new Error('调查规则版本或数量无效') }
  const kinds = new Set<string>()
  for (const profile of rule.profiles) {
    if (!keys(profile, ['kind', 'paths']) || !['install', 'references'].includes(profile.kind) || kinds.has(profile.kind) || !Array.isArray(profile.paths) || profile.paths.length < 1 || profile.paths.length > 64) { throw new Error('调查类型或路径数量无效') }
    kinds.add(profile.kind)
    for (const path of profile.paths) {
      if (!keys(path, ['relative', 'fact']) || typeof path.relative !== 'string' || !['engineMarker', 'referenceAssembly', 'loaderMarker'].includes(path.fact)) { throw new Error('调查路径无效') }
      const parts: string[] = path.relative.split('/')
      if (parts.length > 4 || parts.some(value => !value || value === '.' || value === '..') || /[\\:?\[\]]/.test(path.relative) || parts.slice(0, -1).some(value => value.includes('*')) || (parts[parts.length - 1]!.match(/\*/g)?.length ?? 0) > 1) { throw new Error('调查路径无效') }
    }
  }
}
export async function hashAndValidate(bytes: Uint8Array, manifest: ManifestSnapshot, skill: { name: string; description: string }) {
  if (!validName(skill.name) || !manifest.version.trim() || !['common', 'game'].includes(manifest.category) || (manifest.category === 'game' ? !manifest.gameId : manifest.gameId !== null)) { throw new Error('能力名称、版本、分类或游戏标识无效') }
  for (const path of manifest.excludePaths) { relativePath(path) }
  const files = readPackage(bytes)
  for (const script of manifest.requiredCommandScripts) { relativePath(script); if (!files[script]) { throw new Error(`必需命令脚本不存在：${script}`) } }
  if (manifest.inspectionFile) {
    relativePath(manifest.inspectionFile)
    if (!files[manifest.inspectionFile]) { throw new Error('调查规则文件不存在') }
    inspection(files[manifest.inspectionFile]!)
  }
  if (!files['SKILL.md']) { throw new Error('能力目录缺少 SKILL.md') }
  const lines = decoder.decode(files['SKILL.md']).split(/\r?\n/)
  const closing = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (lines[0] !== '---' || closing < 0) { throw new Error('SKILL.md 缺少 YAML frontmatter') }
  const front = parse(lines.slice(1, closing).join('\n'))
  if (!front || !validName(front.name ?? '') || typeof front.description !== 'string' || !front.description.trim()) { throw new Error('SKILL.md 需有效 name 和 description') }
  if (front.name !== skill.name || front.description.trim() !== skill.description.trim()) { throw new Error('能力清单与 SKILL.md 的 name/description 不一致') }
  // serde_json::json! 在现有 Rust 工程未启用 preserve_order，Map 按键名排序。
  const snapshot = {
    category: manifest.category, dependencies: manifest.dependencies, excludePaths: manifest.excludePaths,
    gameId: manifest.gameId, inspectionFile: manifest.inspectionFile,
    requiredCommandScripts: manifest.requiredCommandScripts, version: manifest.version,
  }
  const chunks = [encoder.encode(JSON.stringify(snapshot))]
  for (const path of Object.keys(files).sort(compareUtf8)) {
    const content = files[path]!
    chunks.push(encoder.encode(path), new Uint8Array([0]), encoder.encode(hex(await crypto.subtle.digest('SHA-256', new Uint8Array(content).buffer))), new Uint8Array([0]))
    if (path.endsWith('.md')) {
      for (const rest of decoder.decode(content).split('](').slice(1)) {
        const target = rest.split(')')[0]!.split(/\s/)[0]!.replace(/^[<>]+|[<>]+$/g, '')
        if (!target || target.startsWith('#') || target.startsWith('https://') || target.startsWith('http://')) { continue }
        const relative = target.split('#')[0]!
        const parts = path.split('/').slice(0, -1)
        if (/^[\/\\]|:|\\/.test(relative)) { throw new Error(`能力引用越界：${relative}`) }
        for (const part of relative.split('/')) {
          if (part === '..') { if (!parts.length) { throw new Error(`能力引用越界：${relative}`) }; parts.pop() }
          else if (part && part !== '.') { parts.push(part) }
        }
        const joined = parts.join('/')
        if (!files[joined] && !Object.keys(files).some(name => name.startsWith(`${joined}/`))) { throw new Error(`能力引用不存在：${relative}`) }
      }
    }
  }
  const combined = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length }
  return hex(await crypto.subtle.digest('SHA-256', combined))
}
