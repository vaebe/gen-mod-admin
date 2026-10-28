import { expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { strToU8, unzipSync, zipSync } from "fflate";
import { hashAndValidate } from "./skill-package";

export const manifest = {
  category: "common" as const,
  gameId: null,
  version: "2.1.0",
  dependencies: [],
  excludePaths: [".delivery", "build"],
  requiredCommandScripts: [],
  inspectionFile: null,
};
export const description =
  "当在 GenMod 工作台新建、续改、排查、整理玩家反馈或交付游戏 MOD 时使用。";
export const validZip = () =>
  new Uint8Array(readFileSync(new URL("./fixtures/mod-workflow.zip", import.meta.url)));
const validate = (bytes = validZip(), fields = manifest, name = "mod-workflow") =>
  hashAndValidate(bytes, fields, { name, description });
test("valid real workflow zip produces stable hash, independent of zip container bytes", async () => {
  const bytes = validZip();
  const hash = await validate(bytes);
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
  expect(hash).toBe("ec595d7587ddc7c3bcac08679b73c823438689822b7ed7e6ce2bd8c57d1f7a91");
  expect(await validate(zipSync(unzipSync(bytes), { level: 0 }))).toBe(hash);
  expect(await validate(bytes, { ...manifest, version: "2.2.0" })).not.toBe(hash);
});
test("rejects missing, mismatching and nested SKILL.md", async () => {
  await rejects(validate(validZip(), manifest, "different"), /不一致/);
  await rejects(validate(zipSync({ "readme.txt": strToU8("missing") })), /SKILL.md/);
  const nested = Object.fromEntries(
    Object.entries(unzipSync(validZip())).map(([name, bytes]) => [`nested/${name}`, bytes]),
  );
  await rejects(validate(zipSync(nested)), /SKILL.md/);
});
test("requires declared scripts and valid inspection rules; refuses escaping or missing Markdown links", async () => {
  await rejects(
    hashAndValidate(
      validZip(),
      { ...manifest, requiredCommandScripts: ["scripts/missing.ps1"] },
      { name: "mod-workflow", description },
    ),
    /脚本/,
  );
  const files = unzipSync(validZip());
  files["references/bad.md"] = strToU8("[escape](../../outside.md)");
  await rejects(validate(zipSync(files)), /越界/);
  files["references/bad.md"] = strToU8("[missing](not-here.md)");
  await rejects(validate(zipSync(files)), /不存在/);
  files["references/bad.md"] = strToU8("text");
  files["inspection.json"] = strToU8('{"schemaVersion":9,"profiles":[]}');
  await rejects(
    hashAndValidate(
      zipSync(files),
      { ...manifest, inspectionFile: "inspection.json" },
      { name: "mod-workflow", description },
    ),
    /调查/,
  );
});
