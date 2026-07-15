/**
 * THE RESEARCH SURFACE OF PoC 4c — mapping a markdown
 * `{find, replace}` onto a span of the REAL rendered page.
 *
 * PoC 4b patched a preview surface it OWNED: the markdown
 * WAS the preview, so a located span was directly a node
 * it could animate. Here the document is rendered by the
 * internal plggpress dev server and proxied, so the thing
 * on screen is real site HTML — the markdown span and the
 * DOM span are NOT the same text. This module is the ONE
 * authority on whether a given edit can be pointed at a
 * span of rendered text, and it is pure: it takes the
 * edit and the page's text runs as VALUES and returns a
 * located hit or a TYPED refusal. The DOM walk itself
 * (collecting text nodes, splitting one, animating it)
 * lives at the edge in `patchClient.ts`, so every
 * decision here is unit-tested offline.
 *
 * The refusals are the honest half of the result. A PoC
 * that silently animated the wrong span — or claimed a
 * change the reader cannot see — would be worse than one
 * that says "this edit does not map, fall back to the
 * reload". Every failure below is a real class of edit
 * that the rendered DOM genuinely cannot show in place,
 * and each one degrades to PoC 4's proven behaviour (let
 * the hot reload through) rather than to a lie.
 */
import {
  type SoftStr,
  type Option,
  type Result,
  ok,
  err,
  some,
  none,
  pipe,
  fromNullable,
  matchOption,
  matchResult,
  chainResult,
  mapResult,
} from "plgg";
import {
  type EditOp,
  refineChange,
} from "./poc4b.ts";

/**
 * Why an edit could not be pointed at a rendered span — a
 * closed union, one variant per genuinely-unmappable
 * shape, each carrying words the page can show the writer
 * (self-explanatory-ui) and the shell can log as a
 * measured gap.
 */
export type MapFailure = Readonly<{
  kind:
    | "BlockSpanning"
    | "EmptyRendered"
    | "MarkupOnly"
    | "NotInDom"
    | "AmbiguousInDom";
  message: SoftStr;
}>;

const refuse = (
  kind: MapFailure["kind"],
  message: SoftStr,
): MapFailure => ({ kind, message });

/**
 * The rendered text of a markdown span, approximated by
 * peeling the markup a renderer consumes. This is
 * deliberately an APPROXIMATION, not a second markdown
 * parser: plgg-md already renders the page, and running a
 * rival parser here to predict its output would be the
 * clone-garbage anti-pattern. Approximating is sound
 * because the result is only ever used to SEARCH the real
 * DOM text — a wrong guess cannot corrupt anything, it
 * just fails to match and reports `NotInDom`, which
 * degrades to the reload.
 */
