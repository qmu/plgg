import {
  access,
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  test,
  check,
  all,
  okThen,
  shouldBeErr,
  toBe,
  toContain,
} from "plgg-test";
import {
  type SoftStr,
  type PromisedResult,
  ok,
  err,
  some,
  none,
} from "plgg";
import {
  type Handler,
  type Context,
  type Web,
  toFetch as _toFetch,
  htmlResponse,
} from "plgg-server";
import { type AppOptions } from "plggpress/framework/App/model/AppOptions";
import { buildRouter } from "plggpress/framework/Routing/usecase/buildRouter";
import { build } from "plggpress/framework/Build/usecase/build";

// keep the barrel-adjacent import exercised without binding
void _toFetch;

// The app's trivial handler + router factory: the framework
// owns the crawl/write; the app owns what a page renders.
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
const router = (
  paths: ReadonlyArray<SoftStr>,
): Web => buildRouter(paths, echo);

const NOT_FOUND =
  "<html><body>not found</body></html>";

// Write a minimal corpus (two routes + one asset) into a
// fresh temp dir and build it into a sibling out dir.
const writeCorpus = async (): Promise<AppOptions> => {
  const root = await mkdtemp(
    join(tmpdir(), "plggpress-build-"),
  );
  const contentDir = join(root, "content");
  await mkdir(join(contentDir, "public"), {
    recursive: true,
  });
  await writeFile(
    join(contentDir, "index.md"),
    "# Home\n",
    "utf8",
  );
  await writeFile(
    join(contentDir, "guide.md"),
    "# Guide\n",
    "utf8",
  );
  await writeFile(
    join(contentDir, "public", "robots.txt"),
    "User-agent: *\n",
    "utf8",
  );
  return {
    contentDir,
    outDir: join(root, "out"),
    assetsDir: join(contentDir, "public"),
    base: "/",
  };
};

const pathExists = (
  path: string,
): Promise<boolean> =>
  access(path).then(
    (): boolean => true,
    (): boolean => false,
  );

test("builds every route + asset + 404 and reports the written files", async () => {
  const opts = await writeCorpus();
  const report = await build(opts, {
    router,
    notFoundHtml: NOT_FOUND,
    excludePath: none(),
    linkCheck: none(),
  });
  const home = await readFile(
    join(opts.outDir, "index.html"),
    "utf8",
  );
  const notFound = await readFile(
    join(opts.outDir, "404.html"),
    "utf8",
  );
  const robots = await readFile(
    join(opts.outDir, "robots.txt"),
    "utf8",
  );
  return all([
    check(
      report,
      okThen((r) =>
        // 2 pages + 1 asset + 1 404
        toBe(4)(r.pages.length),
      ),
    ),
    check(home, toContain("path:/")),
    check(notFound, toContain("not found")),
    check(robots, toContain("User-agent")),
  ]);
});

test("cleans the output directory before writing fresh files", async () => {
  const opts = await writeCorpus();
  const stale = join(
    opts.outDir,
    "removed-route",
    "index.html",
  );
  await mkdir(dirname(stale), {
    recursive: true,
  });
  await writeFile(stale, "stale", "utf8");
  const report = await build(opts, {
    router,
    notFoundHtml: NOT_FOUND,
    excludePath: none(),
    linkCheck: none(),
  });
  return all([
    check(await pathExists(stale), toBe(false)),
    check(
      report,
      okThen((r) => toBe(4)(r.pages.length)),
    ),
  ]);
});

test("excludePath drops a matched route from the build (srcExclude)", async () => {
  const opts = await writeCorpus();
  const report = await build(opts, {
    router,
    notFoundHtml: NOT_FOUND,
    excludePath: some(
      (path: SoftStr): boolean =>
        path.includes("guide"),
    ),
    linkCheck: none(),
  });
  const guideBuilt = await pathExists(
    join(opts.outDir, "guide", "index.html"),
  );
  const home = await pathExists(
    join(opts.outDir, "index.html"),
  );
  return all([
    // the excluded route is not written…
    check(guideBuilt, toBe(false)),
    // …while the rest of the corpus still is.
    check(home, toBe(true)),
    check(
      report,
      okThen((r) =>
        // home + asset + 404 = 3 (guide excluded)
        toBe(3)(r.pages.length),
      ),
    ),
  ]);
});

test("a passing linkCheck hook runs and the build still succeeds", async () => {
  const opts = await writeCorpus();
  const report = await build(opts, {
    router,
    notFoundHtml: NOT_FOUND,
    excludePath: none(),
    linkCheck: some(
      (
        paths: ReadonlyArray<SoftStr>,
      ): PromisedResult<
        ReadonlyArray<SoftStr>,
        SoftStr
      > => Promise.resolve(ok(paths)),
    ),
  });
  return check(
    report,
    okThen((r) => toBe(4)(r.pages.length)),
  );
});

test("a failing linkCheck fails the build before anything is written", async () => {
  const opts = await writeCorpus();
  const report = await build(opts, {
    router,
    notFoundHtml: NOT_FOUND,
    excludePath: none(),
    linkCheck: some(
      (): PromisedResult<
        ReadonlyArray<SoftStr>,
        SoftStr
      > =>
        Promise.resolve(
          err("2 broken link(s)"),
        ),
    ),
  });
  return check(report, shouldBeErr());
});
