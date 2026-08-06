import {
  mkdtemp,
  writeFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type SoftStr, none, isErr } from "plgg";
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
  theme: none(),
};

// Route construction is fs-free (handlers read files at
// REQUEST time), so synthetic paths suffice for the
// structural comparison.
const paths = ["/", "/guide", "/concepts/intro"];
const contentDir = "/tmp/fixture";

/**
 * A throwaway one-page corpus on disk.
 *
 * `pressServeWebWithAuth` is NO LONGER fs-free: it fills the
 * derived content index from the corpus before it hands back
 * the app, and a corpus it cannot read fails the boot on
 * purpose (an index nobody filled answers every query with an
 * empty result, which reads exactly like a corpus that says
 * nothing). The structural comparisons above stay synthetic;
 * only the seam that now reads gets a real directory.
 */
const withCorpus = async <T>(
  run: (dir: SoftStr) => Promise<T>,
): Promise<T> => {
  const dir = await mkdtemp(
    join(tmpdir(), "plgg-cms-corpus-"),
  );
  await writeFile(
    join(dir, "index.md"),
    "# Fixture\n\nOne page is enough to prove the boot reads it.\n",
    "utf8",
  );
  const out = await run(dir);
  await rm(dir, {
    recursive: true,
    force: true,
  });
  return out;
};

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
  const r = await withCorpus((dir: SoftStr) =>
    pressServeWebWithAuth(
      dir,
      config,
      config.base,
    ),
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

test("a corpus that cannot be read fails the boot rather than serving an empty index", async () =>
  check(
    isErr(
      await pressServeWebWithAuth(
        join(
          tmpdir(),
          "plgg-cms-corpus-that-is-not-there",
        ),
        config,
        config.base,
      ),
    ),
    toBe(true),
  ));
