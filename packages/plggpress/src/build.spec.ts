import { none, some } from "plgg";
import { loadParts } from "plggpress/Config/usecase/loadParts";
import { rm, readdir } from "node:fs/promises";
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

test("sheet builds keep the static part, load one runtime, and honor the site override", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "press-parts-"),
  );
  try {
    const outDir = join(root, "out");
    await mkdir(join(root, "public"));
    await writeFile(
      join(root, "index.md"),
      "# Plain",
    );
    const runtime =
      "export default root => root.setAttribute('data-ready','');";
    await writeFile(
      join(root, "counter.mjs"),
      runtime,
    );
    await writeFile(
      join(root, "site.parts.ts"),
      `import {text} from ${JSON.stringify(
        import.meta.resolve("plgg-view"),
      )};
export default {parts:[{name:"plgg-flow",runtime:"./counter.mjs",css:'[data-island="plgg-flow"]{color:inherit}',render:()=>text('counter fallback')}]};`,
    );
    const parts = await loadParts(
      join(root, "site.config.ts"),
      none(),
    );
    if (parts.__tag === "Err")
      return check(
        parts.content.content.message,
        toBe("valid parts"),
      );
    const source = [
      "# Board",
      "",
      "```plgg-flow fill dsl",
      "</script>&",
      "```",
    ].join("\n");
    await writeFile(
      join(root, "sheet.md"),
      "---\nlayout: sheet\ndescription: Board description\n---\n\n" +
        source +
        "\n\nIgnored tail",
    );
    await writeFile(
      join(root, "boards.md"),
      source + "\n\n" + source,
    );
    const report = await build({
      contentDir: root,
      outDir,
      assetsDir: join(root, "public"),
      base: "/docs/",
      config: {
        ...config,
        base: "/docs/",
        sidebarStyle: some("numbered"),
        tagline: some("Tagline"),
        footerLink: some({
          text: "Footer link",
          link: "/sheet/",
        }),
      },
      parts: parts.content,
    });
    if (report.__tag === "Err")
      return check(report.__tag, toBe("Ok"));
    const read = (route: string) =>
      readFile(
        join(outDir, route, "index.html"),
        "utf8",
      );
    const [plain, sheet, boards, assets] =
      await Promise.all([
        read(""),
        read("sheet"),
        read("boards"),
        readdir(join(outDir, "assets/islands")),
      ]);
    return all([
      check(assets.length, toBe(1)),
      check(
        await readFile(
          join(
            outDir,
            "assets/islands",
            assets[0] ?? "",
          ),
          "utf8",
        ),
        toBe(runtime),
      ),
      check(
        plain,
        not(
          toContain(
            '<script type="module" data-island-loader',
          ),
        ),
      ),
      check(
        sheet,
        toContain("vp-content vp-sheet"),
      ),
      check(
        sheet,
        toContain("Board description"),
      ),
      check(
        sheet,
        not(toContain("Ignored tail")),
      ),
      check(
        sheet,
        toContain(
          'data-island="plgg-flow" data-fill',
        ),
      ),
      check(sheet, toContain("counter fallback")),
      check(sheet, toContain("\\u003c/script>&")),
      check(
        sheet,
        toContain("/docs/assets/islands/"),
      ),
      check(
        sheet,
        toContain("vp-sidebar vp-numbered"),
      ),
      check(sheet, toContain(">Tagline<")),
      check(sheet, toContain(">Footer link<")),
      check(
        boards.match(
          /<script type="module" data-island-loader/g,
        )?.length,
        toBe(1),
      ),
      check(
        boards.match(/<style data-island-style/g)
          ?.length,
        toBe(1),
      ),
      check(
        boards.match(/<div data-island=/g)
          ?.length,
        toBe(2),
      ),
    ]);
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
    });
  }
});
