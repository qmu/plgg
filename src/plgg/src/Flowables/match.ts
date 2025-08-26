import {
  isVariant,
  If,
  IsEqual,
  Is,
  TupleToUnion,
  IsUnionSubset,
  otherwise,
  And,
  isVariantPatternAtomic,
  isVariantPatternObject,
  isVariantPatternTag,
  ExtractBodyFromVariantPattern,
  IsAtomic,
  IsVariantPatternTag,
  IsVariantPattern,
  Or,
  IsVariant,
  ExtractVariantBody,
  Variant,
} from "plgg/index";

// -------------------------
// Helper Types for Pattern Matching
// -------------------------

/**
 * Type-level computation for pattern matching results.
 */
type ArgMatchable<
  PATTERNS extends ReadonlyArray<unknown>,
  OTHERWISE_LAST extends boolean,
  A,
  UNION_PATTERNS extends
    ReadonlyArray<unknown>[number] = TupleToUnion<PATTERNS>,
> = If<
  Is<A, boolean>,
  If<Is<PATTERNS, [true, false]>, A, never>,
  If<
    IsAllVariantPattern<PATTERNS>,
    If<
      FullCoveragedVariants<A, PATTERNS>,
      A,
      If<
        And<
          OTHERWISE_LAST,
          IsUnionSubset<
            ExtractVariantTags<A>,
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
 * Checks if variant patterns provide full coverage of union A.
 */
export type FullCoveragedVariants<
  A,
  PATTERNS extends ReadonlyArray<unknown>,
> = If<
  And<
    AreAllTagPatterns<PATTERNS>,
    IsUnionSubset<
      ExtractVariantTags<A>,
      TupleToUnion<ExtractPatternTags<PATTERNS>>
    >
  >,
  true,
  false
>;

/**
 * Extract variant tags from a union of variants.
 */
export type ExtractVariantTags<T> = T extends {
  __tag: infer Tag;
}
  ? Tag
  : never;

export type ExtractPatternTags<
  PATTERNS extends ReadonlyArray<unknown>,
> = PATTERNS extends [infer Head, ...infer Tail]
  ? Head extends { tag: infer Tag }
    ? [Tag, ...ExtractPatternTags<Tail>]
    : ExtractPatternTags<Tail>
  : [];

/**
 * Checks if all elements in array are tag patterns.
 */
export type AreAllTagPatterns<
  ARR extends ReadonlyArray<unknown>,
> = ARR extends [infer Head, ...infer Tail]
  ? IsVariantPatternTag<Head> extends true
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
 * Recursively checks if all elements in array are variants.
 */
export type IsAllVariantPattern<
  ARR extends ReadonlyArray<unknown>,
> = ARR extends [infer Head, ...infer Tail]
  ? IsVariantPattern<Head> extends true
    ? IsAllVariantPattern<Tail>
    : false
  : true;

/**
 * Represents a pattern-handler pair for matching.
 */
export type CaseDecl<
  A,
  PATTERN,
  R,
  ABODY = A extends Variant<string, unknown>
    ? ExtractVariantBody<A>
    : never,
  PBODY = ExtractBodyFromVariantPattern<PATTERN>,
> = If<
  And<IsVariant<A>, IsVariantPattern<PATTERN>>,
  If<
    Or<
      Is<PBODY, undefined>,
      Or<Is<PBODY, ABODY>, Is<ABODY, PBODY>>
    >,
    [PATTERN, (a: PBODY) => R],
    never
  >,
  [PATTERN, (a: PATTERN) => R]
>;

// -------------------------

/**
 * Type-safe pattern matching for values, variants, and literals.
 */
export function match<
  A,
  P1,
  P2,
  R,
  OTHERWISE_LAST extends boolean = Is<
    P2,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [P1],
    [P1, P2]
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
): R;

/**
 * P1~P3
 */
export function match<
  A,
  P1,
  P2,
  P3,
  R,
  OTHERWISE_LAST extends boolean = Is<
    P3,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [P1, P2],
    [P1, P2, P3]
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
): R;

/**
 * P1~P4
 */
export function match<
  A,
  P1,
  P2,
  P3,
  P4,
  R,
  OTHERWISE_LAST extends boolean = Is<
    P4,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [P1, P2, P3],
    [P1, P2, P3, P4]
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
  c4: CaseDecl<A, P4, R>,
): R;

/**
 * P1~P5
 */
export function match<
  A,
  P1,
  P2,
  P3,
  P4,
  P5,
  R,
  OTHERWISE_LAST extends boolean = Is<
    P5,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [P1, P2, P3, P4],
    [P1, P2, P3, P4, P5]
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
  c4: CaseDecl<A, P4, R>,
  c5: CaseDecl<A, P5, R>,
): R;

/**
 * P1~P6
 */
export function match<
  A,
  P1,
  P2,
  P3,
  P4,
  P5,
  P6,
  R,
  OTHERWISE_LAST extends boolean = Is<
    P6,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [P1, P2, P3, P4, P5],
    [P1, P2, P3, P4, P5, P6]
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
  c4: CaseDecl<A, P4, R>,
  c5: CaseDecl<A, P5, R>,
  c6: CaseDecl<A, P6, R>,
): R;

/**
 * P1~P7
 */
