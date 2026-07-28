import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Option,
  type SoftStr,
  some,
  none,
  pipe,
  getOr,
} from "plgg";
import {
  type Column,
  type Composition,
  columnOf,
  columnWithSpan,
  soloComposition,
} from "plggmatic/Navigate/model/Composition";
import {
  decodeComposition,
  compositionQuery,
  compositionHref,
} from "plggmatic/Navigate/usecase/compositionUrl";

// A composition URL is shared by hand, so the codec is
// exercised against the values that actually break naive
// splitting: the separators themselves, the escape
// character, and text a URL layer would re-encode.
const shape = (
  composition: Composition,
): SoftStr =>
  [composition.head, ...composition.rest]
    .map(
      (column: Column): SoftStr =>
        column.route +
        "[" +
        pipe(column.span, getOr("-")) +
        "]",
    )
    .join(" ");

// What a URL parser hands back: the percent-DECODED value.
const decodedValue = (
  query: SoftStr,
  key: SoftStr,
): Option<SoftStr> =>
  pipe(
    new URL("http://x" + query).searchParams.get(
      key,
    ),
    (raw: string | null): Option<SoftStr> =>
      raw === null ? none() : some(raw),
  );

// Emit a composition, read it back through a real URL
// parser, and describe what came out — the round trip the
// whole format has to survive.
const roundTrip = (
  composition: Composition,
): SoftStr =>
  pipe(
    compositionQuery(composition),
    (query: SoftStr): SoftStr =>
      shape(
        decodeComposition(
          composition.head.route,
          decodedValue(query, "c"),
          decodedValue(query, "q"),
        ),
      ),
  );

test("one unmarked document needs no query at all", () =>
  all([
    check(
      compositionQuery(soloComposition("/core/")),
      toBe(""),
    ),
    check(
      compositionHref(soloComposition("/core/")),
      toBe("/core/"),
    ),
  ]));

test("the rest of the strip rides in `c`, routes readable", () =>
  check(
    compositionHref({
      head: columnOf("/core/values/"),
      rest: [
        columnOf("/core/effects/"),
        columnOf("/guide/intro/"),
      ],
    }),
    toBe(
      "/core/values/?c=/core/effects/,/guide/intro/",
    ),
  ));

test("a marked head rides in `q`", () =>
  check(
    compositionHref({
      head: columnWithSpan(
        "/core/",
        some(
          "depth does not consume the viewport",
        ),
      ),
      rest: [],
    }),
    toBe(
      "/core/?q=depth%20does%20not%20consume%20the%20viewport",
    ),
  ));

test("a column's span rides beside its route in `c`", () =>
  check(
    compositionHref({
      head: columnOf("/core/"),
      rest: [
        columnWithSpan(
          "/effects/",
          some("a passage"),
        ),
      ],
    }),
    toBe("/core/?c=/effects/:a%20passage"),
  ));

test("round-trips text carrying the separators themselves", () =>
  all([
    check(
      roundTrip({
        head: columnWithSpan(
          "/a/",
          some("first, second: third ~ fourth"),
        ),
        rest: [
          columnWithSpan("/b/", some("a,b:c~d")),
          columnOf("/c/"),
        ],
      }),
      toBe(
        "/a/[first, second: third ~ fourth] /b/[a,b:c~d] /c/[-]",
      ),
    ),
    // and the characters a URL layer would re-encode
    check(
      roundTrip({
        head: columnOf("/a/"),
        rest: [
          columnWithSpan(
            "/b/",
            some("100% & more #1 — 日本語"),
          ),
        ],
      }),
      toBe("/a/[-] /b/[100% & more #1 — 日本語]"),
    ),
  ]));

test("a composition with no query decodes to the head alone", () =>
  check(
    shape(
      decodeComposition("/core/", none(), none()),
    ),
    toBe("/core/[-]"),
  ));

test("a malformed `c` degrades to the entries that parse", () =>
  all([
    // empty entries contribute nothing
    check(
      shape(
        decodeComposition(
          "/a/",
          some(",,/b/,"),
          none(),
        ),
      ),
      toBe("/a/[-] /b/[-]"),
    ),
    // an entry that is only a separator has no route
    check(
      shape(
        decodeComposition(
          "/a/",
          some(":x"),
          none(),
        ),
      ),
      toBe("/a/[-]"),
    ),
    // a trailing separator marks no passage
    check(
      shape(
        decodeComposition(
          "/a/",
          some("/b/:"),
          none(),
        ),
      ),
      toBe("/a/[-] /b/[-]"),
    ),
    // an empty `q` marks no passage either
    check(
      shape(
        decodeComposition(
          "/a/",
          none(),
          some(""),
        ),
      ),
      toBe("/a/[-]"),
    ),
    // a wholly empty `c` is the head alone
    check(
      shape(
        decodeComposition(
          "/a/",
          some(""),
          none(),
        ),
      ),
      toBe("/a/[-]"),
    ),
  ]));
