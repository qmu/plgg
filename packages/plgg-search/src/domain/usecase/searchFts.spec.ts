import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { tokenize } from "plgg-search/domain/usecase/tokenize";
import { buildFtsIndex } from "plgg-search/domain/usecase/buildFtsIndex";
import { searchFts } from "plgg-search/domain/usecase/searchFts";

test("tokenize lowercases, splits, drops noise", () =>
  all([
    check(
      tokenize("Option, not NULL — use plgg!"),
      toEqual([
        "option",
        "not",
        "null",
        "use",
        "plgg",
      ]),
    ),
    check(tokenize("a b c"), toEqual([])),
    check(tokenize(""), toEqual([])),
  ]));

const index = buildFtsIndex([
  {
    file: "a.md",
    headingPath: "a.md > Errors",
    text: "handle errors with Result, never throw",
  },
  {
    file: "b.md",
    headingPath: "b.md > Option",
    text: "absence is Option, not null or undefined",
  },
  {
    file: "c.md",
    headingPath: "c.md > Routing",
    text: "route params parse with the router; errors bubble as Result",
  },
]);

const search = searchFts(index);

test("the index counts and averages", () =>
  all([
    check(index.chunks.length, toBe(3)),
    check(index.avgLen > 0, toBe(true)),
    check(
      (index.postings["errors"] ?? []).length,
      toBe(2),
    ),
  ]));

test("bm25 ranks the on-topic chunk first", () =>
  all([
    check(
      search("option instead of null", 3).map(
        (hit) => hit.id,
      )[0],
      toBe(1),
    ),
    check(
      search("route params", 3).map(
        (hit) => hit.id,
      )[0],
      toBe(2),
    ),
  ]));

test("rarer terms outweigh common ones", () => {
  const hits = search("throw errors", 3);
  // "throw" appears only in chunk 0; it must beat
  // chunk 2 which only shares the common "errors".
  return check(
    hits.map((hit) => hit.id)[0],
    toBe(0),
  );
});

test("empty and noise queries rank nothing", () =>
  all([
    check(search("", 5), toEqual([])),
    check(search("z q x", 5), toEqual([])),
    check(search("option", 0), toEqual([])),
  ]));
