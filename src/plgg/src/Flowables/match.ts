import {
  Variant,
  ExtractContent,
  isVariant,
  If,
  IsEqual,
  Is,
  TupleToUnion,
  IsUnionSubset,
  UnPartial,
  OTHERWISE,
  And,
  Or,
} from "plgg/index";

// -------------------------
// Helper Types for Pattern Matching
// -------------------------

/**
 * Type-level computation for pattern matching results.
 * Determines the return type based on whether patterns provide exhaustive coverage.
 */
type MatchResult<
  OPTIONS extends ReadonlyArray<unknown>,
  OTHERWISE_LAST extends boolean,
  A,
  R,
  UNION_OPTIONS extends
    ReadonlyArray<unknown>[number] = TupleToUnion<OPTIONS>,
> = If<
  Is<A, boolean>,
  If<Is<OPTIONS, [true, false]>, R, never>,
  If<
    IsAllVariant<OPTIONS>,
    If<
      FullCoveragedVariants<OPTIONS, A>, // check if all variants are covered
      R,
      If<
        And<OTHERWISE_LAST, Is<A, UNION_OPTIONS>>,
        R,
        never
      >
    >,
    If<
      IsAllAtomic<OPTIONS>,
      If<
        IsEqual<UNION_OPTIONS, A>,
        R,
        If<
          And<
            OTHERWISE_LAST,
            IsUnionSubset<UNION_OPTIONS, A>
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
 */
type FullCoveragedVariants<
  OPTIONS extends ReadonlyArray<unknown>,
  A,
> = If<
  Or<
    IsFixedVariantAll<OPTIONS>,
    IsWildParametricVariantAll<OPTIONS>
  >,
  IsUnionSubset<A, TupleToUnion<OPTIONS>>,
  false
>;

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
 * Checks if T is a fixed variant (variant with only __tag property).
 */