const BLOCK_LEAD =
  /^\s*(?:#{1,6}\s+|>\s+|[-*+]\s+|\d+\.\s+)/;

/**
 * Inline markup → the text a reader actually sees.
 * Ordered: images before links (an image IS a bracketed
 * link with a bang), and the two-marker emphases before
 * the one-marker ones, so `**x**` is not eaten as `*` +
 * `*x*`.
 */
const INLINE_RULES: ReadonlyArray<
  Readonly<{ pattern: RegExp; into: SoftStr }>
> = [
  { pattern: /!\[([^\]]*)\]\([^)]*\)/g, into: "$1" },
  { pattern: /\[([^\]]*)\]\([^)]*\)/g, into: "$1" },
  { pattern: /`([^`]*)`/g, into: "$1" },
  { pattern: /\*\*([^*]*)\*\*/g, into: "$1" },
  { pattern: /__([^_]*)__/g, into: "$1" },
  { pattern: /~~([^~]*)~~/g, into: "$1" },
  { pattern: /\*([^*]*)\*/g, into: "$1" },
  { pattern: /_([^_]*)_/g, into: "$1" },
];

export const renderedTextOf = (
  md: SoftStr,
): SoftStr =>
  INLINE_RULES.reduce(
    (text, rule) =>
      text.replace(rule.pattern, rule.into),
    md.replace(BLOCK_LEAD, ""),
  );

/** The rendered before/after an edit means on the page. */
export type PlainChange = Readonly<{
  before: SoftStr;
  after: SoftStr;
}>;

/**
 * The RENDERED span an edit should be anchored on.
 *
 * The order of operations here is the correctness crux of
 * the whole module, and it is the opposite of the obvious
 * one. The obvious version narrows the MARKDOWN with 4b's
 * `refineChange` and renders the result — and it is
 * quietly dangerous: `[docs](/old)` → `[docs](/new)`
 * narrows to `old`→`new`, a span that lives inside a URL.
 * Rendered, that becomes "find the word `old` on the
 * page" — and if the prose happens to contain `old` once,
 * the writer watches a word change that the edit never
 * touched, while something else changes on disk. Exactly
 * the "silently animated the wrong span" failure this PoC
 * must not have.
 *
 * So the text is rendered FIRST and narrowed second. Every
 * anchor is then, by construction, real rendered text —
 * refinement can only ever narrow within what the reader
 * actually sees.
 *
 * The widening case stays 4b's: a pure INSERTION narrows
 * to an empty `before` ("web development" → "web plus AI
 * development" narrows to ""→"plus AI "), and an empty
 * span cannot be located — there is no text to point at.
 * Same for a pure deletion's empty `after`. Both widen
 * back to the whole rendered span, so the animation has
 * something real to erase and rewrite.
 */
export const anchorOf = (
  plain: PlainChange,
): PlainChange =>
  pipe(
    refineChange(plain.before, plain.after),
    (r): PlainChange =>
      r.before === "" || r.after === ""
        ? plain
        : { before: r.before, after: r.after },
  );

/**
 * Decide whether an edit maps onto rendered text at all,
 * and to WHAT — the pure half of the mapping. Rejects the
 * three classes that are unmappable no matter what the
 * page looks like:
 *
 * - `EmptyRendered`: the old text renders to nothing (a
 *   marker-only edit, e.g. `## ` → `### `). There is no
 *   text on the page to erase.
 * - `MarkupOnly`: the WHOLE find and the WHOLE replace
 *   render to the same text (`cat` → `**cat**`, or a link
 *   whose target changed but whose label did not). The
 *   words on the page do not change, so an animation would
 *   be theatre — the change is structural and only a
 *   re-render shows it. Judged on the whole op, before any
 *   narrowing, which is what keeps the URL case above from
 *   being mistaken for a word swap.
 * - `BlockSpanning`: the anchor still carries a newline
 *   after narrowing, so the change genuinely crosses block
 *   elements (paragraphs, list items) and no single
 *   contiguous rendered span can represent it. Note a wide
 *   `find` that merely SPANS blocks while changing one
 *   word inside them is fine — narrowing lands the anchor
 *   in a single block, and that is the common case.
 */
export const mappableChange = (
  op: EditOp,
): Result<PlainChange, MapFailure> =>
  pipe(
    {
      before: renderedTextOf(op.find),
      after: renderedTextOf(op.replace),
    },
    (
      plain: PlainChange,
    ): Result<PlainChange, MapFailure> =>
      plain.before === ""
        ? err(
            refuse(
              "EmptyRendered",
              "the edited text is markdown structure only (a heading or list marker), which renders to no visible text",
            ),
          )
        : plain.before === plain.after
          ? err(
              refuse(
                "MarkupOnly",
                "the edit changes markup, not the rendered words (emphasis, a code span, or a link target), so the page's text is unchanged",
              ),
            )
          : pipe(
              anchorOf(plain),
              (
                anchor: PlainChange,
              ): Result<
                PlainChange,
                MapFailure
              > =>
                anchor.before.includes("\n") ||
                anchor.after.includes("\n")
                  ? err(
                      refuse(
                        "BlockSpanning",
                        "the edit spans more than one block (the changed text contains a line break), so it has no single span on the rendered page",
                      ),
                    )
                  : ok(anchor),
            ),
  );

/**
 * Where a rendered span sits among the page's text runs:
 * which run, and at what offset inside it. The DOM edge
 * turns this back into a real Text node + split point.
 */
