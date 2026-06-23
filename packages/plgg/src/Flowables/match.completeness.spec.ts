import { test, expect } from "plgg-test";
import {
  ArgMatchable,
  IsEqual,
  FullCoveragedBoxes,
  ExtractPatternTags,
  IsAllAtomic,
  otherwise,
} from "plgg/index";

/**
 * Characterization tests for the type-level completeness of `match`.
 *
 * Each test PINS the CURRENT behavior of the coverage machinery
 * (`ArgMatchable` and its helpers) for a class of pattern-matching
 * inconsistency. Where the current behavior is a *gap* (an inconsistency the
 * types fail to flag, or a valid match wrongly collapsed to `never`), the test
 * documents it as such. These are the compile-checked baseline behind the gap
 * analysis in `docs/match-type-completeness.md`; when a follow-up ticket
 * implements a fix, the corresponding assertion will need to be updated,
 * making the behavior change explicit in the diff.
 *
 * The repo prohibits `as` / `any` / `@ts-ignore` (including `@ts-expect-error`),
 * so rejection is encoded as a positive assertion that the accepted argument
 * type collapses to `never` rather than via expect-error comments.
 */

// -------------------------
// Baselines: behavior that is already correct
// -------------------------

test("baseline: exhaustive atomic union is accepted", () => {
  // A = 1 | 2 | 3 fully covered by [1, 2, 3] -> accepted as the input union.
  type Accepted = ArgMatchable<[1, 2, 3], false, 1 | 2 | 3>;
  const _ok: IsEqual<Accepted, 1 | 2 | 3> = true;
  expect(_ok).toBe(true);
});

test("baseline: canonical boolean tuple [true, false] is accepted", () => {
  type Accepted = ArgMatchable<[true, false], false, boolean>;
  const _ok: IsEqual<Accepted, boolean> = true;
  expect(_ok).toBe(true);
});

test("baseline: missing atomic case collapses the argument to never", () => {
  // A = 1 | 2 | 3 but only [1, 2] provided, no otherwise -> never (rejected).
  type Accepted = ArgMatchable<[1, 2], false, 1 | 2 | 3>;
  const _ok: IsEqual<Accepted, never> = true;
  expect(_ok).toBe(true);
});

// -------------------------
// GAP 1 (false negative): duplicate / overlapping atomic patterns are invisible
// -------------------------

test("GAP: duplicate atomic patterns are not flagged", () => {
  // [1, 2, 3, 3] repeats `3`; the trailing branch is unreachable at runtime.
  // Coverage uses IsEqual<TupleToUnion<PATTERNS>, A>, and TupleToUnion collapses
  // the duplicate, so the union still equals A and the call is accepted.
  type Accepted = ArgMatchable<[1, 2, 3, 3], false, 1 | 2 | 3>;
  const _gap: IsEqual<Accepted, 1 | 2 | 3> = true;
  expect(_gap).toBe(true);

  // The same blindness at the helper level: the duplicate vanishes from the
  // extracted pattern set, so nothing downstream can observe the redundancy.
  type Dup = IsAllAtomic<[1, 2, 3, 3]>;
  const _allAtomic: IsEqual<Dup, true> = true;
  expect(_allAtomic).toBe(true);
});

// -------------------------
// GAP 2 (over-restriction / false positive): boolean coverage is shape- and
// order-rigid
// -------------------------

test("GAP: order-flipped boolean tuple [false, true] is wrongly rejected", () => {
  // Semantically exhaustive (both branches present) but Is<PATTERNS,[true,false]>
  // only accepts the exact tuple, so a flipped order collapses to never.
  type Accepted = ArgMatchable<[false, true], false, boolean>;
  const _gap: IsEqual<Accepted, never> = true;
  expect(_gap).toBe(true);
});

test("GAP: boolean closed with otherwise is wrongly rejected", () => {
  // match(a: boolean, [TRUE, ...], [otherwise, ...]) is exhaustive, but the
  // boolean branch ignores OTHERWISE_LAST entirely and demands [true, false].
  type Accepted = ArgMatchable<[true], true, boolean>;
  const _gap: IsEqual<Accepted, never> = true;
  expect(_gap).toBe(true);
});

// -------------------------
// GAP 3 (false negative): `otherwise` placement is only checked in the final slot
// -------------------------

test("GAP: a non-final otherwise is not detected as misplaced", () => {
  // OTHERWISE_LAST is derived solely from whether the LAST pattern is the
  // sentinel. A mid-list otherwise is therefore treated as an ordinary atomic
  // pattern: here it merely pollutes the union, so the call is rejected for an
  // incidental reason (union mismatch) rather than a targeted "otherwise must
  // be last" diagnostic. In mixed-family matches (GAP 5) the same misplacement
  // slips through entirely.
  type Accepted = ArgMatchable<
    [1, typeof otherwise, 3],
    false,
    1 | 2 | 3
  >;
  const _gap: IsEqual<Accepted, never> = true;
  expect(_gap).toBe(true);
});

// -------------------------
// GAP 4 (false negative): object-body patterns disable box exhaustiveness
// -------------------------

test("GAP: object-body box pattern is not a tag pattern, so coverage is not proven", () => {
  // FullCoveragedBoxes requires AreAllTagPatterns. An object-body pattern
  // (type: "object") is not a tag pattern, so a match built from object-body
  // patterns can never prove exhaustiveness and falls back to requiring a
  // trailing otherwise.
  type ObjectPattern = {
    __tag: string;
    type: "object";
    body: { type: "root" };
  };
  type Covered = FullCoveragedBoxes<
    unknown,
    [ObjectPattern]
  >;
  const _gap: IsEqual<Covered, false> = true;
  expect(_gap).toBe(true);

  // ExtractPatternTags only collects `__tag` from patterns that carry a literal
  // tag; an object-body pattern with a widened `__tag: string` contributes
  // `string`, which cannot discriminate a finite variant union.
  type Tags = ExtractPatternTags<[ObjectPattern]>;
  const _tags: IsEqual<Tags, [string]> = true;
  expect(_tags).toBe(true);
});

// -------------------------
// GAP 5 (false negative): mixed pattern families bypass real exhaustiveness
// -------------------------

test("GAP: mixed families are 'checked' only by the presence of a trailing otherwise", () => {
  // A match mixing an atomic pattern and a box-shaped pattern is neither
  // all-atomic nor all-box, so it falls into the fallback branch
  // If<OTHERWISE_LAST, A, never>: with a trailing otherwise it is accepted with
  // NO coverage analysis at all, and without one it is rejected regardless of
  // whether the explicit patterns are actually exhaustive.
  type BoxLikePattern = {
    __tag: "X";
    type: "tag";
    body: undefined;
  };

  // Trailing otherwise -> accepted with zero coverage checking.
  type WithOtherwise = ArgMatchable<
    [1, BoxLikePattern],
    true,
    number
  >;
  const _accepted: IsEqual<WithOtherwise, number> = true;
  expect(_accepted).toBe(true);

  // No otherwise -> rejected wholesale, even if the patterns were exhaustive.
  type WithoutOtherwise = ArgMatchable<
    [1, BoxLikePattern],
    false,
    number
  >;
  const _rejected: IsEqual<WithoutOtherwise, never> = true;
  expect(_rejected).toBe(true);
});
