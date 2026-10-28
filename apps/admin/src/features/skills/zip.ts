import { zipSync } from 'fflate'
export function readBytes(file: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer)); reader.onerror = () => reject(reader.error); reader.readAsArrayBuffer(file) })
}
export async function folderZip(files: File[]) {
  const entries: Record<string, Uint8Array> = Object.create(null)
  for (const file of files) {
    const path = file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(1).join('/') : file.name
    entries[path] = await readBytes(file)
  }
  if (!entries['SKILL.md']) { throw new Error('请选择根目录直接包含 SKILL.md 的文件夹') }
  return zipSync(entries)
}
