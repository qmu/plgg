import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import {
  type SoftStr,
  type Result,
  isErr,
  getOr,
  pipe,
} from "plgg";
import { type Block, isHeading } from "plgg-md";
import {
  type CorpusOptions,
  indexInputOf,
  indexInputsOf,
} from "plgg-cms/content/Ingest/usecase/indexInputsOf";
import { type IndexInput } from "plgg-cms/content/Ingest/usecase/indexDocument";

const OPTS: CorpusOptions = {
  collection: "content",
  rawHtml: false,
  updatedAt: "1700000000",
};

// test-only unwrap: a failed parse fails the test loudly.
const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

/** The parsed input for one source page. */
const inputOf = (
  path: SoftStr,
  source: SoftStr,
): IndexInput =>
  must(indexInputOf(OPTS)({ path, source }));

/** The page's title, or a marker when it has none. */
const titleOf = (input: IndexInput): SoftStr =>
  pipe(input.title, getOr("(none)"));

/** The whole corpus, unwrapped. */
const inputsOf = (
  pages: ReadonlyArray<
    Readonly<{ path: SoftStr; source: SoftStr }>
  >,
): ReadonlyArray<IndexInput> =>
  must(indexInputsOf(OPTS)(pages));

test("lifts the first level-1 heading as the title", () =>
  check(
    titleOf(
      inputOf(
        "/guide/",
        "# Getting started\n\nbody text\n",
      ),
    ),
    toBe("Getting started"),
  ));

test("a page with no level-1 heading has no title", () =>
  check(
    titleOf(
      inputOf(
        "/notes/",
        "## Only a subheading\n\nbody\n",
      ),
    ),
    toBe("(none)"),
  ));

test("a page with no frontmatter fence carries empty attributes", () =>
  check(
    inputOf("/plain/", "# Plain\n\nno fence\n")
      .attributesJson,
    toBe("{}"),
  ));

test("frontmatter is folded into the attributes JSON", () => {
  const input = inputOf(
    "/typed/",
    "---\ntitle: Typed\ndraft: true\n---\n\n# Typed\n\nbody\n",
  );
  return all([
    check(
      input.attributesJson,
      toContain("Typed"),
    ),
    check(
      input.attributesJson,
      toContain("draft"),
    ),
  ]);
});

test("the body parses to blocks with the frontmatter stripped", () => {
  const blocks: ReadonlyArray<Block> = inputOf(
    "/typed/",
    "---\ntitle: Typed\n---\n\n# Heading\n\nbody\n",
  ).blocks;
  return all([
    check(blocks.length, toBe(2)),
    check(
      blocks.filter((b: Block) => isHeading(b))
        .length,
      toBe(1),
    ),
  ]);
});

test("an unterminated frontmatter fence is an error, not a silent strip", () =>
  check(
    isErr(
      indexInputOf(OPTS)({
        path: "/bad/",
        source: "---\ntitle: Broken\n\n# Body\n",
      }),
    ),
    toBe(true),
  ));

test("the content hash is stable across two reads of the same source", () =>
  check(
    inputOf("/stable/", "# Stable\n\nbody\n")
      .contentHash,
    toBe(
      inputOf("/stable/", "# Stable\n\nbody\n")
        .contentHash,
    ),
  ));

test("the content hash covers the frontmatter, not only the body", () =>
  check(
    inputOf(
      "/p/",
      "---\na: 1\n---\n\n# P\n\nbody\n",
    ).contentHash ===
      inputOf(
        "/p/",
        "---\na: 2\n---\n\n# P\n\nbody\n",
      ).contentHash,
    toBe(false),
  ));

test("the route, collection and timestamp ride through unchanged", () => {
  const input = inputOf(
    "/concepts/option/",
    "# Option\n\nbody\n",
  );
  return all([
    check(input.path, toBe("/concepts/option/")),
    check(input.collection, toBe("content")),
    check(input.updatedAt, toBe("1700000000")),
  ]);
});

test("an empty corpus maps to no inputs", () =>
  check(inputsOf([]).length, toBe(0)));

test("every page of a corpus becomes one input, in order", () => {
  const inputs = inputsOf([
    { path: "/a/", source: "# A\n\nalpha\n" },
    { path: "/b/", source: "# B\n\nbeta\n" },
  ]);
  return all([
    check(inputs.length, toBe(2)),
    check(inputs[0]?.path ?? "", toBe("/a/")),
    check(inputs[1]?.path ?? "", toBe("/b/")),
  ]);
});

test("one unparseable page fails the whole corpus", () =>
  check(
    isErr(
      indexInputsOf(OPTS)([
        {
          path: "/ok/",
          source: "# Ok\n\nfine\n",
        },
        {
          path: "/bad/",
          source:
            "---\ntitle: Broken\n\n# Body\n",
        },
      ]),
    ),
    toBe(true),
  ));

test("raw-HTML mode is honored rather than hardcoded", () => {
  const source = "# H\n\n<div>markup</div>\n";
  const off = indexInputOf(OPTS)({
    path: "/h/",
    source,
  });
  const on = indexInputOf({
    ...OPTS,
    rawHtml: true,
  })({ path: "/h/", source });
  return check(
    JSON.stringify(must(off).blocks) ===
      JSON.stringify(must(on).blocks),
    toBe(false),
  );
});