export function match<
  A,
  P1,
  P2,
  P3,
  P4,
  P5,
  P6,
  P7,
  R,
  OTHERWISE_LAST extends boolean = Is<
    P7,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [P1, P2, P3, P4, P5, P6],
    [P1, P2, P3, P4, P5, P6, P7]
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
  c4: CaseDecl<A, P4, R>,
  c5: CaseDecl<A, P5, R>,
  c6: CaseDecl<A, P6, R>,
  c7: CaseDecl<A, P7, R>,
): R;

/**
 * P1~P8
 */
export function match<
  A,
  P1,
  P2,
  P3,
  P4,
  P5,
  P6,
  P7,
  P8,
  R,
  OTHERWISE_LAST extends boolean = Is<
    P8,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [P1, P2, P3, P4, P5, P6, P7],
    [P1, P2, P3, P4, P5, P6, P7, P8]
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
  c4: CaseDecl<A, P4, R>,
  c5: CaseDecl<A, P5, R>,
  c6: CaseDecl<A, P6, R>,
  c7: CaseDecl<A, P7, R>,
  c8: CaseDecl<A, P8, R>,
): R;

/**
 * P1~P9
 */
export function match<
  A,
  P1,
  P2,
  P3,
  P4,
  P5,
  P6,
  P7,
  P8,
  P9,
  R,
  OTHERWISE_LAST extends boolean = Is<
    P9,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [P1, P2, P3, P4, P5, P6, P7, P8],
    [P1, P2, P3, P4, P5, P6, P7, P8, P9]
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
  c4: CaseDecl<A, P4, R>,
  c5: CaseDecl<A, P5, R>,
  c6: CaseDecl<A, P6, R>,
  c7: CaseDecl<A, P7, R>,
  c8: CaseDecl<A, P8, R>,
  c9: CaseDecl<A, P9, R>,
): R;

/**
 * P1~P10
 */
export function match<
  A,
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
  R,
  OTHERWISE_LAST extends boolean = Is<
    P10,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [P1, P2, P3, P4, P5, P6, P7, P8, P9],
    [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10]
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
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
): R;

/**
 * P1~P11
 */
export function match<
  A,
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
  OTHERWISE_LAST extends boolean = Is<
    P11,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10],
    [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11]
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
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
): R;

/**
 * P1~P12
 */
export function match<
  A,
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
  OTHERWISE_LAST extends boolean = Is<
    P12,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
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
    [
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
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
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
): R;

/**
 * P1~P13
 */
export function match<
  A,
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
  OTHERWISE_LAST extends boolean = Is<
    P13,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
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
    [
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
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
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
): R;

/**
 * P1~P14
 */
export function match<
  A,
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
  OTHERWISE_LAST extends boolean = Is<
    P14,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
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
    [
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
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
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
): R;

/**
 * P1~P15
 */
export function match<
  A,
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
  OTHERWISE_LAST extends boolean = Is<
    P15,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
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
    [
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
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
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
): R;

/**
 * P1~P16
 */
export function match<
  A,
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
  OTHERWISE_LAST extends boolean = Is<
    P16,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
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
    [
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
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
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
): R;

/**
 * P1~P17
 */
export function match<
  A,
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
  OTHERWISE_LAST extends boolean = Is<
    P17,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
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
    [
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
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
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
): R;

/**
 * P1~P18
 */
export function match<
  A,
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
  OTHERWISE_LAST extends boolean = Is<
    P18,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
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
    [
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
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
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
): R;

/**
 * P1~P19
 */
export function match<
  A,
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
  OTHERWISE_LAST extends boolean = Is<
    P19,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
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
    [
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
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
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
): R;

/**
 * P1~P20
 */
export function match<
  A,
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
  OTHERWISE_LAST extends boolean = Is<
    P20,
    typeof otherwise
  >,
  PATTERNS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
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
    [
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
    ]
  >,
>(
  a: ArgMatchable<PATTERNS, OTHERWISE_LAST, A>,
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
): R;

/**
 * Runtime implementation of pattern matching.
 */
export function match(
  a: unknown,
  ...cases: ReadonlyArray<
    [unknown, (ma: unknown) => unknown]
  >
): unknown {
  for (const [pattern, fn] of cases) {
    if (isVariant(a)) {
      if (isVariantPatternAtomic(pattern)) {
        if (a.body === pattern.body) {
          return fn(a);
        }
        continue;
      }
      if (isVariantPatternObject(pattern)) {
        if (
          a.body !== null &&
          typeof a.body === "object" &&
          pattern.body !== null &&
          typeof pattern.body === "object" &&
          deepPartialEqual(a.body, pattern.body)
        ) {
          return fn(a);
        }
        continue;
      }
      if (isVariantPatternTag(pattern)) {
        if (
          isVariant(a) &&
          a.__tag === pattern.tag
        ) {
          return fn(a);
        }
        continue;
      }
      // if (pattern === otherwise) {
      //   return fn(a);
      // }
    }
    if (pattern === otherwise) {
      return fn(a);
    }
    if (!isVariant(pattern) && a === pattern) {
      return fn(a);
    }
  }
  return new Error(
    `Unexpectedly no match for value: ${JSON.stringify(a)}`,
  );
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
