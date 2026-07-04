import { none } from "plgg";
import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { pressRouter } from "plggpress/router/pressRouter";
import { pressServeWeb } from "plggpress/server/pressServer";

const config: SiteConfig = {
  title: "Fixture Site",
  description: "A generic fixture",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  dev: { allowedHosts: [] },
  models: none(),
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
}) => w.routes.map((r) => `${r.method} ${r.pattern}`);

test("pressServeWeb is a no-op over pressRouter: identical route set", () =>
  all([
    check(shape(served), toEqual(shape(built))),
    check(
      served.routes.length,
      toBe(built.routes.length),
    ),
    // one GET route per discovered path, nothing added
    check(served.routes.length, toBe(paths.length)),
  ]));

test("pressServeWeb adds no middleware today (the mount seam is empty)", () =>
  check(
    served.middlewares.length,
    toBe(built.middlewares.length),
  ));
