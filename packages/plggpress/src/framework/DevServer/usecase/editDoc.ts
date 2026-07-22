import {
  type SoftStr,
  type Result,
  ok,
  err,
  pipe,
  mapResult,
  chainResult,
  fromNullable,
  matchOption,
} from "plgg";

// The granular edit model, PROMOTED to production plggpress
// from PoC 4b's proven, 100%-covered core
// (`plgg-poc4b-coedit/src/edit.ts`): the write half only (the
// diff-segment/animation surface stays in the PoC, since the
// dev-server patch endpoint only needs to LOCATE and APPLY,
// never to animate). An edit is a list of `{find, replace}`
// span replacements; this module LOCATES each `find` (exactly
// once, else a typed error) and APPLIES the located ops (text
// in → text out), so the write seam never rewrites the whole
// file. Every function is total and pure (no fs), so the
// applier and locator are exhaustively unit-tested offline.

/**
 * One granular edit: replace the span that reads exactly
 * `find` with `replace`. `find` must occur exactly once in
 * the target document.
 */
export type EditOp = Readonly<{
  find: SoftStr;
  replace: SoftStr;
}>;

/**
 * Why a set of edits could not be applied — a closed union,
 * one variant per rejected shape, carrying the offending
 * `find` so the caller's report can name it and retry
 * (self-explanatory-ui: the refusal says what to do next).
 */
export type EditError = Readonly<{
  kind:
    | "EmptyFind"
    | "FindAbsent"
    | "FindAmbiguous"
    | "OverlappingEdits";
  message: SoftStr;
  find: SoftStr;
}>;

const refuse = (
  kind: EditError["kind"],
  message: SoftStr,
  find: SoftStr,
): EditError => ({ kind, message, find });

/** One op resolved to the `[start, end)` span it replaces. */
type Located = Readonly<{
  op: EditOp;
  start: number;
  end: number;
}>;

/**
 * How many non-overlapping times `find` occurs in `text`
 * (left to right). `find` is guaranteed non-empty by the
 * caller, so `split` is a safe, allocation-cheap count.
 */
const countOf = (
  text: SoftStr,
  find: SoftStr,
): number => text.split(find).length - 1;

/**
 * Locate ONE op: reject an empty `find`, an absent one (0
 * matches), and an ambiguous one (>1 match); otherwise the
 * single occurrence's span. Exactly-once is the whole
 * correctness contract of a find/replace edit — an ambiguous
 * match must never silently pick the first.
 */
const locateOne = (
  text: SoftStr,
  op: EditOp,
): Result<Located, EditError> =>
  op.find === ""
    ? err(
        refuse(
          "EmptyFind",
          "an edit had an empty `find` — every edit must quote the exact text to replace",
          op.find,
        ),
      )
    : pipe(
        countOf(text, op.find),
        (
          n: number,
        ): Result<Located, EditError> =>
          n === 0
            ? err(
                refuse(
                  "FindAbsent",
                  `couldn't find ${JSON.stringify(op.find)} in the document — quote the exact current text, character for character`,
                  op.find,
                ),
              )
            : n > 1
              ? err(
                  refuse(
                    "FindAmbiguous",
                    `${JSON.stringify(op.find)} appears ${n} times — include more surrounding text so it matches exactly once`,
                    op.find,
                  ),
                )
              : ok({
                  op,
                  start: text.indexOf(op.find),
                  end:
                    text.indexOf(op.find) +
                    op.find.length,
                }),
      );

/** True when a span sorted after `prev` starts before `prev` ends. */
const overlaps = (
  sorted: ReadonlyArray<Located>,
  cur: Located,
  i: number,
): boolean =>
  i > 0 &&
  pipe(
    fromNullable(sorted[i - 1]),
    matchOption(
      (): boolean => false,
      (prev: Located): boolean =>
        cur.start < prev.end,
    ),
  );

/**
 * Locate EVERY op against the document: each `find` exactly
 * once (else a typed error), then the ops sorted by position
 * with any overlap rejected. The single source
 * {@link applyEdits} reads, so a batch of edits can never
 * silently corrupt the file.
 */
export const locateEdits = (
  text: SoftStr,
  ops: ReadonlyArray<EditOp>,
): Result<ReadonlyArray<Located>, EditError> =>
  pipe(
    ops.reduce<
      Result<ReadonlyArray<Located>, EditError>
    >(
      (acc, op) =>
        pipe(
          acc,
          chainResult(
            (
              list: ReadonlyArray<Located>,
            ): Result<
              ReadonlyArray<Located>,
              EditError
            > =>
              pipe(
                locateOne(text, op),
                mapResult(
                  (
                    one: Located,
                  ): ReadonlyArray<Located> => [
                    ...list,
                    one,
                  ],
                ),
              ),
          ),
        ),
      ok([]),
    ),
    chainResult(
      (
        list: ReadonlyArray<Located>,
      ): Result<
        ReadonlyArray<Located>,
        EditError
      > => {
        const sorted = [...list].sort(
          (a, b) => a.start - b.start,
        );
        return pipe(
          fromNullable(
            sorted.find((cur, i) =>
              overlaps(sorted, cur, i),
            ),
          ),
          matchOption(
            (): Result<
              ReadonlyArray<Located>,
              EditError
            > => ok(sorted),
            (
              clash: Located,
            ): Result<
              ReadonlyArray<Located>,
              EditError
            > =>
              err(
                refuse(
                  "OverlappingEdits",
                  `two edits touch the same text near ${JSON.stringify(clash.op.find)} — split them or widen one`,
                  clash.op.find,
                ),
              ),
          ),
        );
      },
    ),
  );

/**
 * Apply the located ops: text in → new text out, splicing
 * each `replace` over its span and keeping everything else
 * byte-for-byte. Never a whole-file rewrite — only the
 * located spans change.
 */
export const applyEdits = (
  text: SoftStr,
  ops: ReadonlyArray<EditOp>,
): Result<SoftStr, EditError> =>
  pipe(
    locateEdits(text, ops),
    mapResult(
      (
        located: ReadonlyArray<Located>,
      ): SoftStr =>
        pipe(
          located.reduce<
            Readonly<{
              out: SoftStr;
              cursor: number;
            }>
          >(
            (acc, l) => ({
              out:
                acc.out +
                text.slice(acc.cursor, l.start) +
                l.op.replace,
              cursor: l.end,
            }),
            { out: "", cursor: 0 },
          ),
          (
            folded: Readonly<{
              out: SoftStr;
              cursor: number;
            }>,
          ): SoftStr =>
            folded.out +
            text.slice(folded.cursor),
        ),
    ),
  );
