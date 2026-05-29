import {
  If,
  IsEqual,
  Is,
  TupleToUnion,
  IsUnionSubset,
  And,
  ExtractBodyFromBoxPattern,
  IsAtomic,
  IsPatternIcon,
  IsPattern,
  Or,
  IsBox,
  IsIcon,
  Box,
  isBox,
  otherwise,
  isPatternAtomic,
  isPatternBoxedObject,
  isPatternIcon as isPatternIcon,
  isObjLike,
} from "plgg/index";

// -------------------------
// Helper Types for Pattern Matching
// -------------------------

/**
 * Type-level computation for pattern matching results.
 *
 * Exported so the accepted-argument contract can be asserted directly in
 * type-level tests (see `match.completeness.spec.ts`). This is the type of
 * the first argument to `match`, so it is already part of the public surface.
 */
export type ArgMatchable<
  PATTERNS extends ReadonlyArray<unknown>,
  OTHERWISE_LAST extends boolean,
  A,
  UNION_PATTERNS extends
    ReadonlyArray<unknown>[number] =
    TupleToUnion<PATTERNS>,
> = If<
  Is<A, boolean>,
  If<Is<PATTERNS, [true, false]>, A, never>,
  If<
    IsAllBoxPattern<PATTERNS>,
    If<
      FullCoveragedBoxes<A, PATTERNS>,
      A,
      If<
        And<
          OTHERWISE_LAST,
          IsUnionSubset<
            ExtractBoxTag<A>,
            TupleToUnion<
              ExtractPatternTags<PATTERNS>
            >
          >
        >,
        A,
        never
      >
    >,
    If<
      IsAllAtomic<PATTERNS>,
      If<
        IsEqual<UNION_PATTERNS, A>,
        A,
        If<
          And<
            OTHERWISE_LAST,
            IsUnionSubset<UNION_PATTERNS, A>
          >,
          A,
          never
        >
      >,
      If<OTHERWISE_LAST, A, never>
    >
  >
>;

/**
 * Checks if box patterns provide full coverage of union A.
 */
export type FullCoveragedBoxes<
  A,
  PATTERNS extends ReadonlyArray<unknown>,
> = If<
  And<
    AreAllTagPatterns<PATTERNS>,
    IsUnionSubset<
      ExtractBoxTag<A>,
      TupleToUnion<ExtractPatternTags<PATTERNS>>
    >
  >,
  true,
  false
>;

/**
 * Extract box tags from a union of boxes.
 */
export type ExtractBoxTag<T> = T extends {
  __tag: infer Tag;
}
  ? Tag
  : never;

export type ExtractPatternTags<
  PATTERNS extends ReadonlyArray<unknown>,
> = PATTERNS extends [infer Head, ...infer Tail]
  ? Head extends { __tag: infer Tag }
    ? [Tag, ...ExtractPatternTags<Tail>]
    : ExtractPatternTags<Tail>
  : [];

/**
 * Checks if all elements in array are tag patterns.
 */
export type AreAllTagPatterns<
  ARR extends ReadonlyArray<unknown>,
> = ARR extends [infer Head, ...infer Tail]
  ? IsPatternIcon<Head> extends true
    ? AreAllTagPatterns<Tail>
    : false
  : true;

/**
 * Recursively checks if all elements in array are atomic types.
 */
export type IsAllAtomic<
  ARR extends ReadonlyArray<unknown>,
> = ARR extends [infer Head, ...infer Tail]
  ? IsAtomic<Head> extends true
    ? IsAllAtomic<Tail>
    : false
  : true;

/**
 * Recursively checks if all elements in array are boxes.
 */
export type IsAllBoxPattern<
  ARR extends ReadonlyArray<unknown>,
> = ARR extends [infer Head, ...infer Tail]
  ? IsPattern<Head> extends true
    ? IsAllBoxPattern<Tail>
    : false
  : true;

/**
 * Represents a pattern-handler pair for matching.
 */
