import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  type Result,
  pipe,
  isNone,
  matchResult,
} from "plgg";
import { type EditOp } from "./poc4b.ts";
import {
  type MapFailure,
  type TextHit,
  type PlainChange,
  type Candidates,
  renderedTextOf,
  anchorOf,
  mappableChange,
  candidatesOf,
  locateInRuns,
  mapEditToSpan,
  mapEditsToSpans,
} from "./spanMap.ts";

// THE research surface: can a markdown {find,replace} be
// pointed at a span of the REAL rendered page? Every
// boundary is pinned here — including, deliberately, the
// ones that FAIL. The refusals are the PoC's measured
// gaps, so a change that silently turned a refusal into a
// guess (or vice versa) must break this file.

const op = (
  find: string,
  replace: string,
): EditOp => ({ find, replace });

const failureKind = (
  result: Result<unknown, MapFailure>,
): string =>
  pipe(
    result,
    matchResult(
      (f: MapFailure): string => f.kind,
      (): string => "ok",
    ),
  );

const hitOr = (
  result: Result<TextHit, MapFailure>,
  fallback: TextHit,
): TextHit =>
  pipe(
    result,
    matchResult(
      (): TextHit => fallback,
      (h: TextHit): TextHit => h,
    ),
  );

const plainOr = (
  result: Result<PlainChange, MapFailure>,
  fallback: PlainChange,
): PlainChange =>
  pipe(
    result,
    matchResult(
      (): PlainChange => fallback,
      (p: PlainChange): PlainChange => p,
    ),
  );

const NOWHERE: TextHit = {
  run: -1,
  offset: -1,
  plain: { before: "", after: "" },
};

/* ------------------------------------------------ *
 * renderedTextOf                                    *
 * ------------------------------------------------ */

test("renderedTextOf strips inline emphasis to the words a reader sees", () =>
  all([
    check(
      renderedTextOf("**bold**"),
      toBe("bold"),
    ),
    check(renderedTextOf("__bold__"), toBe("bold")),
    check(renderedTextOf("*italic*"), toBe("italic")),
    check(renderedTextOf("_italic_"), toBe("italic")),
    check(renderedTextOf("~~gone~~"), toBe("gone")),
    check(renderedTextOf("`code`"), toBe("code")),
  ]));

test("renderedTextOf keeps a link's label and drops its target — the label is what is on the page", () =>
  check(
    renderedTextOf(
      "see [the guide](https://example.com/x)",
    ),
    toBe("see the guide"),
  ));

test("renderedTextOf reduces an image to its alt text", () =>
  check(
    renderedTextOf("![a cat](/cat.png)"),
    toBe("a cat"),
  ));

test("renderedTextOf strips a leading block marker: a heading renders without its hashes", () =>
  all([
    check(
      renderedTextOf("## Getting started"),
      toBe("Getting started"),
    ),
    check(
      renderedTextOf("- a list item"),
      toBe("a list item"),
    ),
    check(
      renderedTextOf("1. first"),
      toBe("first"),
    ),
    check(
      renderedTextOf("> quoted"),
      toBe("quoted"),
    ),
  ]));

test("renderedTextOf does not eat `**x**` as two single-asterisk emphases", () =>
  check(
    renderedTextOf("a **b** c"),
    toBe("a b c"),
  ));

test("renderedTextOf leaves plain prose untouched", () =>
  check(
    renderedTextOf("just words here"),
    toBe("just words here"),
  ));

/* ------------------------------------------------ *
 * anchorOf                                          *
 * ------------------------------------------------ */

test("anchorOf narrows a wide span to its changed middle — the crisp span 4b tuned for", () =>
  check(
    anchorOf(
      change("the cat sat", "the dog sat"),
    ),
    toEqual({ before: "cat", after: "dog" }),
  ));

test("anchorOf widens back to the whole span for a pure INSERTION — an empty before has nothing to point at", () =>
  // The developer's own PoC-4 example. Narrowed it would
  // be ""→"plus AI ", which cannot be located in the DOM;
  // widened it is a real span to erase and rewrite.
  check(
    anchorOf(
      change(
        "web development",
        "web plus AI development",
      ),
    ),
    toEqual({
      before: "web development",
      after: "web plus AI development",
    }),
  ));

test("anchorOf widens back to the whole span for a pure DELETION too", () =>
  check(
    anchorOf(
      change("very good code", "very code"),
    ),
    toEqual({
      before: "very good code",
      after: "very code",
    }),
  ));

/* ------------------------------------------------ *
 * mappableChange — the refusals                     *
 * ------------------------------------------------ */

