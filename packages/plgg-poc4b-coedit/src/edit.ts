/**
 * The PURE HEART of PoC 4b — the granular edit model that
 * makes a change watchable. PoC 4's `edit_file(path,
 * whole_content)` regenerated the entire document, so no
 * change was localized. Here an edit is a list of
 * `{ find, replace }` span replacements, and this module
 * is the ONE authority that:
 *
 *   1. LOCATES each `find` in the document — it must
 *      match exactly once; empty / absent / ambiguous is
 *      a TYPED error the model can act on (mirrors
 *      search_docs's "try again with more context" loop);
 *   2. APPLIES the located ops (text in → text out), so
 *      the write seam never rewrites the whole file;
 *   3. computes the DIFF SEGMENTS — the ordered
 *      kept/changed split the preview animates and diffs.
 *
 * Every function is total and pure (no fs, no DOM, no
 * network), so the applier, the span locator, and the
 * diff builder are exhaustively unit-tested offline. The
 * two visualization modes are just two renderings of the
 * SAME segments — the decision of WHAT changed lives
 * here, HOW it animates lives in the view.
 */
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

/**
 * One granular edit: replace the span that reads exactly
 * `find` with `replace`. `find` must occur exactly once
 * in the target document.
 */
export type EditOp = Readonly<{
  find: SoftStr;
  replace: SoftStr;
}>;

/**
 * Why a set of edits could not be applied — a closed
 * union, one variant per rejected shape, carrying the
 * offending `find` so the model's function-output can
 * name it and retry (self-explanatory-ui: the refusal
 * says what to do next).
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
 * Locate ONE op: reject an empty `find`, an absent one
 * (0 matches), and an ambiguous one (>1 match); otherwise
 * the single occurrence's span. Exactly-once is the whole
 * correctness contract of a find/replace edit — an
 * ambiguous match must never silently pick the first.
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
 * Locate EVERY op against the document: each `find`
 * exactly once (else a typed error), then the ops sorted
 * by position with any overlap rejected. The single
 * source both {@link applyEdits} and {@link diffSegments}
 * read, so the written file and the animated preview can
 * never disagree about where the change is.
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
 * each `replace` over its span and keeping everything
 * else byte-for-byte. Never a whole-file rewrite — only
 * the located spans change.
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

/**
 * One region of the document as the preview reads it:
 * text carried through unchanged, or a span the edit
 * rewrote (its `before` and `after`). Concatenating every
 * segment's `after`/`text` reproduces the new document
 * exactly, so the preview IS the document, annotated.
 */
export type DocSegment =
  | Readonly<{ kind: "kept"; text: SoftStr }>
  | Readonly<{
      kind: "changed";
      before: SoftStr;
      after: SoftStr;
    }>;

/** Build a kept (carried-through) segment. */
export const keptSegment = (
  text: SoftStr,
): DocSegment => ({
  kind: "kept",
  text,
});

/** Build a changed (rewritten) segment. */
export const changedSegment = (
  before: SoftStr,
  after: SoftStr,
): DocSegment => ({
  kind: "changed",
  before,
  after,
});

/**
 * The DIFF the preview animates and compares: the
 * document split, in order, into kept runs and changed
 * spans. Computed from the SAME located ops as
 * {@link applyEdits}, so preview and disk stay in
 * lock-step. Empty kept runs (adjacent edits, an edit at
 * the very start/end) are dropped, so no empty node is
 * rendered.
 */
export const diffSegments = (
  text: SoftStr,
  ops: ReadonlyArray<EditOp>,
): Result<ReadonlyArray<DocSegment>, EditError> =>
  pipe(
    locateEdits(text, ops),
    mapResult(
      (
        located: ReadonlyArray<Located>,
      ): ReadonlyArray<DocSegment> =>
        pipe(
          located.reduce<
            Readonly<{
              segs: ReadonlyArray<DocSegment>;
              cursor: number;
            }>
          >(
            (acc, l) => ({
              segs: [
                ...acc.segs,
                ...(l.start > acc.cursor
                  ? [
                      keptSegment(
                        text.slice(
                          acc.cursor,
                          l.start,
                        ),
                      ),
                    ]
                  : []),
                changedSegment(
                  l.op.find,
                  l.op.replace,
                ),
              ],
              cursor: l.end,
            }),
            { segs: [], cursor: 0 },
          ),
          (
            folded: Readonly<{
              segs: ReadonlyArray<DocSegment>;
              cursor: number;
            }>,
          ): ReadonlyArray<DocSegment> => [
            ...folded.segs,
            ...(folded.cursor < text.length
              ? [
                  keptSegment(
                    text.slice(folded.cursor),
                  ),
                ]
              : []),
          ],
        ),
    ),
  );