export type TextHit = Readonly<{
  run: number;
  offset: number;
  plain: PlainChange;
}>;

/** One occurrence of a needle: which run, what offset. */
type Occurrence = Readonly<{
  run: number;
  offset: number;
}>;

/**
 * EVERY occurrence of `needle` in one run, left to right.
 * Split-and-walk rather than a `indexOf` loop: the pieces
 * between the matches are exactly what advances the
 * cursor, so the offsets fall out of the fold.
 */
const occurrencesIn = (
  text: SoftStr,
  needle: SoftStr,
  run: number,
): ReadonlyArray<Occurrence> =>
  text
    .split(needle)
    .reduce<
      Readonly<{
        found: ReadonlyArray<Occurrence>;
        at: number;
      }>
    >(
      (acc, piece, i, pieces) =>
        i === pieces.length - 1
          ? acc
          : {
              found: [
                ...acc.found,
                { run, offset: acc.at + piece.length },
              ],
              at:
                acc.at +
                piece.length +
                needle.length,
            },
      { found: [], at: 0 },
    ).found;

/**
 * Locate a rendered span among the page's text runs — the
 * SAME exactly-once contract as 4b's markdown locator,
 * for the same reason: an ambiguous match must never
 * silently pick the first, or the writer watches the
 * wrong word change while a different one changes on disk.
 *
 * Note what `runs` being flat, per-text-node strings
 * implies: a span that crosses an inline element boundary
 * ("the cat sat" when `cat` is bold, so the page holds
 * three separate runs) is NOT found here. That is a real,
 * reported gap (`NotInDom`), not a bug — see the README.
 */
export const locateInRuns = (
  runs: ReadonlyArray<SoftStr>,
  plain: PlainChange,
): Result<TextHit, MapFailure> =>
  pipe(
    runs.flatMap((text, run) =>
      occurrencesIn(text, plain.before, run),
    ),
    (
      found: ReadonlyArray<Occurrence>,
    ): Result<TextHit, MapFailure> =>
      pipe(
        fromNullable(found[0]),
        matchOption(
          (): Result<TextHit, MapFailure> =>
            err(
              refuse(
                "NotInDom",
                `the rendered page has no span reading ${JSON.stringify(plain.before)} — the renderer either transformed it or split it across elements`,
              ),
            ),
          (
            first: Occurrence,
          ): Result<TextHit, MapFailure> =>
            found.length > 1
              ? err(
                  refuse(
                    "AmbiguousInDom",
                    `${JSON.stringify(plain.before)} appears ${found.length} times on the rendered page, so the edited one cannot be told apart`,
                  ),
                )
              : ok({
                  run: first.run,
                  offset: first.offset,
                  plain,
                }),
        ),
      ),
  );

/**
 * The spans worth trying, best first.
 *
 * Narrowing makes the animation crisp, but it can narrow
 * TOO far: `## Option, not null` → `## Option, never null`
 * refines to `ot`→`ever`, and `ot` occurs all over a page
 * (in "not", "other", "another"…), so the crisp anchor
 * refuses itself as ambiguous. Measured on the real guide
 * render, this was the single biggest cause of a
 * fallback-to-reload — several ordinary heading and prose
 * edits, each of which is perfectly locatable at its full
 * width.
 *
 * So the narrow anchor is a PREFERENCE, not a commitment:
 * when it cannot be located, the full rendered span is
 * tried, which is longer and therefore far more likely to
 * be unique. Crispness where possible, a watchable change
 * where not — and a refusal only when neither width
 * works.
 */
export type Candidates = Readonly<{
  narrow: PlainChange;
  wide: Option<PlainChange>;
}>;

export const candidatesOf = (
  op: EditOp,
): Result<Candidates, MapFailure> =>
  pipe(
    mappableChange(op),
    mapResult(
      (narrow: PlainChange): Candidates =>
        pipe(
          {
            before: renderedTextOf(op.find),
            after: renderedTextOf(op.replace),
          },
          (wide: PlainChange): Candidates => ({
            narrow,
            // Only a DIFFERENT, single-block wide span is
            // worth a second attempt.
            wide:
              wide.before === narrow.before ||
              wide.before.includes("\n") ||
              wide.after.includes("\n")
                ? none()
                : some(wide),
          }),
        ),
    ),
  );

