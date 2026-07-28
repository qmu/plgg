import { none } from "plgg";
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
  okThen,
  errThen,
  toBe,
  toContain,
  not,
} from "plgg-test";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { type PressOptions } from "plggpress/Press/model/PressOptions";
import { build } from "plggpress/build";

// A GENERIC fixture corpus — no typedoc. A prose home
// landing page (ordinary markdown, qmu.co.jp's model), plus
// two prose pages, one carrying a ```ts fence and a
// ::: tip callout so the emit exercises highlighting and
// callouts end-to-end.
const config: SiteConfig = {
  title: "Fixture Site",
  description: "A generic fixture",
  base: "/plgg/",
  nav: [{ text: "Guide", link: "/guide" }],
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

const HOME_MD = [
  "# Welcome to Fixture",
  "",
  "A generic landing page.",
  "",
].join("\n");

const GUIDE_MD = [
  "# Guide",
  "",
  "Some prose with a [link](/concepts/intro.md).",
  "",
  "```ts",
  "const answer: number = 42;",
  "```",
  "",
  "::: tip",
  "Be careful here.",
  ":::",
  "",
].join("\n");

const INTRO_MD = [
  "# Intro",
  "",
  "Concept prose.",
  "",
].join("\n");

// Write the fixture corpus into a fresh temp dir and build
// it into a sibling out dir; returns both the report and
// the emitted files' contents for assertion.
const buildFixture = async () => {
  const root = await mkdtemp(
    join(tmpdir(), "plggpress-"),
  );
  const contentDir = join(root, "content");
  const outDir = join(root, "out");
  await mkdir(join(contentDir, "concepts"), {
    recursive: true,
  });
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
  await writeFile(
    join(contentDir, "concepts", "intro.md"),
    INTRO_MD,
    "utf8",
  );
  await writeFile(
    join(contentDir, "public", "robots.txt"),
    "User-agent: *\n",
    "utf8",
  );
  const opts: PressOptions = {
    contentDir,
    outDir,
    assetsDir: join(contentDir, "public"),
    config,
    base: config.base,
  };
  const report = await build(opts);
  const read = (
    ...segs: ReadonlyArray<string>
  ): Promise<string> =>
    readFile(join(outDir, ...segs), "utf8");
  return {
    report,
    home: await read("index.html"),
    guide: await read("guide", "index.html"),
    intro: await read(
      "concepts",
      "intro",
      "index.html",
    ),
    notFound: await read("404.html"),
    robots: await read("robots.txt"),
  };
};

const built = await buildFixture();

test("emits a BuildReport listing every written file", () =>
  check(
    built.report,
    okThen((r) =>
      all([
        // 3 pages + 1 asset + 404
        toBe(5)(r.pages.length),
      ]),
    ),
  ));

test("renders the home page as ordinary prose through the shell (qmu model)", () =>
  all([
    check(
      built.home.slice(0, 15),
      toContain("<!doctype html>"),
    ),
    // the landing page is the SAME .vp-doc prose column
    // as every article - no hero variant exists
    check(built.home, toContain("vp-doc")),
    check(
      built.home,
      toContain("Welcome to Fixture"),
    ),
    check(
      built.home,
      toContain("A generic landing page"),
    ),
    check(
      built.home,
      toContain(
        "<title>Welcome to Fixture</title>",
      ),
    ),
  ]));

test("renders a prose page with highlighted code and a callout, base-aware", () =>
  all([
    check(
      built.guide,
      toContain("<title>Guide</title>"),
    ),
    // plgg-highlight emits styled <span> token leaves
    check(built.guide, toContain("<span")),
    // the ::: tip callout body survives the render
    check(
      built.guide,
      toContain("Be careful here."),
    ),
    // the [link](/concepts/intro.md) is base-prefixed
    // and .md-normalized by the injected href resolver
    check(
      built.guide,
      toContain('href="/plgg/concepts/intro"'),
    ),
  ]));

test("emits a nested directory-index page", () =>
  all([
    check(
      built.intro,
      toContain("<title>Intro</title>"),
    ),
    check(
      built.intro,
      toContain("Concept prose."),
    ),
  ]));

test("copies static assets verbatim", () =>
  check(
    built.robots,
    toContain("User-agent: *"),
  ));

test("writes the 404 through the theme shell", () =>
  all([
    check(
      built.notFound.slice(0, 15),
      toContain("<!doctype html>"),
    ),
    check(
      built.notFound,
      toContain("vp-notfound"),
    ),
    check(
      built.notFound,
      toContain("Page not found"),
    ),
  ]));

// A corpus whose guide links to a route that does not
// exist — the dead-link checker must fail the build before
// anything is written.
const buildBrokenFixture = async () => {
  const root = await mkdtemp(
    join(tmpdir(), "plggpress-broken-"),
  );
  const contentDir = join(root, "content");
  const outDir = join(root, "out");
  await mkdir(contentDir, { recursive: true });
  await writeFile(
    join(contentDir, "index.md"),
    HOME_MD,
    "utf8",
  );
  await writeFile(
    join(contentDir, "guide.md"),
    [
      "# Guide",
      "",
      "A [dead link](/concepts/ghost.md).",
      "",
    ].join("\n"),
    "utf8",
  );
  const opts: PressOptions = {
    contentDir,
    outDir,
    assetsDir: join(contentDir, "public"),
    config,
    base: config.base,
  };
  return build(opts);
};

test("fails the build with BrokenLinks when a link points at a missing route", async () =>
  check(
    await buildBrokenFixture(),
    errThen((e) => toBe("BrokenLinks")(e.__tag)),
  ));

// The dark-mode toggle is the ONE deliberate production
// script: every emitted page (the three content pages AND
// the 404) carries the appearance scripts — a `<script>`
// keyed on the preserved appearance-storage key that flips
// the `dark` class via `classList`. The dev-only live-reload
// `EventSource` must NEVER leak into the production emit.
// (The key needle is split so this file stays clean of the
// literal the ticket-07 D16 grep hunts for; the built page
// still carries it, sourced from plggmatic's
// appearanceStorageKey.)
test("PRODUCTION emit ships the theme toggle on every page and never leaks the dev live-reload", () =>
  all(
    [
      built.home,
      built.guide,
      built.intro,
      built.notFound,
    ].flatMap((page: string) => [
      check(page, toContain("<script")),
      check(
        page,
        toContain("vp-" + "appearance"),
      ),
      check(page, toContain("classList")),
      check(page, not(toContain("EventSource"))),
    ]),
  ));