test("mappableChange maps an ordinary word swap", () =>
  check(
    plainOr(
      mappableChange(
        op("the cat sat", "the dog sat"),
      ),
      { before: "!", after: "!" },
    ),
    toEqual({ before: "cat", after: "dog" }),
  ));

test("mappableChange sees through markdown to the rendered words", () =>
  check(
    plainOr(
      mappableChange(
        op("**cat**", "**dog**"),
      ),
      { before: "!", after: "!" },
    ),
    toEqual({ before: "cat", after: "dog" }),
  ));

test("mappableChange REFUSES an edit whose CHANGE spans blocks — no single rendered span exists", () =>
  check(
    failureKind(
      mappableChange(
        op(
          "one\n\ntwo",
          "ONE\n\nTWO",
        ),
      ),
    ),
    toBe("BlockSpanning"),
  ));

test("mappableChange still maps a wide find that spans blocks but changes one word inside one of them", () =>
  // Narrowing lands the anchor back inside a single block,
  // so quoting a lot of context (which the tool asks the
  // model to do when disambiguating) does not cost the
  // animation.
  check(
    plainOr(
      mappableChange(
        op("one\n\ncat", "one\n\ndog"),
      ),
      { before: "!", after: "!" },
    ),
    toEqual({ before: "cat", after: "dog" }),
  ));

test("mappableChange REFUSES a marker-only edit — a heading level renders to no text", () =>
  check(
    failureKind(
      mappableChange(op("## ", "### ")),
    ),
    toBe("EmptyRendered"),
  ));

test("mappableChange REFUSES an emphasis-only edit — the page's words do not change", () =>
  check(
    failureKind(
      mappableChange(op("cat", "**cat**")),
    ),
    toBe("MarkupOnly"),
  ));

test("mappableChange REFUSES a link-target-only edit — the label is all the page shows", () =>
  check(
    failureKind(
      mappableChange(
        op(
          "[docs](https://old.example)",
          "[docs](https://new.example)",
        ),
      ),
    ),
    toBe("MarkupOnly"),
  ));

test("a link-target edit NEVER anchors on a word inside the URL — the wrong-span hazard", () =>
  // Regression pin. Narrowing the MARKDOWN first would
  // reduce this to `old`→`new`, and "old" occurs once in
  // the prose below — so the writer would watch the wrong
  // word change while the link changed on disk. Rendering
  // before narrowing is what forbids it: both sides render
  // to "docs", so the edit is refused as MarkupOnly and
  // the reload shows the truth.
  check(
    failureKind(
      mapEditToSpan(
        op(
          "[docs](https://old.example)",
          "[docs](https://new.example)",
        ),
        ["the old ways are docs"],
      ),
    ),
    toBe("MarkupOnly"),
  ));

test("a link whose LABEL changes maps onto the label, not the target", () =>
  check(
    plainOr(
      mappableChange(
        op("[cat](/a)", "[dog](/b)"),
      ),
      { before: "!", after: "!" },
    ),
    toEqual({ before: "cat", after: "dog" }),
  ));

/* ------------------------------------------------ *
 * locateInRuns                                      *
 * ------------------------------------------------ */

const change = (
  before: string,
  after: string,
): PlainChange => ({ before, after });

test("locateInRuns finds the one run and offset of a span", () =>
  check(
    hitOr(
      locateInRuns(
        ["intro text", "the cat sat"],
        change("cat", "dog"),
      ),
      NOWHERE,
    ),
    toEqual({
      run: 1,
      offset: 4,
      plain: { before: "cat", after: "dog" },
    }),
  ));

test("locateInRuns REFUSES a span the rendered page does not carry", () =>
  check(
    failureKind(
      locateInRuns(
        ["the cat sat"],
        change("hamster", "dog"),
      ),
    ),
    toBe("NotInDom"),
  ));

test("locateInRuns REFUSES an ambiguous span across runs — never silently picks the first", () =>
  check(
    failureKind(
      locateInRuns(
        ["the cat", "another cat"],
        change("cat", "dog"),
      ),
    ),
    toBe("AmbiguousInDom"),
  ));

test("locateInRuns REFUSES an ambiguous span repeated WITHIN one run", () =>
  check(
    failureKind(
      locateInRuns(
        ["cat and cat"],
        change("cat", "dog"),
      ),
    ),
    toBe("AmbiguousInDom"),
  ));

test("locateInRuns REFUSES a span split across inline elements — the measured gap", () =>
  // "the **cat** sat" renders as three separate text
  // runs, so a span reading "cat sat" exists nowhere as
  // contiguous text. Reported, not guessed.
  check(
    failureKind(
      locateInRuns(
        ["the ", "cat", " sat"],
        change("cat sat", "dog sat"),
      ),
    ),
    toBe("NotInDom"),
  ));

