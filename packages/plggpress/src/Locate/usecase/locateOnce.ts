import {
  type SoftStr,
  type Result,
  ok,
  err,
  pipe,
} from "plgg";

// The EXACTLY-ONCE locator, and the whole correctness
// argument behind two very different features:
//
//   - `edit_doc` writes only where a quoted span occurs
//     exactly once, so an ambiguous edit can never silently
//     pick the first match;
//   - a composition URL highlights only a span that occurs
//     exactly once, so a passage the assistant paraphrased
//     or invented CANNOT BE DISPLAYED AT ALL — it will not
//     locate, and an unlocatable span renders nothing.
//
// One implementation, two callers. A second locator would
// be a second definition of "the document says this", and
// they would drift.

/**
 * Why a span could not be addressed. A closed union, one
 * variant per rejected shape, carrying the offending text
 * so a report can name it and a caller can retry with more
 * surrounding context.
 */
export type LocateError = Readonly<{
  kind:
    "EmptyFind" | "FindAbsent" | "FindAmbiguous";
  message: SoftStr;
  find: SoftStr;
}>;

/** The one occurrence, as the `[start, end)` span it fills. */
export type Located = Readonly<{
  find: SoftStr;
  start: number;
  end: number;
}>;

const refuse = (
  kind: LocateError["kind"],
  message: SoftStr,
  find: SoftStr,
): LocateError => ({ kind, message, find });

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
 * Locate `find` in `text`: reject an empty span, an absent
 * one (0 matches), and an ambiguous one (>1 match);
 * otherwise the single occurrence. Exactly-once is the
 * whole contract — an ambiguous match must never silently
 * pick the first.
 */
export const locateOnce = (
  text: SoftStr,
  find: SoftStr,
): Result<Located, LocateError> =>
  find === ""
    ? err(
        refuse(
          "EmptyFind",
          "an edit had an empty `find` — every edit must quote the exact text to replace",
          find,
        ),
      )
    : pipe(
        countOf(text, find),
        (
          n: number,
        ): Result<Located, LocateError> =>
          n === 0
            ? err(
                refuse(
                  "FindAbsent",
                  `couldn't find ${JSON.stringify(find)} in the document — quote the exact current text, character for character`,
                  find,
                ),
              )
            : n > 1
              ? err(
                  refuse(
                    "FindAmbiguous",
                    `${JSON.stringify(find)} appears ${n} times — include more surrounding text so it matches exactly once`,
                    find,
                  ),
                )
              : ok({
                  find,
                  start: text.indexOf(find),
                  end:
                    text.indexOf(find) +
                    find.length,
                }),
      );
