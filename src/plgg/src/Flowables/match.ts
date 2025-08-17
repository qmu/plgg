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
} from "plgg/index";

// -------------------------
// Helper Types for Pattern Matching
// -------------------------

/**
 * Type-level computation for pattern matching results.
 * Determines the return type based on whether patterns provide exhaustive coverage.
 */
type MatchResult<
  CASES extends ReadonlyArray<unknown>,
  OTHERWISE_LAST extends boolean,
  A,
  R,
  UNION_CASES extends
    ReadonlyArray<unknown>[number] = TupleToUnion<CASES>,
> = If<
  Is<A, boolean>,
  If<Is<CASES, [true, false]>, R, never>,
  If<
    IsAllVariant<CASES>,
    If<
      FullCoveragedVariants<CASES, A>, // check if all variants are covered
      R,
      If<
        And<OTHERWISE_LAST, Is<A, UNION_CASES>>,
        R,
        never
      >
    >,
    If<
      IsAllAtomic<CASES>,
      If<
        IsEqual<UNION_CASES, A>,
        R,
        If<
          And<
            OTHERWISE_LAST,
            IsUnionSubset<UNION_CASES, A>
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
type FullCoveragedVariants<
  CASES extends ReadonlyArray<unknown>,
  A,
> = If<
  IsUnionSubset<
    ExtractVariantTags<A>,
    ExtractVariantTags<TupleToUnion<CASES>>
  >,
  true,
  false
>;

/**
 * Extract variant tags from a union of variants.
 */
type ExtractVariantTags<T> = T extends {
  __tag: infer Tag;
}
  ? Tag
  : never;

/**
 * Type predicate to check if T is a variant with a __tag property.
 */
type IsVariant<T> = T extends { __tag: string }
  ? true
  : false;

/**
 * Recursively checks if all elements in array are atomic types.
 */
type IsAllAtomic<
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
type CaseDecl<
  A,
  C,
  R,
  // unwrapped body from case
  B1 = C extends PartialBodyVariant
    ? UnPartial<ExtractBody<C>>
    : C,
  // unwrapped body from argument
  B2 = A extends ParametricVariant<
    string,
    infer BODY
  >
    ? BODY
    : A extends FixedVariant<string>
      ? never
      : A,
  ARG = B1 extends unknown ? B2 : B2 & B1,
> = [C, (a: ARG) => R];

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
  C1,
  C2,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C2,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [C1],
    [C1, C2]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C3
 */
