import { expect, test } from "bun:test";
import { fixture } from "../../test-support";

test("only admins mutate games, signed-in users can list", async () => {
  const f = fixture();
  const user = (await f.login("user@example.com")).body.accessToken;
  expect(
    (await f.request("/games", "POST", { id: "duckov", name: "Duckov", description: "desc" }, user))
      .status,
  ).toBe(403);
  expect((await f.request("/games")).status).toBe(401);
  expect((await f.request("/games", "GET", undefined, user)).status).toBe(200);
});
test("creates and edits games without changing stable ids, rejects duplicates and invalid ids", async () => {
  const f = fixture();
  const token = (await f.login()).body.accessToken;
  for (const id of ["", "-duck", "duck-", "duck--mod", "Duck", "a".repeat(65), "鸭"]) {
    expect(
      (await f.request("/games", "POST", { id, name: "Duckov", description: "desc" }, token))
        .status,
    ).toBeGreaterThanOrEqual(400);
  }
  const input = { id: "duckov", name: "Duckov", description: "desc" };
  expect((await f.request("/games", "POST", input, token)).status).toBe(200);
  expect((await f.request("/games", "POST", input, token)).status).toBe(409);
  expect(
    (await f.request("/games/duckov", "PATCH", { name: "鸭科夫", description: "new" }, token))
      .status,
  ).toBe(200);
  expect((await f.request("/games", "GET", undefined, token)).body).toEqual([
    { ...input, name: "鸭科夫", description: "new" },
  ]);
  await f.request(
    "/games/duckov",
    "PATCH",
    { id: "other", name: "鸭科夫", description: "new" },
    token,
  );
  expect((await f.request("/games", "GET", undefined, token)).body[0].id).toBe("duckov");
});
test("deletes unbound games but preserves bound games", async () => {
  const f = fixture();
  const token = (await f.login()).body.accessToken;
  await f.request("/games", "POST", { id: "duckov", name: "Duckov", description: "desc" }, token);
  f.sqlite.run(
    "INSERT INTO skills(id,name,description,kind,game_id,created_at) VALUES ('s','duckov-mod','desc','game','duckov','now')",
  );
  expect((await f.request("/games/duckov", "DELETE", undefined, token)).status).toBe(409);
  f.sqlite.run("DELETE FROM skills");
  expect((await f.request("/games/duckov", "DELETE", undefined, token)).status).toBe(200);
  expect((await f.request("/games", "GET", undefined, token)).body).toEqual([]);
});
