import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { ok } from "plgg";
import {
  type Handler,
  type Context,
  toFetch,
  htmlResponse,
} from "plgg-server";
import { buildRouter } from "plggpress/framework/Routing/usecase/buildRouter";

// A trivial app handler: it reads the request path from the
// Context and echoes it, so one handler serves every route.
const echo: Handler = (c: Context) =>
  Promise.resolve(
    ok(
      htmlResponse(
        "<html><body><main>path:" +
          c.req.path +
          "</main></body></html>",
      ),
    ),
  );

test("binds one GET route per path, all to the single handler", async () => {
  const fetch = toFetch(
    buildRouter(["/", "/guide"], echo),
  );
  const home = await (
    await fetch(new Request("http://x/"))
  ).text();
  const guide = await (
    await fetch(new Request("http://x/guide"))
  ).text();
  return all([
    check(home, toContain("path:/")),
    check(guide, toContain("path:/guide")),
  ]);
});

test("an empty path set yields an app that serves nothing (404)", async () => {
  const fetch = toFetch(buildRouter([], echo));
  const res = await fetch(
    new Request("http://x/anything"),
  );
  return check(res.status, toBe(404));
});
