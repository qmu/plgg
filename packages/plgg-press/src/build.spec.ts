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
  toBe,
  toContain,
  not,
} from "plgg-test";
import { some } from "plgg";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import { type PressOptions } from "plgg-press/Press/model/PressOptions";
import { build } from "plgg-press/build";

// A GENERIC fixture corpus — no typedoc. A `layout: home`
// landing page (rendered from SiteConfig home DATA), plus
// two prose pages, one carrying a ```ts fence and a
// ::: tip callout so the emit exercises highlighting and
// callouts end-to-end.
const config: SiteConfig = {
  title: "Fixture Site",
  description: "A generic fixture",
  base: "/plgg/",
  nav: [
    { text: "Guide", link: "/guide" },
  ],
  sidebar: [],
  social: [],
  home: some({
    title: "Welcome to Fixture",
    tagline: "A generic landing page",
    actions: [
      { text: "Start", link: "/guide" },
    ],
    features: [
      {
        title: "Typed",
        details: "End to end.",
      },
    ],
  }),
  dev: { allowedHosts: [] },
};

const HOME_MD = ["---", "layout: home", "---", ""].join(
  "\n",
);

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
    join(tmpdir(), "plgg-press-"),
  );
  const contentDir = join(root, "content");
  const outDir = join(root, "out");
  await mkdir(
    join(contentDir, "concepts"),
    { recursive: true },
  );
  await mkdir(
    join(contentDir, "public"),
    { recursive: true },
  );
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
    dev: false,
    allowedHosts: [],
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

test("renders the home page through the theme shell from SiteConfig home data", () =>
  all([
    check(
      built.home.slice(0, 15),
      toContain("<!doctype html>"),
    ),
    check(built.home, toContain("<main")),
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
      toContain("<title>Fixture Site</title>"),
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
    check(built.notFound, toContain("<nav")),
    check(
      built.notFound,
      toContain("Page not found"),
    ),
  ]));

test("PRODUCTION emit is zero-client-JS: no <script>, no EventSource anywhere", () =>
  all(
    [
      built.home,
      built.guide,
      built.intro,
      built.notFound,
    ].flatMap((page: string) => [
      check(page, not(toContain("<script"))),
      check(
        page,
        not(toContain("EventSource")),
      ),
    ]),
  ));
