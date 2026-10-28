import { expect, test } from "bun:test";
import { fixture } from "../../test-support";

test("registers without exposing hashes and rejects duplicate email and wrong passwords", async () => {
  const f = fixture();
  const input = { email: "a@b.c", password: "password12" };
  const registered = await f.request("/auth/register", "POST", input);
  expect(registered.status).toBe(200);
  expect(JSON.stringify(registered.body)).not.toContain("password");
  expect((await f.request("/auth/register", "POST", input)).status).toBe(409);
  expect((await f.request("/auth/login", "POST", { ...input, password: "wrong" })).status).toBe(
    401,
  );
  const row = f.sqlite.query("SELECT password_hash FROM users").get() as any;
  expect(row.password_hash).not.toContain("password12");
});

test("login returns desktop tokens and HttpOnly cookie; both authorize me", async () => {
  const f = fixture();
  const result = await f.login();
  expect(result.status).toBe(200);
  expect(result.body).toMatchObject({ email: "admin@example.com", role: "admin" });
  expect(result.body.accessToken).toBeString();
  expect(result.body.refreshToken).toBeString();
  const cookie = result.response.headers.get("set-cookie")!;
  expect(cookie).toContain("HttpOnly");
  expect((await f.request("/auth/me", "GET", undefined, result.body.accessToken)).body.role).toBe(
    "admin",
  );
  expect(
    (await f.request("/auth/me", "GET", undefined, undefined, cookie.split(";")[0])).status,
  ).toBe(200);
  expect((await f.request("/auth/me")).status).toBe(401);
  expect((await f.login("user@example.com")).body.role).toBe("user");
});

test("refresh rejects forged credentials as 401 and renews real credentials", async () => {
  const f = fixture();
  const logged = await f.login();
  expect((await f.request("/auth/refresh", "POST", { refreshToken: "forged" })).status).toBe(401);
  const refreshed = await f.request("/auth/refresh", "POST", {
    refreshToken: logged.body.refreshToken,
  });
  expect(refreshed.status).toBe(200);
  expect((await f.request("/auth/me", "GET", undefined, refreshed.body.accessToken)).status).toBe(
    200,
  );
});

test("desktop and browser logout revoke only their own credentials", async () => {
  const f = fixture();
  const logged = await f.login();
  const cookie = logged.response.headers.get("set-cookie")!.split(";")[0];
  await f.request("/auth/logout", "POST", { refreshToken: logged.body.refreshToken });
  expect((await f.request("/auth/me", "GET", undefined, undefined, cookie)).status).toBe(200);
  expect(
    (await f.request("/auth/refresh", "POST", { refreshToken: logged.body.refreshToken })).status,
  ).toBe(401);
  const desktop = await f.login();
  await f.request("/auth/logout", "POST", {}, undefined, cookie);
  expect((await f.request("/auth/me", "GET", undefined, undefined, cookie)).status).toBe(401);
  expect((await f.request("/auth/me", "GET", undefined, desktop.body.accessToken)).status).toBe(
    200,
  );
});

test("ADMIN_EMAILS changes take effect at the next login, not on every request", async () => {
  const f = fixture();
  const logged = await f.login();
  f.env.ADMIN_EMAILS = "";
  expect((await f.request("/auth/me", "GET", undefined, logged.body.accessToken)).body.role).toBe(
    "admin",
  );
  const next = await f.request("/auth/login", "POST", {
    email: "admin@example.com",
    password: "password12",
  });
  expect(next.body.role).toBe("user");
  expect((await f.request("/auth/me", "GET", undefined, next.body.accessToken)).body.role).toBe(
    "user",
  );
});

test("controller cookies keep parent-domain options and desktop logout leaves browser cookie untouched", async () => {
  const f = fixture();
  f.env.COOKIE_DOMAIN = ".example.com";
  const registered = await f.request("/auth/register", "POST", {
    email: "admin@example.com",
    password: "password12",
  });
  expect(registered.status).toBe(200);
  const logged = await f.request("/auth/login", "POST", {
    email: "admin@example.com",
    password: "password12",
  });
  const cookie = logged.response.headers.get("set-cookie")!;
  expect(cookie).toContain("Domain=.example.com");
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Lax");
  const browserSession = cookie.split(";")[0];
  const desktop = await f.request("/auth/logout", "POST", {
    refreshToken: logged.body.refreshToken,
  });
  expect(desktop.response.headers.get("set-cookie")).toBeNull();
  expect((await f.request("/auth/me", "GET", undefined, undefined, browserSession)).status).toBe(
    200,
  );
  const browser = await f.request("/auth/logout", "POST", {}, undefined, browserSession);
  expect(browser.response.headers.get("set-cookie")).toContain("Max-Age=0");
});

test("HTTPS login sets a Secure parent-domain cookie through the controller", async () => {
  const f = fixture();
  f.env.COOKIE_DOMAIN = ".example.com";
  await f.request("/auth/register", "POST", { email: "admin@example.com", password: "password12" });
  const result = await f.app.handle(
    new Request("https://api.example.com/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "password12" }),
    }),
  );
  expect(result.status).toBe(200);
  expect(result.headers.get("set-cookie")).toContain("Secure");
  expect(result.headers.get("set-cookie")).toContain("Domain=.example.com");
});
