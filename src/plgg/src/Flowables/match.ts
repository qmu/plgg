import {
  Variant,
  ExtractBody,
  isVariant,
  If,
  IsEqual,
  Is,
  TupleToUnion,
  IsUnionSubset,
  UnPartial,
  otherwise,
  And,
  Or,
  ParametricVariant,
  FixedVariant,
  isAtomicPattern,
  isObjectPattern,
  isFixedVariantPattern,
} from "plgg/index";

// -------------------------
// Helper Types for Pattern Matching
// -------------------------

/**
 * Type-level computation for pattern matching results.
 * Determines the return type based on whether patterns provide exhaustive coverage.
 */
type MatchResult<
  PATTERNS extends ReadonlyArray<unknown>,
  OTHERWISE_LAST extends boolean,
  A,
  R,
  UNION_PATTERNS extends
    ReadonlyArray<unknown>[number] = TupleToUnion<PATTERNS>,
> = If<
  Is<A, boolean>,
  If<Is<PATTERNS, [true, false]>, R, never>,
  If<
    IsAllVariant<PATTERNS>,
    If<
      FullCoveragedVariants<A, PATTERNS>,
      R,
      If<
        And<
          OTHERWISE_LAST,
          IsUnionSubset<
            ExtractVariantTags<A>,
            ExtractVariantTags<
              TupleToUnion<PATTERNS>
            >
          >
        >,
        R,
        never
      >
    >,
    If<
      IsAllAtomic<PATTERNS>,
      If<
        IsEqual<UNION_PATTERNS, A>,
        R,
        If<
          And<
            OTHERWISE_LAST,
            IsUnionSubset<UNION_PATTERNS, A>
          >,
          R,
          never
        >
      >,
      If<OTHERWISE_LAST, R, never>
    >
  >
>;

/**
 * Checks if variant patterns provide full coverage of union A.
 * More permissive check that allows partial body variants to match.
 */
export type FullCoveragedVariants<
  A,
  PATTERNS extends ReadonlyArray<unknown>,
> = If<
  And<
    AreNoneConditionalVariants<PATTERNS>,
    IsUnionSubset<
      ExtractVariantTags<A>,
      ExtractVariantTags<TupleToUnion<PATTERNS>>
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

/**
 * Checks if T is a wild parametric variant without actual pattern.
 */
export type AreNoneConditionalVariants<
  ARR extends ReadonlyArray<unknown>,
> = ARR extends [infer Head, ...infer Tail]
  ? Or<
      JustTagVariantPattern<Head>,
      WildParametricVariantPattern<Head>
    > extends true
    ? AreNoneConditionalVariants<Tail>
    : false
  : true;

/**
 * Checks if T is a fixed variant (variant with only __tag property).
 */
type JustTagVariantPattern<T> = T extends {
  __tag: string;
}
  ? keyof T extends "__tag"
    ? T["__tag"] extends string
      ? Exclude<keyof T, "__tag"> extends never
        ? true
        : false
      : false
    : false
  : false;

/**
 * Type predicate for wild parametric variant patterns.
 */
export type WildParametricVariantPattern<T> =
  T extends Variant<
    infer Tag,
    Partial<infer Content>
  >
    ? Is<Tag, string> extends true
      ? IsEqual<Content, unknown> extends true
        ? true
        : false
      : false
    : false;

/**
 * Type predicate to check if T is a variant with a __tag property.
 */
type IsVariant<T> = T extends { __tag: string }
  ? true
  : false;

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
 * Type predicate for atomic/primitive types.
 * Returns true for boolean, string, number, bigint, symbol, null, undefined.
 */
type IsAtomic<T> = If<
  Or<
    Is<T, boolean>,
    Or<
      Is<T, string>,
      Or<
        Is<T, number>,
        Or<
          Is<T, bigint>,
          Or<
            Is<T, symbol>,
            Or<Is<T, null>, Is<T, undefined>>
          >
        >
      >
    >
  >,
  true,
  false
>;

/**
 * Recursively checks if all elements in array are variants.
 */
type IsAllVariant<
  ARR extends ReadonlyArray<unknown>,
> = ARR extends [infer Head, ...infer Tail]
  ? IsVariant<Head> extends true
    ? IsAllVariant<Tail>
    : false
  : true;

/**
 * Variant type with partial body for pattern matching.
 */
type PartialBodyVariant = Variant<
  string,
  Partial<unknown>
>;

/**
 * Represents a pattern-handler pair for matching.
 */
export type CaseDecl<
  A,
  P,
  R,
  // unwrapped body from case
  B1 = P extends PartialBodyVariant
    ? UnPartial<ExtractBody<P>>
    : P,
  // unwrapped body from argument
  B2 = A extends ParametricVariant<
    string,
    infer BODY
  >
    ? BODY
    : A extends FixedVariant<string>
      ? never
      : A,
  ARG = B1 extends unknown
    ? B2
    : B2 extends B1
      ? B2 & B1
      : never,
  VALID_PATTERN = ARG extends never
    ? false
    : true,
> = If<
  IsVariant<P>,
  VALID_PATTERN extends true
    ? [P, (a: ARG) => R]
    : never,
  [P, (a: ARG) => R]
>;

/**
 * Deep equality check for partial objects used in variant pattern matching.
 */
function deepPartialEqual<T>(
  obj1: T,
  obj2: Partial<T>,
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
  a: A,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
  c4: CaseDecl<A, P4, R>,
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
  c4: CaseDecl<A, P4, R>,
  c5: CaseDecl<A, P5, R>,
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
  c4: CaseDecl<A, P4, R>,
  c5: CaseDecl<A, P5, R>,
  c6: CaseDecl<A, P6, R>,
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
  c4: CaseDecl<A, P4, R>,
  c5: CaseDecl<A, P5, R>,
  c6: CaseDecl<A, P6, R>,
  c7: CaseDecl<A, P7, R>,
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
  c4: CaseDecl<A, P4, R>,
  c5: CaseDecl<A, P5, R>,
  c6: CaseDecl<A, P6, R>,
  c7: CaseDecl<A, P7, R>,
  c8: CaseDecl<A, P8, R>,
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
  c1: CaseDecl<A, P1, R>,
  c2: CaseDecl<A, P2, R>,
  c3: CaseDecl<A, P3, R>,
  c4: CaseDecl<A, P4, R>,
  c5: CaseDecl<A, P5, R>,
  c6: CaseDecl<A, P6, R>,
  c7: CaseDecl<A, P7, R>,
  c8: CaseDecl<A, P8, R>,
  c9: CaseDecl<A, P9, R>,
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
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
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
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
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
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
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
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
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
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
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
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
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
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
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
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
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
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
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
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
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
  a: A,
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
): MatchResult<PATTERNS, OTHERWISE_LAST, A, R>;

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
      if (isAtomicPattern(pattern)) {
        if (a.body === pattern.body) {
          return fn(a);
        }
        continue;
      }
      if (isObjectPattern(pattern)) {
        if (
          typeof a === "object" &&
          deepPartialEqual(a.body, pattern.body)
        ) {
          return fn(a);
        }
        continue;
      }
      if (isFixedVariantPattern(pattern)) {
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