export function match<
  A,
  C1,
  C2,
  C3,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C3,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [C1, C2],
    [C1, C2, C3]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C4
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C4,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [C1, C2, C3],
    [C1, C2, C3, C4]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C5
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C5,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [C1, C2, C3, C4],
    [C1, C2, C3, C4, C5]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C6
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C6,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [C1, C2, C3, C4, C5],
    [C1, C2, C3, C4, C5, C6]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C7
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C7,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [C1, C2, C3, C4, C5, C6],
    [C1, C2, C3, C4, C5, C6, C7]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C8
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C8,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [C1, C2, C3, C4, C5, C6, C7],
    [C1, C2, C3, C4, C5, C6, C7, C8]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C9
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C9,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [C1, C2, C3, C4, C5, C6, C7, C8],
    [C1, C2, C3, C4, C5, C6, C7, C8, C9]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
  c9: CaseDecl<A, C9, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C10
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  C10,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C10,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [C1, C2, C3, C4, C5, C6, C7, C8, C9],
    [C1, C2, C3, C4, C5, C6, C7, C8, C9, C10]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
  c9: CaseDecl<A, C9, R>,
  c10: CaseDecl<A, C10, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C11
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  C10,
  C11,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C11,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [C1, C2, C3, C4, C5, C6, C7, C8, C9, C10],
    [C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
  c9: CaseDecl<A, C9, R>,
  c10: CaseDecl<A, C10, R>,
  c11: CaseDecl<A, C11, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C12
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  C10,
  C11,
  C12,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C12,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
    ],
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
    ]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
  c9: CaseDecl<A, C9, R>,
  c10: CaseDecl<A, C10, R>,
  c11: CaseDecl<A, C11, R>,
  c12: CaseDecl<A, C12, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C13
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  C10,
  C11,
  C12,
  C13,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C13,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
    ],
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
    ]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
  c9: CaseDecl<A, C9, R>,
  c10: CaseDecl<A, C10, R>,
  c11: CaseDecl<A, C11, R>,
  c12: CaseDecl<A, C12, R>,
  c13: CaseDecl<A, C13, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C14
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  C10,
  C11,
  C12,
  C13,
  C14,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C14,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
    ],
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
    ]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
  c9: CaseDecl<A, C9, R>,
  c10: CaseDecl<A, C10, R>,
  c11: CaseDecl<A, C11, R>,
  c12: CaseDecl<A, C12, R>,
  c13: CaseDecl<A, C13, R>,
  c14: CaseDecl<A, C14, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C15
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  C10,
  C11,
  C12,
  C13,
  C14,
  C15,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C15,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
    ],
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
      C15,
    ]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
  c9: CaseDecl<A, C9, R>,
  c10: CaseDecl<A, C10, R>,
  c11: CaseDecl<A, C11, R>,
  c12: CaseDecl<A, C12, R>,
  c13: CaseDecl<A, C13, R>,
  c14: CaseDecl<A, C14, R>,
  c15: CaseDecl<A, C15, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C16
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  C10,
  C11,
  C12,
  C13,
  C14,
  C15,
  C16,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C16,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
      C15,
    ],
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
      C15,
      C16,
    ]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
  c9: CaseDecl<A, C9, R>,
  c10: CaseDecl<A, C10, R>,
  c11: CaseDecl<A, C11, R>,
  c12: CaseDecl<A, C12, R>,
  c13: CaseDecl<A, C13, R>,
  c14: CaseDecl<A, C14, R>,
  c15: CaseDecl<A, C15, R>,
  c16: CaseDecl<A, C16, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C17
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  C10,
  C11,
  C12,
  C13,
  C14,
  C15,
  C16,
  C17,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C17,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
      C15,
      C16,
    ],
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
      C15,
      C16,
      C17,
    ]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
  c9: CaseDecl<A, C9, R>,
  c10: CaseDecl<A, C10, R>,
  c11: CaseDecl<A, C11, R>,
  c12: CaseDecl<A, C12, R>,
  c13: CaseDecl<A, C13, R>,
  c14: CaseDecl<A, C14, R>,
  c15: CaseDecl<A, C15, R>,
  c16: CaseDecl<A, C16, R>,
  c17: CaseDecl<A, C17, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C18
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  C10,
  C11,
  C12,
  C13,
  C14,
  C15,
  C16,
  C17,
  C18,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C18,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
      C15,
      C16,
      C17,
    ],
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
      C15,
      C16,
      C17,
      C18,
    ]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
  c9: CaseDecl<A, C9, R>,
  c10: CaseDecl<A, C10, R>,
  c11: CaseDecl<A, C11, R>,
  c12: CaseDecl<A, C12, R>,
  c13: CaseDecl<A, C13, R>,
  c14: CaseDecl<A, C14, R>,
  c15: CaseDecl<A, C15, R>,
  c16: CaseDecl<A, C16, R>,
  c17: CaseDecl<A, C17, R>,
  c18: CaseDecl<A, C18, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C19
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  C10,
  C11,
  C12,
  C13,
  C14,
  C15,
  C16,
  C17,
  C18,
  C19,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C19,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
      C15,
      C16,
      C17,
      C18,
    ],
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
      C15,
      C16,
      C17,
      C18,
      C19,
    ]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
  c9: CaseDecl<A, C9, R>,
  c10: CaseDecl<A, C10, R>,
  c11: CaseDecl<A, C11, R>,
  c12: CaseDecl<A, C12, R>,
  c13: CaseDecl<A, C13, R>,
  c14: CaseDecl<A, C14, R>,
  c15: CaseDecl<A, C15, R>,
  c16: CaseDecl<A, C16, R>,
  c17: CaseDecl<A, C17, R>,
  c18: CaseDecl<A, C18, R>,
  c19: CaseDecl<A, C19, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * C1~C20
 */
export function match<
  A,
  C1,
  C2,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  C10,
  C11,
  C12,
  C13,
  C14,
  C15,
  C16,
  C17,
  C18,
  C19,
  C20,
  R,
  OTHERWISE_LAST extends boolean = Is<
    C20,
    typeof otherwise
  >,
  CASES extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
      C15,
      C16,
      C17,
      C18,
      C19,
    ],
    [
      C1,
      C2,
      C3,
      C4,
      C5,
      C6,
      C7,
      C8,
      C9,
      C10,
      C11,
      C12,
      C13,
      C14,
      C15,
      C16,
      C17,
      C18,
      C19,
      C20,
    ]
  >,
>(
  a: A,
  c1: CaseDecl<A, C1, R>,
  c2: CaseDecl<A, C2, R>,
  c3: CaseDecl<A, C3, R>,
  c4: CaseDecl<A, C4, R>,
  c5: CaseDecl<A, C5, R>,
  c6: CaseDecl<A, C6, R>,
  c7: CaseDecl<A, C7, R>,
  c8: CaseDecl<A, C8, R>,
  c9: CaseDecl<A, C9, R>,
  c10: CaseDecl<A, C10, R>,
  c11: CaseDecl<A, C11, R>,
  c12: CaseDecl<A, C12, R>,
  c13: CaseDecl<A, C13, R>,
  c14: CaseDecl<A, C14, R>,
  c15: CaseDecl<A, C15, R>,
  c16: CaseDecl<A, C16, R>,
  c17: CaseDecl<A, C17, R>,
  c18: CaseDecl<A, C18, R>,
  c19: CaseDecl<A, C19, R>,
  c20: CaseDecl<A, C20, R>,
): MatchResult<CASES, OTHERWISE_LAST, A, R>;

/**
 * Runtime implementation of pattern matching.
 */
export function match(
  a: unknown,
  ...options: ReadonlyArray<
    [unknown, (ma: unknown) => unknown]
  >
): unknown {
  for (const [cond, fn] of options) {
    if (cond === otherwise) {
      return fn(a);
    }
    if (
      isVariant(a) &&
      isVariant(cond) &&
      deepPartialEqual(a, cond)
    ) {
      return fn(a);
    }
    if (Object.is(a, cond)) {
      return fn(a);
    }
  }
  throw new Error(
    `Unexpectedly no match for value: ${String(a)}`,
  );
}