type IsFixedVariantPattern<T> = T extends {
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
 * Recursively checks if all elements in array are fixed variants.
 */
type IsFixedVariantAll<
  ARR extends ReadonlyArray<unknown>,
> = ARR extends [infer Head, ...infer Tail]
  ? IsFixedVariantPattern<Head> extends true
    ? IsFixedVariantAll<Tail>
    : false
  : true;

/**
 * Checks if T is a wild parametric variant without actual pattern.
 */
type IsWildParametricVariantAll<
  ARR extends ReadonlyArray<unknown>,
> = ARR extends [infer Head, ...infer Tail]
  ? IsWildParametricVariantPattern<Head> extends true
    ? IsWildParametricVariantAll<Tail>
    : false
  : true;

/**
 * Type predicate for wild parametric variant patterns.
 */
type IsWildParametricVariantPattern<T> =
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
 * Variant type with partial content for pattern matching.
 */
type PartialBodyVariant = Variant<
  string,
  Partial<unknown>
>;

/**
 * Maps pattern types to their corresponding handler argument types.
 */
type MapperArg<T> = T extends PartialBodyVariant
  ? UnPartial<ExtractContent<T>>
  : T;

/**
 * Represents a pattern-handler pair for matching.
 */
type MatchOption<T, R> = [
  T,
  (a: MapperArg<T>) => R,
];

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
  O1,
  O2,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O2,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [O1],
    [O1, O2]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O3
 */
export function match<
  O1,
  O2,
  O3,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O3,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [O1, O2],
    [O1, O2, O3]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O4
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O4,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [O1, O2, O3],
    [O1, O2, O3, O4]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O5
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O5,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [O1, O2, O3, O4],
    [O1, O2, O3, O4, O5]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O6
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O6,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [O1, O2, O3, O4, O5],
    [O1, O2, O3, O4, O5, O6]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O7
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O7,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [O1, O2, O3, O4, O5, O6],
    [O1, O2, O3, O4, O5, O6, O7]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O8
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O8,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [O1, O2, O3, O4, O5, O6, O7],
    [O1, O2, O3, O4, O5, O6, O7, O8]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O9
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  O9,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O9,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [O1, O2, O3, O4, O5, O6, O7, O8],
    [O1, O2, O3, O4, O5, O6, O7, O8, O9]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
  o9: MatchOption<O9, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O10
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  O9,
  O10,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O10,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [O1, O2, O3, O4, O5, O6, O7, O8, O9],
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
  o9: MatchOption<O9, R>,
  o10: MatchOption<O10, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O11
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  O9,
  O10,
  O11,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O11,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10],
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
  o9: MatchOption<O9, R>,
  o10: MatchOption<O10, R>,
  o11: MatchOption<O11, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O12
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  O9,
  O10,
  O11,
  O12,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O12,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
    ],
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
    ]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
  o9: MatchOption<O9, R>,
  o10: MatchOption<O10, R>,
  o11: MatchOption<O11, R>,
  o12: MatchOption<O12, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O13
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  O9,
  O10,
  O11,
  O12,
  O13,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O13,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
    ],
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
    ]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
  o9: MatchOption<O9, R>,
  o10: MatchOption<O10, R>,
  o11: MatchOption<O11, R>,
  o12: MatchOption<O12, R>,
  o13: MatchOption<O13, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O14
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  O9,
  O10,
  O11,
  O12,
  O13,
  O14,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O14,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
    ],
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
    ]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
  o9: MatchOption<O9, R>,
  o10: MatchOption<O10, R>,
  o11: MatchOption<O11, R>,
  o12: MatchOption<O12, R>,
  o13: MatchOption<O13, R>,
  o14: MatchOption<O14, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O15
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  O9,
  O10,
  O11,
  O12,
  O13,
  O14,
  O15,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O15,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
    ],
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
      O15,
    ]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
  o9: MatchOption<O9, R>,
  o10: MatchOption<O10, R>,
  o11: MatchOption<O11, R>,
  o12: MatchOption<O12, R>,
  o13: MatchOption<O13, R>,
  o14: MatchOption<O14, R>,
  o15: MatchOption<O15, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O16
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  O9,
  O10,
  O11,
  O12,
  O13,
  O14,
  O15,
  O16,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O16,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
      O15,
    ],
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
      O15,
      O16,
    ]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
  o9: MatchOption<O9, R>,
  o10: MatchOption<O10, R>,
  o11: MatchOption<O11, R>,
  o12: MatchOption<O12, R>,
  o13: MatchOption<O13, R>,
  o14: MatchOption<O14, R>,
  o15: MatchOption<O15, R>,
  o16: MatchOption<O16, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O17
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  O9,
  O10,
  O11,
  O12,
  O13,
  O14,
  O15,
  O16,
  O17,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O17,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
      O15,
      O16,
    ],
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
      O15,
      O16,
      O17,
    ]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
  o9: MatchOption<O9, R>,
  o10: MatchOption<O10, R>,
  o11: MatchOption<O11, R>,
  o12: MatchOption<O12, R>,
  o13: MatchOption<O13, R>,
  o14: MatchOption<O14, R>,
  o15: MatchOption<O15, R>,
  o16: MatchOption<O16, R>,
  o17: MatchOption<O17, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O18
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  O9,
  O10,
  O11,
  O12,
  O13,
  O14,
  O15,
  O16,
  O17,
  O18,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O18,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
      O15,
      O16,
      O17,
    ],
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
      O15,
      O16,
      O17,
      O18,
    ]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
  o9: MatchOption<O9, R>,
  o10: MatchOption<O10, R>,
  o11: MatchOption<O11, R>,
  o12: MatchOption<O12, R>,
  o13: MatchOption<O13, R>,
  o14: MatchOption<O14, R>,
  o15: MatchOption<O15, R>,
  o16: MatchOption<O16, R>,
  o17: MatchOption<O17, R>,
  o18: MatchOption<O18, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O19
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  O9,
  O10,
  O11,
  O12,
  O13,
  O14,
  O15,
  O16,
  O17,
  O18,
  O19,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O19,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
      O15,
      O16,
      O17,
      O18,
    ],
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
      O15,
      O16,
      O17,
      O18,
      O19,
    ]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
  o9: MatchOption<O9, R>,
  o10: MatchOption<O10, R>,
  o11: MatchOption<O11, R>,
  o12: MatchOption<O12, R>,
  o13: MatchOption<O13, R>,
  o14: MatchOption<O14, R>,
  o15: MatchOption<O15, R>,
  o16: MatchOption<O16, R>,
  o17: MatchOption<O17, R>,
  o18: MatchOption<O18, R>,
  o19: MatchOption<O19, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * O1~O20
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  O5,
  O6,
  O7,
  O8,
  O9,
  O10,
  O11,
  O12,
  O13,
  O14,
  O15,
  O16,
  O17,
  O18,
  O19,
  O20,
  R,
  OTHERWISE_LAST extends boolean = Is<
    O20,
    typeof OTHERWISE
  >,
  OPTIONS extends ReadonlyArray<unknown> = If<
    OTHERWISE_LAST,
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
      O15,
      O16,
      O17,
      O18,
      O19,
    ],
    [
      O1,
      O2,
      O3,
      O4,
      O5,
      O6,
      O7,
      O8,
      O9,
      O10,
      O11,
      O12,
      O13,
      O14,
      O15,
      O16,
      O17,
      O18,
      O19,
      O20,
    ]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
  o6: MatchOption<O6, R>,
  o7: MatchOption<O7, R>,
  o8: MatchOption<O8, R>,
  o9: MatchOption<O9, R>,
  o10: MatchOption<O10, R>,
  o11: MatchOption<O11, R>,
  o12: MatchOption<O12, R>,
  o13: MatchOption<O13, R>,
  o14: MatchOption<O14, R>,
  o15: MatchOption<O15, R>,
  o16: MatchOption<O16, R>,
  o17: MatchOption<O17, R>,
  o18: MatchOption<O18, R>,
  o19: MatchOption<O19, R>,
  o20: MatchOption<O20, R>,
): <A>(
  a: A,
) => MatchResult<OPTIONS, OTHERWISE_LAST, A, R>;

/**
 * Runtime implementation of pattern matching.
 */
export function match(
  ...options: ReadonlyArray<
    [unknown, (ma: unknown) => unknown]
  >
): (a: unknown) => unknown {
  return (a: unknown): unknown => {
    for (const [cond, fn] of options) {
      if (cond === OTHERWISE) {
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
  };
}
