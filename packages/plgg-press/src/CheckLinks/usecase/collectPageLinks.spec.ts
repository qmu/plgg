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
import { type PageLinks } from "plgg-press/CheckLinks/model/CheckLinks";
import { collectPageLinks } from "plgg-press/CheckLinks/usecase/collectPageLinks";

const GUIDE_MD = [
  "# Guide",
  "",
  "## Usage",
  "",
  "See [intro](/concepts/intro.md).",
  "",
].join("\n");

const INTRO_MD = ["# Intro", "", "Prose.", ""].join(
  "\n",
);

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
  return collectPageLinks(root, "/plgg/")([
    "/guide/",
    "/concepts/intro/",
  ]);
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
    )(["/ghost/"]),
    shouldBeErr(),
  ));
