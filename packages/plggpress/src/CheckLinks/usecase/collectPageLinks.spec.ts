import {
  mkdtemp,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  test,
  check,
  all,
  toContain,
  toHaveLength,
  okThen,
  shouldBeErr,
} from "plgg-test";
import { none } from "plgg";
import { type PageLinks } from "plggpress/CheckLinks/model/CheckLinks";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { collectPageLinks } from "plggpress/CheckLinks/usecase/collectPageLinks";

// A minimal config at the render defaults (raw HTML off,
// VitePress slugger) — the link crawl only reads its
// render knobs.
const CONFIG: SiteConfig = {
  title: "T",
  description: "D",
  base: "/plgg/",
  nav: [],
  sidebar: [],
  social: [],
  dev: { allowedHosts: [] },
  models: none(),
  rawHtml: none(),
  slugger: none(),
};

const GUIDE_MD = [
  "# Guide",
  "",
  "## Usage",
  "",
  "See [intro](/concepts/intro.md).",
  "",
].join("\n");

const INTRO_MD = [
  "# Intro",
  "",
  "Prose.",
  "",
].join("\n");

// Write a tiny corpus and collect its per-page link surface
// through the real fs + renderMarkdown path.
const collected = await (async () => {
  const root = await mkdtemp(
    join(tmpdir(), "plgg-collect-"),
  );
  await mkdir(join(root, "concepts"), {
    recursive: true,
  });
  await writeFile(
    join(root, "guide.md"),
    GUIDE_MD,
    "utf8",
  );
  await writeFile(
    join(root, "concepts", "intro.md"),
    INTRO_MD,
    "utf8",
  );
  return collectPageLinks(
    root,
    "/plgg/",
    CONFIG,
  )(["/guide/", "/concepts/intro/"]);
})();

test("collects route, base-prefixed links and heading slugs per page", () =>
  check(
    collected,
    okThen((pages: ReadonlyArray<PageLinks>) =>
      all([
        toHaveLength(2)(pages),
        toContain("/guide/")(
          pages.map((p) => p.route),
        ),
        // link is base-prefixed and .md-normalized
        toContain("/plgg/concepts/intro")(
          pages.flatMap((p) => p.links),
        ),
        // the H2 "Usage" slug is emitted
        toContain("usage")(
          pages.flatMap((p) => p.slugs),
        ),
      ]),
    ),
  ));

test("folds a missing source file to a Defect", async () =>
  check(
    await collectPageLinks(
      join(tmpdir(), "plgg-does-not-exist"),
      "/plgg/",
      CONFIG,
    )(["/ghost/"]),
    shouldBeErr(),
  ));