/** A whole (unedited) document as one kept segment. */
export const wholeDocSegments = (
  text: SoftStr,
): ReadonlyArray<DocSegment> =>
  text === "" ? [] : [keptSegment(text)];

/**
 * A changed span narrowed to its truly-different middle:
 * the shared prefix and suffix of `before`/`after` peeled
 * off as context. So "the **cat** sat" → "the **dog**
 * sat" animates only `cat`→`dog`, not the whole span —
 * the crisp "watch the word change" the whiteboard feel
 * needs even when the model quotes a wide `find`.
 */
export type RefinedChange = Readonly<{
  prefix: SoftStr;
  before: SoftStr;
  after: SoftStr;
  suffix: SoftStr;
}>;

/** Length of the longest common prefix of two strings. */
const commonPrefixLen = (
  a: SoftStr,
  b: SoftStr,
): number => {
  const max = Math.min(a.length, b.length);
  // Irreducible left-to-right scan comparing code units;
  // isolated and pure (reads two strings, returns a count).
  let i = 0;
  while (i < max && a.charAt(i) === b.charAt(i)) {
    i++;
  }
  return i;
};

/** Length of the longest common suffix of two strings. */
const commonSuffixLen = (
  a: SoftStr,
  b: SoftStr,
): number => {
  const max = Math.min(a.length, b.length);
  // Same irreducible scan, from the tail.
  let i = 0;
  while (
    i < max &&
    a.charAt(a.length - 1 - i) ===
      b.charAt(b.length - 1 - i)
  ) {
    i++;
  }
  return i;
};

export const refineChange = (
  before: SoftStr,
  after: SoftStr,
): RefinedChange => {
  const p = commonPrefixLen(before, after);
  // Suffix measured on what remains AFTER the shared
  // prefix, so prefix and suffix never overlap.
  const s = commonSuffixLen(
    before.slice(p),
    after.slice(p),
  );
  return {
    prefix: before.slice(0, p),
    before: before.slice(p, before.length - s),
    after: after.slice(p, after.length - s),
    suffix:
      s === 0
        ? ""
        : before.slice(before.length - s),
  };
};

/**
 * The granular edit tool the Realtime session exposes
 * next to `search_docs` — the shape that makes the change
 * small and watchable. `edit_doc(path, edits)` where each
 * edit is a `{ find, replace }`; the model is pushed
 * toward the SMALLEST span (one addressable delta), which
 * is exactly what the preview animates.
 */
export const EDIT_TOOL = {
  type: "function",
  name: "edit_doc",
  description:
    "Make one or more SMALL, targeted edits to the open markdown document. Each edit is a {find, replace}: `find` is the EXACT current text to change — quote it verbatim, character for character — and it MUST occur exactly once in the document (if it is ambiguous, include more surrounding text so it matches one place only); `replace` is the new text. Prefer the SMALLEST edit that satisfies the request — one short span, not the whole paragraph — so the change is watchable on the preview. Narrate to the writer what you are changing. Only .md files inside the corpus can be edited; the writer sees the change animate in place.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Content-relative path of the .md document to edit",
      },
      edits: {
        type: "array",
        description:
          "The edits to apply, in document order",
        items: {
          type: "object",
          properties: {
            find: {
              type: "string",
              description:
                "The exact current text to replace (must occur exactly once)",
            },
            replace: {
              type: "string",
              description: "The new text",
            },
          },
          required: ["find", "replace"],
          additionalProperties: false,
        },
      },
    },
    required: ["path", "edits"],
    additionalProperties: false,
  },
};