export type CaseDecl<
  A,
  PATTERN,
  R,
  ABODY = A extends Box<string, unknown>
    ? ExtractBoxContent<A>
    : never,
  PBODY = ExtractBodyFromBoxPattern<PATTERN>,
  // TAG is a DEFAULTED generic (not an inference site), so the matched tag is
  // computed from PATTERN once. Typing the tag/icon handler argument from TAG
  // keeps PATTERN inferable solely from the pattern argument — TS cannot
  // back-infer PATTERN (as a content-bearing box) from the handler.
  TAG extends string = ExtractPatternTag<PATTERN>,
> =
  Or<IsBox<A>, IsIcon<A>> extends true
    ? // A is a box/icon union — pattern-based matching. Gating on the (resolved,
      // since A is fixed before the cases) `IsBox`/`IsIcon` rather than on
      // `IsPattern<PATTERN>` excludes the raw-value fallback below, so its
      // `(a: PATTERN)` cannot back-infer PATTERN as a box during inference.
      Is<PATTERN, typeof otherwise> extends true
      ? // Catch-all: the handler receives the whole value. Typing from `A`
        // (not PATTERN) keeps this from poisoning inference of the other cases.
        [PATTERN, (a: A) => R]
      : IsPatternIcon<PATTERN> extends true
        ? // Tag/icon pattern: hand the handler the box union narrowed to the
          // tag, so `.content` is the matched variant's typed content (the
          // runtime already passes the whole box).
          [
            PATTERN,
            (a: Extract<A, Box<TAG, unknown>>) => R,
          ]
        : If<
            Or<
              Is<PBODY, undefined>,
              Or<Is<PBODY, ABODY>, Is<ABODY, PBODY>>
            >,
            [PATTERN, (a: PBODY) => R],
            never
          >
    : [PATTERN, (a: PATTERN) => R];

/**
 * Extracts the literal tag from a tag/icon pattern (`never` otherwise).
 */
type ExtractPatternTag<PATTERN> =
  PATTERN extends {
    __tag: infer T extends string;
    type: "tag";
  }
    ? T
    : never;

/**
 * Extracts the body type from a variant type.
 */
type ExtractBoxContent<
  V extends Box<string, unknown>,
> =
  V extends Box<string, infer CONTENT>
    ? CONTENT
    : undefined;

// -------------------------

/**
 * Returned by the match continuation when the supplied cases are not exhaustive
 * over the matched value: a non-assignable brand carrying the value type, so a
 * non-exhaustive match surfaces as a type error where its result is used.
 */
export type CoverageError<A> = Readonly<{
  __nonExhaustiveMatch: A;
}>;

/**
 * Runtime constructor for {@link CoverageError}. In well-typed code the match
 * continuation's no-case-matched branch is unreachable — a non-exhaustive set of
 * cases is already a compile error via the {@link CoverageError} return type. If
 * it is reached anyway (an untyped or forced call, or a runtime value outside
 * the declared union), the continuation now returns this faithful value carrying
 * the unmatched input, consistent with the type-level contract, rather than a
 * bare `Error`.
 */
export const coverageError = <A>(
  value: A,
): CoverageError<A> => ({ __nonExhaustiveMatch: value });

/**
 * Type guard for a {@link CoverageError} value, so a caller that reaches the
 * non-exhaustive branch at runtime can detect it as a value instead of probing
 * for an `Error`.
 */
export const isCoverageError = (
  value: unknown,
): value is CoverageError<unknown> =>
  isObjLike(value) && "__nonExhaustiveMatch" in value;

/**
 * The match continuation produced by `match(value)`. Its call overloads accept
 * 2..20 `[pattern, handler]` cases. The matched type `A` is already fixed, so
 * tag/icon handlers receive the box narrowed to their tag (typed `.content`),
 * and a non-exhaustive set of cases makes the call return {@link CoverageError}.
 */
