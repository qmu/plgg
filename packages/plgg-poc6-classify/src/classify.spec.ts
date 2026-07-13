import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  type Page,
  ROOT_TAG,
  pathTags,
  frontMatterTags,
  pageTags,
  resolveLink,
  extractLinks,
  buildPages,
  allTags,
  tagCount,
  backlinksOf,
  neighborsOf,
} from "./classify.ts";

const corpus: ReadonlyArray<
  Readonly<{ path: string; text: string }>
> = [
  {
    path: "index.md",
    text: "[gs](getting-started.md) [opt](concepts/option.md) [ext](https://x.com) [dangle](nope.md)",
  },
  {
    path: "getting-started.md",
    text: "see [option](concepts/option.md)",
  },
  {
    path: "concepts/index.md",
    text: "[option](option.md) [result](result.md)",
  },
  {
    path: "concepts/option.md",
    text: "---\ntags: [alpha, beta]\n---\nback [home](../index.md)",
  },
  {
    path: "concepts/result.md",
    text: "no links here",
  },
];

const known: ReadonlySet<string> = new Set(
  corpus.map((e) => e.path),
);

test("pathTags returns every directory segment, or the root tag", () =>
  all([
    check(
      pathTags("packages/plgg/index.md"),
      toEqual(["packages", "plgg"]),
    ),
    check(
      pathTags("concepts/option.md"),
      toEqual(["concepts"]),
    ),
    check(
      pathTags("index.md"),
      toEqual([ROOT_TAG]),
    ),
  ]));

test("frontMatterTags parses inline-array and comma forms, else empty", () =>
  all([
    check(
      frontMatterTags(
        "---\ntitle: x\ntags: [alpha, beta]\n---\nbody",
      ),
      toEqual(["alpha", "beta"]),
    ),
    check(
      frontMatterTags(
        "---\ntags: gamma, delta\n---\n",
      ),
      toEqual(["gamma", "delta"]),
    ),
    check(
      frontMatterTags("no front matter"),
      toEqual([]),
    ),
    check(
      frontMatterTags("---\ntitle: x\n---\n"),
      toEqual([]),
    ),
    // No closing fence → no tags.
    check(
      frontMatterTags("---\ntags: [a]\nbody"),
      toEqual([]),
    ),
  ]));

test("pageTags unions tree tags with front-matter tags, de-duped", () =>
  check(
    pageTags(
      "concepts/option.md",
      "---\ntags: [alpha, concepts]\n---\n",
    ),
    toEqual(["concepts", "alpha"]),
  ));

test("resolveLink handles relative, parent, root-relative, and anchors", () =>
  all([
    check(
      resolveLink("concepts/index.md", "option.md"),
      toBe("concepts/option.md"),
    ),
    check(
      resolveLink(
        "concepts/option.md",
        "../index.md",
      ),
      toBe("index.md"),
    ),
    check(
      resolveLink("index.md", "concepts/option.md"),
      toBe("concepts/option.md"),
    ),
    check(
      resolveLink("x.md", "/concepts/option.md"),
      toBe("concepts/option.md"),
    ),
    check(
      resolveLink("a/b.md", "c.md#frag"),
      toBe("a/c.md"),
    ),
  ]));

test("extractLinks keeps in-corpus .md links and drops external/dangling/self", () =>
  check(
    extractLinks(
      "index.md",
      corpus[0]?.text ?? "",
      known,
    ),
    toEqual([
      "getting-started.md",
      "concepts/option.md",
    ]),
  ));

test("buildPages classifies each page with tags and resolved links", () => {
  const pages = buildPages(corpus);
  const option = pages.find(
    (p) => p.path === "concepts/option.md",
  );
  return all([
    check(pages.length, toBe(5)),
    check(
      option?.tags.includes("alpha") ?? false,
      toBe(true),
    ),
    check(
      option?.tags.includes("concepts") ?? false,
      toBe(true),
    ),
    // ../index.md resolves to index.md, a known page.
    check(
      option?.links ?? [],
      toEqual(["index.md"]),
    ),
  ]);
});

test("allTags is sorted and unique; tagCount counts carriers", () => {
  const pages = buildPages(corpus);
  return all([
    check(
      allTags(pages).includes("concepts"),
      toBe(true),
    ),
    check(
      allTags(pages),
      toEqual([...allTags(pages)].sort()),
    ),
    check(
      tagCount(pages, "concepts") >= 3,
      toBe(true),
    ),
  ]);
});

test("resolveLink normalizes '.', over-popping '..', and empty (anchor-only) targets", () =>
  all([
    check(
      resolveLink("concepts/index.md", "./option.md"),
      toBe("concepts/option.md"),
    ),
    // Over-popping past the root floors at the root.
    check(
      resolveLink("a.md", "../../x.md"),
      toBe("x.md"),
    ),
    // An anchor-only target resolves to empty (dropped by extractLinks).
    check(resolveLink("a.md", "#top"), toBe("")),
  ]));

test("extractLinks drops self-links and anchor-only links", () => {
  const self: ReadonlySet<string> = new Set([
    "a.md",
    "b.md",
  ]);
  return check(
    extractLinks(
      "a.md",
      "[me](a.md) [top](#x) [b](b.md)",
      self,
    ),
    toEqual(["b.md"]),
  );
});

test("neighborsOf an unknown focus is empty", () =>
  check(
    neighborsOf(buildPages(corpus), "missing.md")
      .length,
    toBe(0),
  ));

test("backlinksOf and neighborsOf trace the non-tree link graph", () => {
  const pages: ReadonlyArray<Page> =
    buildPages(corpus);
  const back = backlinksOf(
    pages,
    "concepts/option.md",
  );
  const near = neighborsOf(pages, "index.md");
  return all([
    // index.md, getting-started.md, concepts/index.md all link option.md.
    check(back.length, toBe(3)),
    check(
      back.includes("getting-started.md"),
      toBe(true),
    ),
    // index.md's neighbors: what it links to + who links to it.
    check(
      near.includes("concepts/option.md"),
      toBe(true),
    ),
    check(
      near.includes("concepts/option.md") &&
        near.includes("getting-started.md"),
      toBe(true),
    ),
  ]);
});
