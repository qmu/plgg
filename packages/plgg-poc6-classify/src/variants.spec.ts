import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { pipe, matchOption } from "plgg";
import { buildPages } from "./classify.ts";
import {
  type Variant,
  type TagMode,
  VARIANTS,
  asTagMode,
  variantLabel,
  variantBlurb,
  runQuery,
} from "./variants.ts";

const pages = buildPages([
  {
    path: "index.md",
    text: "[o](concepts/option.md)",
  },
  {
    path: "concepts/option.md",
    text: "---\ntags: [alpha]\n---\n[r](result.md)",
  },
  {
    path: "concepts/result.md",
    text: "back [o](option.md)",
  },
]);

const paths = (
  q: Parameters<typeof runQuery>[1],
): ReadonlyArray<string> =>
  runQuery(pages, q).map((p) => p.path);

test("asTagMode accepts and/or, rejects garbage", () =>
  all([
    check(
      pipe(
        asTagMode("and"),
        matchOption(
          (): TagMode => "or",
          (m: TagMode): TagMode => m,
        ),
      ),
      toBe("and"),
    ),
    check(
      pipe(
        asTagMode("xor"),
        matchOption(
          (): boolean => true,
          (): boolean => false,
        ),
      ),
      toBe(true),
    ),
  ]));

test("tag-facets AND needs all tags; OR needs any; empty means all", () =>
  all([
    check(
      paths({
        kind: "tag-facets",
        query: {
          tags: ["concepts", "alpha"],
          mode: "and",
        },
      }).length,
      toBe(1),
    ),
    check(
      paths({
        kind: "tag-facets",
        query: {
          tags: ["concepts", "alpha"],
          mode: "or",
        },
      }).length,
      toBe(2),
    ),
    check(
      paths({
        kind: "tag-facets",
        query: { tags: [], mode: "and" },
      }).length,
      toBe(3),
    ),
  ]));

test("link-graph returns a focus page's neighbors", () =>
  check(
    paths({
      kind: "link-graph",
      query: { focus: "concepts/option.md" },
    }).length >= 2,
    toBe(true),
  ));

test("multi-filter combines a path substring with tags", () =>
  all([
    check(
      paths({
        kind: "multi-filter",
        query: { tags: [], text: "option" },
      }).includes("concepts/option.md"),
      toBe(true),
    ),
    check(
      paths({
        kind: "multi-filter",
        query: {
          tags: ["concepts"],
          text: "",
        },
      }).length,
      toBe(2),
    ),
  ]));

test("every variant has a label and a blurb", () =>
  all(
    VARIANTS.map((v: Variant) =>
      check(
        variantLabel(v).length > 0 &&
          variantBlurb(v).length > 0,
        toBe(true),
      ),
    ),
  ));

test("there are three variants", () =>
  check(VARIANTS.length, toBe(3)));
