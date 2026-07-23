import { none, isErr } from "plgg";
import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { type SiteConfig } from "plggpress";
import { pressRouter } from "plggpress";
import {
  pressServeWeb,
  pressServeWebWithAuth,
} from "plgg-cms/server/pressServer";

const config: SiteConfig = {
  title: "Fixture Site",
  description: "A generic fixture",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  dev: { allowedHosts: [] },
  models: none(),
  rawHtml: none(),
  slugger: none(),
  srcExclude: none(),
  linkIgnore: none(),
};

// Route construction is fs-free (handlers read files at
// REQUEST time), so synthetic paths suffice for the
// structural comparison.
const paths = ["/", "/guide", "/concepts/intro"];
const contentDir = "/tmp/fixture";

// The seam is a proven NO-OP today: pressServeWeb(...)(paths)
// carries exactly pressRouter(...)'s routes + middlewares.
const served = pressServeWeb(
  contentDir,
  config,
  config.base,
)(paths);
const built = pressRouter(
  contentDir,
  config,
  config.base,
  paths,
);

const shape = (w: {
  routes: ReadonlyArray<{
    method: string;
    pattern: string;
  }>;
  middlewares: ReadonlyArray<unknown>;
}) =>
  w.routes.map((r) => `${r.method} ${r.pattern}`);

test("pressServeWeb is a no-op over pressRouter: identical route set", () =>
  all([
    check(shape(served), toEqual(shape(built))),
    check(
      served.routes.length,
      toBe(built.routes.length),
    ),
    // one GET route per discovered path, nothing added
    check(
      served.routes.length,
      toBe(paths.length),
    ),
  ]));

test("pressServeWeb adds no middleware today (the mount seam is empty)", () =>
  check(
    served.middlewares.length,
    toBe(built.middlewares.length),
  ));

test("pressServeWebWithAuth mounts the OP+RP auth + admin routes alongside content", async () => {
  const r = await pressServeWebWithAuth(
    contentDir,
    config,
    config.base,
  );
  if (isErr(r)) {
    return check(isErr(r), toBe(false));
  }
  const app = r.content(paths);
  const patterns = app.routes.map(
    (route) => route.pattern,
  );
  return all([
    // the RP login-flow routes are present
    check(
      patterns.some((p) =>
        p.includes("/auth/start"),
      ),
      toBe(true),
    ),
    // the guarded admin subtree is present
    check(
      patterns.some((p) => p.includes("/admin")),
      toBe(true),
    ),
    // and the content routes are still there
    check(
      app.routes.length > paths.length,
      toBe(true),
    ),
  ]);
});