/** Try the narrow span, then the wide one; else refuse. */
const locateCandidates = (
  runs: ReadonlyArray<SoftStr>,
  candidates: Candidates,
): Result<TextHit, MapFailure> =>
  pipe(
    locateInRuns(runs, candidates.narrow),
    matchResult(
      (
        failure: MapFailure,
      ): Result<TextHit, MapFailure> =>
        pipe(
          candidates.wide,
          matchOption(
            (): Result<TextHit, MapFailure> =>
              err(failure),
            (
              wide: PlainChange,
            ): Result<TextHit, MapFailure> =>
              pipe(
                locateInRuns(runs, wide),
                matchResult(
                  // Report the NARROW failure: it is the
                  // primary attempt, and its reason is the
                  // one that describes the edit.
                  (): Result<
                    TextHit,
                    MapFailure
                  > => err(failure),
                  (
                    hit: TextHit,
                  ): Result<
                    TextHit,
                    MapFailure
                  > => ok(hit),
                ),
              ),
          ),
        ),
      (hit: TextHit): Result<TextHit, MapFailure> =>
        ok(hit),
    ),
  );

/**
 * THE mapping: a markdown edit plus the rendered page's
 * text runs → the one span to animate, or the typed
 * reason it cannot be. Composed from the decisions above
 * so the caller (the injected client) holds no policy at
 * all — it only walks the DOM and moves pixels.
 */
export const mapEditToSpan = (
  op: EditOp,
  runs: ReadonlyArray<SoftStr>,
): Result<TextHit, MapFailure> =>
  pipe(
    candidatesOf(op),
    chainResult(
      (
        candidates: Candidates,
      ): Result<TextHit, MapFailure> =>
        locateCandidates(runs, candidates),
    ),
  );

/**
 * Map EVERY op of one `edit_doc` call — ALL-OR-NOTHING,
 * and this is a deliberate honesty rule rather than a
 * convenience. A call can carry several ops; the write
 * seam applies them atomically, so the file on disk is
 * all-or-nothing too. If this client animated the three
 * ops that map and quietly skipped the fourth, the page
 * would be showing a document that exists nowhere — worse
 * than either a full reload or an honest refusal. So one
 * unmappable op refuses the whole patch, and the caller
 * releases the reload, which shows the real, fully-edited
 * page ({@link ./reloadPolicy.ts}).
 *
 * The hits come back ordered LAST span first. Every patch
 * splits a text run, which invalidates every offset after
 * it in that same run; applying from the end backwards
 * means each hit's offset is still valid when its turn
 * comes — the same reason 4b's applier splices from a
 * cursor rather than re-searching.
 */
export const mapEditsToSpans = (
  ops: ReadonlyArray<EditOp>,
  runs: ReadonlyArray<SoftStr>,
): Result<ReadonlyArray<TextHit>, MapFailure> =>
  pipe(
    ops.reduce<
      Result<ReadonlyArray<TextHit>, MapFailure>
    >(
      (acc, op) =>
        pipe(
          acc,
          chainResult(
            (
              hits: ReadonlyArray<TextHit>,
            ): Result<
              ReadonlyArray<TextHit>,
              MapFailure
            > =>
              pipe(
                mapEditToSpan(op, runs),
                mapResult(
                  (
                    hit: TextHit,
                  ): ReadonlyArray<TextHit> => [
                    ...hits,
                    hit,
                  ],
                ),
              ),
          ),
        ),
      ok([]),
    ),
    mapResult(
      (
        hits: ReadonlyArray<TextHit>,
      ): ReadonlyArray<TextHit> =>
        [...hits].sort((a, b) =>
          a.run === b.run
            ? b.offset - a.offset
            : b.run - a.run,
        ),
    ),
  );
