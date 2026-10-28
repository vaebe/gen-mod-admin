import { t } from "elysia";

const fields = { name: t.String({ minLength: 1 }), description: t.String() };
const record = t.Object({ id: t.String(), ...fields });

export const GameModel = {
  create: record,
  update: t.Object(fields, { additionalProperties: false }),
  params: t.Object({ id: t.String() }),
  record,
  list: t.Array(record),
} as const;

export type CreateGame = typeof GameModel.create.static;
export type UpdateGame = typeof GameModel.update.static;
export type GameRecord = typeof GameModel.record.static;
