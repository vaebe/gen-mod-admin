import { expect, it } from "vite-plus/test";
import worker from "../../worker";
it("forwards API requests to the API Worker and serves the rest as static assets", async () => {
  const env = {
    API: {
      async fetch(request: Request) {
        return new Response(
          `${new URL(request.url).pathname}|${request.headers.get("cookie")}|${await request.text()}`,
        );
      },
    },
    ASSETS: {
      async fetch() {
        return new Response("static");
      },
    },
  };
  expect(
    await (
      await worker.fetch(
        new Request("https://admin.example.com/api/auth/login", {
          method: "POST",
          headers: { cookie: "gm_session=a" },
          body: "credentials",
        }),
        env,
      )
    ).text(),
  ).toBe("/auth/login|gm_session=a|credentials");
  expect(
    await (await worker.fetch(new Request("https://admin.example.com/games"), env)).text(),
  ).toBe("static");
});
