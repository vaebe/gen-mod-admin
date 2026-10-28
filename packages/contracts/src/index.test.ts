import type { GameRecord, SkillRecord, SkillVersionRecord, ManifestSnapshot } from './index'

const game: GameRecord = { id: 'duckov', name: '逃离鸭科夫', description: 'desc' }
const skill: SkillRecord = {
  id: 'skill-uuid', name: 'duckov-mod', description: 'desc', kind: 'game', gameId: 'duckov',
  dependencies: ['mod-workflow'], excludePaths: ['bin', 'obj'],
  requiredCommandScripts: ['scripts/build.ps1'], inspectionFile: 'references/inspection.json',
}
const version: SkillVersionRecord = {
  id: 'ver-uuid', skillId: skill.id, version: '2.1.0', contentHash: 'a'.repeat(64),
  fileId: 'file-uuid', uploadedAt: '2026-10-23T00:00:00Z',
  manifest: {
    category: 'game', gameId: 'duckov', version: '2.1.0', dependencies: ['mod-workflow'],
    excludePaths: ['bin', 'obj'], requiredCommandScripts: ['scripts/build.ps1'],
    inspectionFile: 'references/inspection.json',
  },
}
const common: SkillRecord = {
  id: 'common-uuid', name: 'mod-workflow', description: 'desc', kind: 'common', gameId: null,
  dependencies: [], excludePaths: [], requiredCommandScripts: [], inspectionFile: null,
}
const manifest: ManifestSnapshot = version.manifest
void [game, skill, common, manifest]
