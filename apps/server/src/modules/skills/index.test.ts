import { expect, test } from "bun:test";
import { strToU8, zipSync } from "fflate";
import { fixture } from "../../test-support";

export const skillInput = {
  name: "workflow",
  description: "desc",
  kind: "common",
  gameId: null,
  dependencies: [],
  excludePaths: [],
  requiredCommandScripts: [],
  inspectionFile: null,
};
export const packageBytes = (content = "text") =>
  zipSync({ "SKILL.md": strToU8(`---\nname: workflow\ndescription: desc\n---\n${content}`) });
const upload = (version: string, bytes = packageBytes()) => {
  const form = new FormData();
  form.set("zip", new Blob([new Uint8Array(bytes).buffer]), "skill.zip");
  form.set("version", version);
  return form;
};
test("common Skill needs no game; game Skills require existing game; names unique and valid; admin only", async () => {
  const f = fixture();
  const admin = (await f.login()).body.accessToken;
  const user = (await f.login("user@example.com")).body.accessToken;
  expect((await f.request("/skills", "POST", skillInput, user)).status).toBe(403);
  const created = await f.request("/skills", "POST", skillInput, admin);
  expect(created.status).toBe(200);
  expect(created.body).toMatchObject({ ...skillInput });
  expect((await f.request("/skills", "POST", skillInput, admin)).status).toBe(409);
  expect((await f.request("/skills", "POST", { ...skillInput, name: "Bad" }, admin)).status).toBe(
    400,
  );
  for (const gameId of [null, "unknown"]) {
    expect(
      (
        await f.request(
          "/skills",
          "POST",
          { ...skillInput, name: "game-skill", kind: "game", gameId },
          admin,
        )
      ).status,
    ).toBe(400);
  }
  await f.request("/games", "POST", { id: "duckov", name: "Duckov", description: "" }, admin);
  const game = await f.request(
    "/skills",
    "POST",
    { ...skillInput, name: "duckov-mod", kind: "game", gameId: "duckov" },
    admin,
  );
  expect(game.status).toBe(200);
  expect(
    (f.sqlite.query("SELECT game_id FROM skills WHERE id=?").get(game.body.id) as any).game_id,
  ).toBe("duckov");
});
test("versions expose file ids and snapshots; file id downloads original zip; caps at five without auto-removal", async () => {
  const f = fixture();
  const token = (await f.login()).body.accessToken;
  const skill = (await f.request("/skills", "POST", skillInput, token)).body;
  expect((await f.request("/skills", "GET", undefined, token)).body[0].versions).toEqual([]);
  const original = packageBytes();
  const first = await f.request(
    `/skills/${skill.id}/versions`,
    "POST",
    upload("1", original),
    token,
  );
  expect(first.status).toBe(200);
  expect(first.body.manifest).toMatchObject({
    category: "common",
    gameId: null,
    version: "1",
    dependencies: [],
  });
  const file = await f.request(`/files/${first.body.fileId}`, "GET", undefined, token);
  expect(new Uint8Array(await file.response.arrayBuffer())).toEqual(original);
  expect((await f.request(`/skills/${skill.id}/versions`, "POST", upload("1"), token)).status).toBe(
    409,
  );
  expect(
    (
      await f.request(
        `/skills/${skill.id}/versions`,
        "POST",
        upload("1", packageBytes("changed")),
        token,
      )
    ).status,
  ).toBe(409);
  for (const version of ["2", "3", "4", "5"]) {
    expect(
      (await f.request(`/skills/${skill.id}/versions`, "POST", upload(version), token)).status,
    ).toBe(200);
  }
  const sixth = await f.request(`/skills/${skill.id}/versions`, "POST", upload("6"), token);
  expect(sixth.status).toBe(409);
  expect(sixth.body.error).toContain("先移除旧版本");
  expect((await f.request("/skills", "GET", undefined, token)).body[0].versions).toHaveLength(5);
  await f.request(`/skills/${skill.id}/versions/${first.body.id}`, "DELETE", undefined, token);
  expect(f.objects.has(first.body.fileId)).toBe(false);
  expect((await f.request(`/skills/${skill.id}/versions`, "POST", upload("6"), token)).status).toBe(
    200,
  );
});
test("D1 failure after successful R2 upload leaves version list unchanged", async () => {
  const f = fixture();
  const token = (await f.login()).body.accessToken;
  const skill = (await f.request("/skills", "POST", skillInput, token)).body;
  f.failVersionWrites();
  expect((await f.request(`/skills/${skill.id}/versions`, "POST", upload("1"), token)).status).toBe(
    500,
  );
  expect(f.objects.size).toBe(1);
  expect((await f.request("/skills", "GET", undefined, token)).body[0].versions).toEqual([]);
});