export interface MatchCont<A> {
  <P1, P2, R>(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
  ): [
    ArgMatchable<
      Is<P2, typeof otherwise> extends true
        ? [P1]
        : [P1, P2],
      Is<P2, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <P1, P2, P3, R>(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
  ): [
    ArgMatchable<
      Is<P3, typeof otherwise> extends true
        ? [P1, P2]
        : [P1, P2, P3],
      Is<P3, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <P1, P2, P3, P4, R>(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
  ): [
    ArgMatchable<
      Is<P4, typeof otherwise> extends true
        ? [P1, P2, P3]
        : [P1, P2, P3, P4],
      Is<P4, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <P1, P2, P3, P4, P5, R>(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
  ): [
    ArgMatchable<
      Is<P5, typeof otherwise> extends true
        ? [P1, P2, P3, P4]
        : [P1, P2, P3, P4, P5],
      Is<P5, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <P1, P2, P3, P4, P5, P6, R>(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
  ): [
    ArgMatchable<
      Is<P6, typeof otherwise> extends true
        ? [P1, P2, P3, P4, P5]
        : [P1, P2, P3, P4, P5, P6],
      Is<P6, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <P1, P2, P3, P4, P5, P6, P7, R>(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
  ): [
    ArgMatchable<
      Is<P7, typeof otherwise> extends true
        ? [P1, P2, P3, P4, P5, P6]
        : [P1, P2, P3, P4, P5, P6, P7],
      Is<P7, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <P1, P2, P3, P4, P5, P6, P7, P8, R>(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
  ): [
    ArgMatchable<
      Is<P8, typeof otherwise> extends true
        ? [P1, P2, P3, P4, P5, P6, P7]
        : [P1, P2, P3, P4, P5, P6, P7, P8],
      Is<P8, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <P1, P2, P3, P4, P5, P6, P7, P8, P9, R>(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
    c9: CaseDecl<A, P9, R>,
  ): [
    ArgMatchable<
      Is<P9, typeof otherwise> extends true
        ? [P1, P2, P3, P4, P5, P6, P7, P8]
        : [P1, P2, P3, P4, P5, P6, P7, P8, P9],
      Is<P9, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, R>(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
    c9: CaseDecl<A, P9, R>,
    c10: CaseDecl<A, P10, R>,
  ): [
    ArgMatchable<
      Is<P10, typeof otherwise> extends true
        ? [P1, P2, P3, P4, P5, P6, P7, P8, P9]
        : [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
          ],
      Is<P10, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    P7,
    P8,
    P9,
    P10,
    P11,
    R,
  >(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
    c9: CaseDecl<A, P9, R>,
    c10: CaseDecl<A, P10, R>,
    c11: CaseDecl<A, P11, R>,
  ): [
    ArgMatchable<
      Is<P11, typeof otherwise> extends true
        ? [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
          ]
        : [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
          ],
      Is<P11, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    P7,
    P8,
    P9,
    P10,
    P11,
    P12,
    R,
  >(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
    c9: CaseDecl<A, P9, R>,
    c10: CaseDecl<A, P10, R>,
    c11: CaseDecl<A, P11, R>,
    c12: CaseDecl<A, P12, R>,
  ): [
    ArgMatchable<
      Is<P12, typeof otherwise> extends true
        ? [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
          ]
        : [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
          ],
      Is<P12, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    P7,
    P8,
    P9,
    P10,
    P11,
    P12,
    P13,
    R,
  >(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
    c9: CaseDecl<A, P9, R>,
    c10: CaseDecl<A, P10, R>,
    c11: CaseDecl<A, P11, R>,
    c12: CaseDecl<A, P12, R>,
    c13: CaseDecl<A, P13, R>,
  ): [
    ArgMatchable<
      Is<P13, typeof otherwise> extends true
        ? [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
          ]
        : [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
          ],
      Is<P13, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    P7,
    P8,
    P9,
    P10,
    P11,
    P12,
    P13,
    P14,
    R,
  >(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
    c9: CaseDecl<A, P9, R>,
    c10: CaseDecl<A, P10, R>,
    c11: CaseDecl<A, P11, R>,
    c12: CaseDecl<A, P12, R>,
    c13: CaseDecl<A, P13, R>,
    c14: CaseDecl<A, P14, R>,
  ): [
    ArgMatchable<
      Is<P14, typeof otherwise> extends true
        ? [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
          ]
        : [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
          ],
      Is<P14, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    P7,
    P8,
    P9,
    P10,
    P11,
    P12,
    P13,
    P14,
    P15,
    R,
  >(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
    c9: CaseDecl<A, P9, R>,
    c10: CaseDecl<A, P10, R>,
    c11: CaseDecl<A, P11, R>,
    c12: CaseDecl<A, P12, R>,
    c13: CaseDecl<A, P13, R>,
    c14: CaseDecl<A, P14, R>,
    c15: CaseDecl<A, P15, R>,
  ): [
    ArgMatchable<
      Is<P15, typeof otherwise> extends true
        ? [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
          ]
        : [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
            P15,
          ],
      Is<P15, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    P7,
    P8,
    P9,
    P10,
    P11,
    P12,
    P13,
    P14,
    P15,
    P16,
    R,
  >(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
    c9: CaseDecl<A, P9, R>,
    c10: CaseDecl<A, P10, R>,
    c11: CaseDecl<A, P11, R>,
    c12: CaseDecl<A, P12, R>,
    c13: CaseDecl<A, P13, R>,
    c14: CaseDecl<A, P14, R>,
    c15: CaseDecl<A, P15, R>,
    c16: CaseDecl<A, P16, R>,
  ): [
    ArgMatchable<
      Is<P16, typeof otherwise> extends true
        ? [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
            P15,
          ]
        : [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
            P15,
            P16,
          ],
      Is<P16, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    P7,
    P8,
    P9,
    P10,
    P11,
    P12,
    P13,
    P14,
    P15,
    P16,
    P17,
    R,
  >(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
    c9: CaseDecl<A, P9, R>,
    c10: CaseDecl<A, P10, R>,
    c11: CaseDecl<A, P11, R>,
    c12: CaseDecl<A, P12, R>,
    c13: CaseDecl<A, P13, R>,
    c14: CaseDecl<A, P14, R>,
    c15: CaseDecl<A, P15, R>,
    c16: CaseDecl<A, P16, R>,
    c17: CaseDecl<A, P17, R>,
  ): [
    ArgMatchable<
      Is<P17, typeof otherwise> extends true
        ? [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
            P15,
            P16,
          ]
        : [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
            P15,
            P16,
            P17,
          ],
      Is<P17, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    P7,
    P8,
    P9,
    P10,
    P11,
    P12,
    P13,
    P14,
    P15,
    P16,
    P17,
    P18,
    R,
  >(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
    c9: CaseDecl<A, P9, R>,
    c10: CaseDecl<A, P10, R>,
    c11: CaseDecl<A, P11, R>,
    c12: CaseDecl<A, P12, R>,
    c13: CaseDecl<A, P13, R>,
    c14: CaseDecl<A, P14, R>,
    c15: CaseDecl<A, P15, R>,
    c16: CaseDecl<A, P16, R>,
    c17: CaseDecl<A, P17, R>,
    c18: CaseDecl<A, P18, R>,
  ): [
    ArgMatchable<
      Is<P18, typeof otherwise> extends true
        ? [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
            P15,
            P16,
            P17,
          ]
        : [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
            P15,
            P16,
            P17,
            P18,
          ],
      Is<P18, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    P7,
    P8,
    P9,
    P10,
    P11,
    P12,
    P13,
    P14,
    P15,
    P16,
    P17,
    P18,
    P19,
    R,
  >(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
    c9: CaseDecl<A, P9, R>,
    c10: CaseDecl<A, P10, R>,
    c11: CaseDecl<A, P11, R>,
    c12: CaseDecl<A, P12, R>,
    c13: CaseDecl<A, P13, R>,
    c14: CaseDecl<A, P14, R>,
    c15: CaseDecl<A, P15, R>,
    c16: CaseDecl<A, P16, R>,
    c17: CaseDecl<A, P17, R>,
    c18: CaseDecl<A, P18, R>,
    c19: CaseDecl<A, P19, R>,
  ): [
    ArgMatchable<
      Is<P19, typeof otherwise> extends true
        ? [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
            P15,
            P16,
            P17,
            P18,
          ]
        : [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
            P15,
            P16,
            P17,
            P18,
            P19,
          ],
      Is<P19, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
  <
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    P7,
    P8,
    P9,
    P10,
    P11,
    P12,
    P13,
    P14,
    P15,
    P16,
    P17,
    P18,
    P19,
    P20,
    R,
  >(
    c1: CaseDecl<A, P1, R>,
    c2: CaseDecl<A, P2, R>,
    c3: CaseDecl<A, P3, R>,
    c4: CaseDecl<A, P4, R>,
    c5: CaseDecl<A, P5, R>,
    c6: CaseDecl<A, P6, R>,
    c7: CaseDecl<A, P7, R>,
    c8: CaseDecl<A, P8, R>,
    c9: CaseDecl<A, P9, R>,
    c10: CaseDecl<A, P10, R>,
    c11: CaseDecl<A, P11, R>,
    c12: CaseDecl<A, P12, R>,
    c13: CaseDecl<A, P13, R>,
    c14: CaseDecl<A, P14, R>,
    c15: CaseDecl<A, P15, R>,
    c16: CaseDecl<A, P16, R>,
    c17: CaseDecl<A, P17, R>,
    c18: CaseDecl<A, P18, R>,
    c19: CaseDecl<A, P19, R>,
    c20: CaseDecl<A, P20, R>,
  ): [
    ArgMatchable<
      Is<P20, typeof otherwise> extends true
        ? [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
            P15,
            P16,
            P17,
            P18,
            P19,
          ]
        : [
            P1,
            P2,
            P3,
            P4,
            P5,
            P6,
            P7,
            P8,
            P9,
            P10,
            P11,
            P12,
            P13,
            P14,
            P15,
            P16,
            P17,
            P18,
            P19,
            P20,
          ],
      Is<P20, typeof otherwise>,
      A
    >,
  ] extends [never]
    ? CoverageError<A>
    : R;
}

/**
 * Type-safe, exhaustive pattern matching for values, variants, and literals.
 * Curried: `match(value)(...cases)`. The value fixes the matched type; the
 * cases are then checked against it. Pass `otherwise` as the final pattern for
 * a catch-all.
 */
export function match<A>(a: A): MatchCont<A>;
export function match(
  a: unknown,
): (
  ...cases: ReadonlyArray<
    [unknown, (ma: unknown) => unknown]
  >
) => unknown {
  return (...cases) => {
    for (const [pattern, fn] of cases) {
      if (isBox(a)) {
        if (isPatternAtomic(pattern)) {
          if (a.content === pattern.body) {
            return fn(a);
          }
          continue;
        }
        if (isPatternBoxedObject(pattern)) {
          if (
            isObjLike(a.content) &&
            isObjLike(pattern.body) &&
            deepPartialEqual(
              a.content,
              pattern.body,
            )
          ) {
            return fn(a);
          }
          continue;
        }
        if (isPatternIcon(pattern)) {
          if (a.__tag === pattern.__tag) {
            return fn(a);
          }
          continue;
        }
      }
      if (pattern === otherwise) {
        return fn(a);
      }
      if (!isBox(pattern) && a === pattern) {
        return fn(a);
      }
    }
    return coverageError(a);
  };
}

/**
 * Deep equality check for partial objects.
 */
function deepPartialEqual<T extends object>(
  obj1: T,
  obj2: T,
): boolean {
  const isObject = (
    obj: unknown,
  ): obj is object =>
    obj !== null && typeof obj === "object";
  return Object.keys(obj2).every((key) => {
    const k = key as keyof T;
    const v1 = obj1[k];
    const v2 = obj2[k];
    if (isObject(v1) && isObject(v2)) {
      return deepPartialEqual(v1, v2);
    }
    return v1 === v2;
  });
}