/* ------------------------------------------------ *
 * mapEditToSpan / mapEditsToSpans                   *
 * ------------------------------------------------ */

test("mapEditToSpan maps a markdown edit onto the rendered page end to end", () =>
  check(
    hitOr(
      mapEditToSpan(
        op("**cat**", "**dog**"),
        ["the cat sat"],
      ),
      NOWHERE,
    ),
    toEqual({
      run: 0,
      offset: 4,
      plain: { before: "cat", after: "dog" },
    }),
  ));

test("mapEditToSpan maps a heading edit — the hashes are not on the page, the words are", () =>
  check(
    hitOr(
      mapEditToSpan(
        op(
          "# Web development",
          "# Web plus AI development",
        ),
        ["Web development"],
      ),
      NOWHERE,
    ),
    toEqual({
      run: 0,
      offset: 0,
      plain: {
        before: "Web development",
        after: "Web plus AI development",
      },
    }),
  ));

test("a too-narrow anchor FALLS BACK to the full span rather than refusing — measured on the real guide render", () =>
  // "## Option, not null" → "## Option, never null"
  // refines to the fragment `ot`→`ever`, and `ot` recurs
  // all over a real page — the guide's own index.md
  // carries "Result, not throw" two headings below, so the
  // fragment is already ambiguous. The full heading text
  // is unique, so the change stays watchable.
  check(
    hitOr(
      mapEditToSpan(
        op(
          "## Option, not null",
          "## Option, never null",
        ),
        [
          "Option, not null",
          "Absence is a value you must handle, never a null that slips through.",
          "Result, not throw",
        ],
      ),
      NOWHERE,
    ),
    toEqual({
      run: 0,
      offset: 0,
      plain: {
        before: "Option, not null",
        after: "Option, never null",
      },
    }),
  ));

test("the narrow anchor still WINS when it is unambiguous — crispness is the preference, not the fallback", () =>
  check(
    hitOr(
      mapEditToSpan(
        op("the cat sat", "the dog sat"),
        ["the cat sat"],
      ),
      NOWHERE,
    ),
    toEqual({
      run: 0,
      offset: 4,
      plain: { before: "cat", after: "dog" },
    }),
  ));

test("when NEITHER width can be located, the NARROW failure is reported — it is the primary attempt", () =>
  check(
    failureKind(
      mapEditToSpan(
        op("a cat here", "a dog here"),
        ["nothing of the sort"],
      ),
    ),
    toBe("NotInDom"),
  ));

test("candidatesOf offers no second width when narrowing changed nothing", () =>
  check(
    pipe(
      candidatesOf(
        op(
          "web development",
          "web plus AI development",
        ),
      ),
      matchResult(
        (): boolean => false,
        (c: Candidates): boolean => isNone(c.wide),
      ),
    ),
    toBe(true),
  ));

test("mapEditsToSpans maps every op of one call", () =>
  check(
    pipe(
      mapEditsToSpans(
        [op("cat", "dog"), op("red", "blue")],
        ["the cat is red"],
      ),
      matchResult(
        (): number => -1,
        (hits: ReadonlyArray<TextHit>): number =>
          hits.length,
      ),
    ),
    toBe(2),
  ));

test("mapEditsToSpans orders hits LAST span first, so splicing one run cannot invalidate the next offset", () =>
  check(
    pipe(
      mapEditsToSpans(
        [op("cat", "dog"), op("red", "blue")],
        ["the cat is red"],
      ),
      matchResult(
        (): ReadonlyArray<number> => [],
        (
          hits: ReadonlyArray<TextHit>,
        ): ReadonlyArray<number> =>
          hits.map((h) => h.offset),
      ),
    ),
    toEqual([11, 4]),
  ));

test("mapEditsToSpans is ALL-OR-NOTHING: one unmappable op refuses the whole call", () =>
  // Otherwise the page would animate the ops that mapped
  // and silently skip the rest, showing a document that
  // exists neither on disk nor anywhere else.
  check(
    failureKind(
      mapEditsToSpans(
        [
          op("cat", "dog"),
          op("hamster", "gerbil"),
        ],
        ["the cat is red"],
      ),
    ),
    toBe("NotInDom"),
  ));

test("mapEditsToSpans on no ops is a vacuous success", () =>
  check(
    pipe(
      mapEditsToSpans([], ["anything"]),
      matchResult(
        (): number => -1,
        (hits: ReadonlyArray<TextHit>): number =>
          hits.length,
      ),
    ),
    toBe(0),
  ));
