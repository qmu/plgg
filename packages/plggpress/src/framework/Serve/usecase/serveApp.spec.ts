import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  test,
  check,
  all,
  toBe,
  toContain,
  errThen,
} from "plgg-test";
import { none, isOk } from "plgg";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { type PressOptions } from "plggpress/Press/model/PressOptions";
import { type AppOptions } from "plggpress/framework";
import { serveApp } from "plggpress/framework";
import { discoverPaths } from "plgg-server/ssg";
import { build } from "plggpress/build";
import { pressRouter } from "plggpress/router/pressRouter";

const config: SiteConfig = {
  title: "Serve Fixture",
  description: "serve-mode fixture",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  dev: { allowedHosts: [] },
  models: none(),
  rawHtml: none(),
  slugger: none(),
};

const HOME_MD =
  "# Serve Home\n\nLanding prose.\n";
const GUIDE_MD =
  "# Serve Guide\n\nGuide prose with `code`.\n";

// A fresh temp content corpus; returns its dirs.
const makeCorpus = async () => {
  const root = await mkdtemp(
    join(tmpdir(), "plggpress-serve-"),
  );
  const contentDir = join(root, "content");
  await mkdir(join(contentDir, "public"), {
    recursive: true,
  });
  await writeFile(
    join(contentDir, "index.md"),
    HOME_MD,
    "utf8",
  );
  await writeFile(
    join(contentDir, "guide.md"),
    GUIDE_MD,
    "utf8",
  );
  return { root, contentDir };
};

const optsFor = (
  contentDir: string,
  outDir: string,
): AppOptions => ({
  contentDir,
  outDir,
  assetsDir: join(contentDir, "public"),
  base: config.base,
});

// Read the listening port off a node:http server address.
const portOf = (addr: unknown): number =>
  typeof addr === "object" &&
  addr !== null &&
  "port" in addr &&
  typeof addr.port === "number"
    ? addr.port
    : 0;

test("serveApp serves a discovered route (200 + rendered HTML) and 404s an unknown path", async () => {
  const { contentDir, root } = await makeCorpus();
  const r = await serveApp(
    optsFor(contentDir, join(root, "out")),
    (paths) =>
      pressRouter(
        contentDir,
        config,
        config.base,
        paths,
      ),
    { port: 0, hostname: none() },
  );
  if (!isOk(r)) {
    return check(false, toBe(true));
  }
  const server = r.content;
  const base = `http://127.0.0.1:${portOf(
    server.address(),
  )}`;
  try {
    const home = await fetch(`${base}/`);
    const homeBody = await home.text();
    const missing = await fetch(`${base}/nope`);
    return all([
      check(home.status, toBe(200)),
      check(homeBody, toContain("Serve Home")),
      // the rendered page is the real theme shell
      check(
        homeBody,
        toContain("<!doctype html>"),
      ),
      check(missing.status, toBe(404)),
    ]);
  } finally {
    await new Promise<void>((res) =>
      server.close(() => res()),
    );
  }
});

test("serveApp folds a bad contentDir to a typed Err (no listener leaked)", async () => {
  const r = await serveApp(
    optsFor(
      "/no/such/content/dir/plggpress",
      "/tmp/unused-out",
    ),
    (paths) =>
      pressRouter(
        "/no/such/content/dir/plggpress",
        config,
        config.base,
        paths,
      ),
    { port: 0, hostname: none() },
  );
  // discovery fails before any server is created
  return check(
    r,
    errThen((e) =>
      // an SsgError/Defect tag, not a throw
      toBe(true)(typeof e.__tag === "string"),
    ),
  );
});

test("BYTE-IDENTITY GATE: every served body equals the SSG-built file", async () => {
  const { contentDir, root } = await makeCorpus();
  const outDir = join(root, "out");
  const pressOpts: PressOptions = {
    contentDir,
    outDir,
    assetsDir: join(contentDir, "public"),
    config,
    base: config.base,
  };
  // SSG build the corpus
  const report = await build(pressOpts);
  if (!isOk(report)) {
    return check(false, toBe(true));
  }
  // discover the same route set the build rendered
  const discovered =
    await discoverPaths(contentDir);
  if (!isOk(discovered)) {
    return check(false, toBe(true));
  }
  // serve the same corpus
  const served = await serveApp(
    optsFor(contentDir, outDir),
    (paths) =>
      pressRouter(
        contentDir,
        config,
        config.base,
        paths,
      ),
    { port: 0, hostname: none() },
  );
  if (!isOk(served)) {
    return check(false, toBe(true));
  }
  const server = served.content;
  const baseUrl = `http://127.0.0.1:${portOf(
    server.address(),
  )}`;
  try {
    // for each discovered path: served body === built file,
    // byte-for-byte (serve must not fork the render path)
    const checks = await Promise.all(
      discovered.content.map(async (path) => {
        const servedBody = await (
          await fetch(`${baseUrl}${path}`)
        ).text();
        const builtPath =
          path === "/"
            ? join(outDir, "index.html")
            : join(outDir, path, "index.html");
        const builtBody = await readFile(
          builtPath,
          "utf8",
        );
        return check(servedBody, toBe(builtBody));
      }),
    );
    return all([
      // the corpus really has routes to compare
      check(
        discovered.content.length > 0,
        toBe(true),
      ),
      ...checks,
    ]);
  } finally {
    await new Promise<void>((res) =>
      server.close(() => res()),
    );
  }
});