test("publishing edited description validates and saves files and metadata together", async () => {
  const f = fixture();
  const token = (await f.login()).body.accessToken;
  const skill = (await f.request("/skills", "POST", skillInput, token)).body;
  const form = upload(
    "2",
    zipSync({ "SKILL.md": strToU8("---\nname: workflow\ndescription: edited\n---\nbody") }),
  );
  form.set("description", "edited");
  const saved = await f.request(`/skills/${skill.id}/versions`, "POST", form, token);
  expect(saved.status).toBe(200);
  expect((await f.request("/skills", "GET", undefined, token)).body[0].description).toBe("edited");
});

test("failed publication preserves description and manifest as well as version list", async () => {
  const f = fixture();
  const token = (await f.login()).body.accessToken;
  const skill = (await f.request("/skills", "POST", skillInput, token)).body;
  const form = upload(
    "2",
    zipSync({ "SKILL.md": strToU8("---\nname: workflow\ndescription: edited\n---\nbody") }),
  );
  form.set("description", "edited");
  form.set("dependencies", '["other"]');
  f.failVersionWrites();
  expect((await f.request(`/skills/${skill.id}/versions`, "POST", form, token)).status).toBe(500);
  const current = (await f.request("/skills", "GET", undefined, token)).body[0];
  expect(current).toMatchObject({ description: "desc", dependencies: [], versions: [] });
});

test("a duplicate version created during R2 upload still returns an explicit conflict", async () => {
  const f = fixture();
  const token = (await f.login()).body.accessToken;
  const skill = (await f.request("/skills", "POST", skillInput, token)).body;
  const put = f.env.SKILL_PACKS.put.bind(f.env.SKILL_PACKS);
  f.env.SKILL_PACKS.put = (async (...args: Parameters<typeof put>) => {
    const result = await put(...args);
    f.sqlite
      .query("INSERT INTO skill_versions VALUES (?,?,?,?,?,?,?)")
      .run("raced", skill.id, "1", "existing-hash", "existing-file", "now", "{}");
    return result;
  }) as typeof put;
  const result = await f.request(`/skills/${skill.id}/versions`, "POST", upload("1"), token);
  expect(result.status).toBe(409);
  expect(result.body.error).toContain("版本号已存在");
  expect(f.sqlite.query("SELECT id FROM skill_versions").all()).toEqual([{ id: "raced" }]);
});

test("invalid upload bodies are rejected before writing R2 or D1", async () => {
  const f = fixture();
  const token = (await f.login()).body.accessToken;
  const skill = (await f.request("/skills", "POST", skillInput, token)).body;
  const invalid = await f.request(
    `/skills/${skill.id}/versions`,
    "POST",
    { version: "1", zip: "not-a-file" },
    token,
  );
  expect(invalid.status).toBe(400);
  expect(invalid.body.error).toBeString();
  expect(f.objects.size).toBe(0);
  expect((await f.request("/skills", "GET", undefined, token)).body[0].versions).toEqual([]);
});

test("multipart JSON fields are decoded by the upload model and invalid values do not write data", async () => {
  const f = fixture();
  const token = (await f.login()).body.accessToken;
  const skill = (await f.request("/skills", "POST", skillInput, token)).body;
  for (const [field, value] of [
    ["dependencies", "{broken"],
    ["excludePaths", "[42]"],
    ["requiredCommandScripts", "{}"],
    ["inspectionFile", "{broken"],
    ["inspectionFile", "42"],
  ]) {
    const form = upload("invalid");
    form.set(field, value);
    expect((await f.request(`/skills/${skill.id}/versions`, "POST", form, token)).status).toBe(400);
  }
  expect(f.objects.size).toBe(0);
  const form = upload("1");
  form.set("dependencies", '["dependency"]');
  form.set("excludePaths", '["build"]');
  form.set("inspectionFile", "null");
  const saved = await f.request(`/skills/${skill.id}/versions`, "POST", form, token);
  expect(saved.status).toBe(200);
  expect(saved.body.manifest).toMatchObject({
    dependencies: ["dependency"],
    excludePaths: ["build"],
    inspectionFile: null,
  });
});
