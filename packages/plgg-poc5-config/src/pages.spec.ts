import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { pipe, matchOption } from "plgg";
import {
  type Config,
  type TagDef,
  DEFAULT_CONFIG,
} from "./config.ts";
import {
  type Page,
  derivePageTags,
  pagesFromPaths,
  matchesExclusion,
  pageExcluded,
  visiblePages,
  tagDefFor,
  ROOT_TAG,
} from "./pages.ts";

test("derivePageTags uses the first directory segment, or the root tag", () =>
  all([
    check(
      derivePageTags("concepts/option.md"),
      toEqual(["concepts"]),
    ),
    check(
      derivePageTags("packages/plgg/index.md"),
      toEqual(["packages"]),
    ),
    check(
      derivePageTags("index.md"),
      toEqual([ROOT_TAG]),
    ),
  ]));

test("pagesFromPaths derives a tag per path", () =>
  check(
    pagesFromPaths([
      "concepts/a.md",
      "index.md",
    ]),
    toEqual([
      { path: "concepts/a.md", tags: ["concepts"] },
      { path: "index.md", tags: [ROOT_TAG] },
    ]),
  ));

test("matchesExclusion: ** crosses slashes, * stays within a segment, literals match exactly", () =>
  all([
    check(
      matchesExclusion(
        "contributing/**",
        "contributing/conventions.md",
      ),
      toBe(true),
    ),
    check(
      matchesExclusion("*.md", "index.md"),
      toBe(true),
    ),
    // A lone * does NOT cross a slash.
    check(
      matchesExclusion("*.md", "a/b.md"),
      toBe(false),
    ),
    check(
      matchesExclusion(
        "packages/plgg/index.md",
        "packages/plgg/index.md",
      ),
      toBe(true),
    ),
    check(
      matchesExclusion(
        "contributing/**",
        "concepts/option.md",
      ),
      toBe(false),
    ),
  ]));

test("pageExcluded and visiblePages hide matching paths", () => {
  const pages: ReadonlyArray<Page> = pagesFromPaths(
    [
      "index.md",
      "contributing/conventions.md",
      "concepts/option.md",
    ],
  );
  const config: Config = {
    ...DEFAULT_CONFIG,
    exclusions: ["contributing/**"],
  };
  return all([
    check(
      pageExcluded(config, {
        path: "contributing/conventions.md",
        tags: ["contributing"],
      }),
      toBe(true),
    ),
    check(
      visiblePages(config, pages).map(
        (p) => p.path,
      ),
      toEqual(["index.md", "concepts/option.md"]),
    ),
  ]);
});

test("tagDefFor finds a classified slug, else none", () =>
  all([
    check(
      pipe(
        tagDefFor(DEFAULT_CONFIG, "concepts"),
        matchOption(
          (): string => "none",
          (t: TagDef): string => t.slug,
        ),
      ),
      toBe("concepts"),
    ),
    check(
      pipe(
        tagDefFor(DEFAULT_CONFIG, "nope"),
        matchOption(
          (): boolean => true,
          (): boolean => false,
        ),
      ),
      toBe(true),
    ),
  ]));
