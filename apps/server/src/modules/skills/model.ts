import { getSchemaValidator, t } from "elysia";

const manifestFields = {
  dependencies: t.Array(t.String()),
  excludePaths: t.Array(t.String()),
  requiredCommandScripts: t.Array(t.String()),
  inspectionFile: t.Union([t.String(), t.Null()]),
};
const optionalFields = {
  dependencies: t.Optional(manifestFields.dependencies),
  excludePaths: t.Optional(manifestFields.excludePaths),
  requiredCommandScripts: t.Optional(manifestFields.requiredCommandScripts),
  inspectionFile: t.Optional(manifestFields.inspectionFile),
};
const skillFields = {
  id: t.String(),
  name: t.String(),
  description: t.String(),
  ...manifestFields,
};
const record = t.Union([
  t.Object({ ...skillFields, kind: t.Literal("common"), gameId: t.Null() }),
  t.Object({ ...skillFields, kind: t.Literal("game"), gameId: t.String() }),
]);
const snapshot = t.Union([
  t.Object({
    ...manifestFields,
    version: t.String(),
    category: t.Literal("common"),
    gameId: t.Null(),
  }),
  t.Object({
    ...manifestFields,
    version: t.String(),
    category: t.Literal("game"),
    gameId: t.String(),
  }),
]);
const version = t.Object({
  id: t.String(),
  skillId: t.String(),
  version: t.String(),
  contentHash: t.String(),
  fileId: t.String(),
  uploadedAt: t.String(),
  manifest: snapshot,
});
const catalog = t.Union([
  t.Object({
    ...skillFields,
    kind: t.Literal("common"),
    gameId: t.Null(),
    versions: t.Array(version),
  }),
  t.Object({
    ...skillFields,
    kind: t.Literal("game"),
    gameId: t.String(),
    versions: t.Array(version),
  }),
]);
export const SkillModel = {
  create: t.Object({
    name: t.String(),
    description: t.String({ minLength: 1 }),
    kind: t.Union([t.Literal("common"), t.Literal("game")]),
    gameId: t.Union([t.String(), t.Null()]),
    ...optionalFields,
  }),
  update: t.Object(
    { description: t.String({ minLength: 1 }), ...optionalFields },
    { additionalProperties: false },
  ),
  upload: t.Object({
    version: t.String({ minLength: 1, pattern: "\\S" }),
    fileId: t.String({ format: "uuid" }),
    contentHash: t.String({ pattern: "^[a-f0-9]{64}$" }),
    description: t.String({ minLength: 1 }),
    ...manifestFields,
  }),
  uploadParams: t.Object({ id: t.String(), fileId: t.String({ format: "uuid" }) }),
  params: t.Object({ id: t.String() }),
  versionParams: t.Object({ id: t.String(), versionId: t.String() }),
  fileParams: t.Object({ fileId: t.String() }),
  record,
  version,
  snapshot,
  list: t.Array(catalog),
} as const;

export const SkillCodec = {
  strings: getSchemaValidator(manifestFields.dependencies, { dynamic: true }),
  snapshot: getSchemaValidator(snapshot, { dynamic: true }),
};

export type CreateSkill = typeof SkillModel.create.static;
export type UpdateSkill = typeof SkillModel.update.static;
export type PublishSkill = typeof SkillModel.upload.static;
export type SkillRecord = typeof SkillModel.record.static;
export type SkillVersionRecord = typeof SkillModel.version.static;
export type ManifestSnapshot = typeof SkillModel.snapshot.static;
export type CatalogSkill = (typeof SkillModel.list.static)[number];
