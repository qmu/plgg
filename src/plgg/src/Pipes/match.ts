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
} from "plgg/index";

// -------------------------
// Helper Types
// -------------------------

type MatchResult<
  OPTIONS extends ReadonlyArray<unknown>,
  DEFAULT_LAST extends boolean,
  A,
  R,
  UNION_OPTIONS extends ReadonlyArray<unknown>[number] = TupleToUnion<OPTIONS>,
> = If<
  Is<A, boolean>,
  If<Is<OPTIONS, [true, false]>, R, never>,
  If<
    IsAllVariant<OPTIONS>,
    If<
      FullCoveragedVariants<OPTIONS, A>, // check if all variants are covered
      R,
      If<DEFAULT_LAST, If<Is<A, UNION_OPTIONS>, R, never>, never>
    >,
    If<
      IsEqual<UNION_OPTIONS, A>,
      R,
      If<DEFAULT_LAST, If<IsUnionSubset<UNION_OPTIONS, A>, R, never>, never>
    >
  >
>;

type FullCoveragedVariants<OPTIONS extends ReadonlyArray<unknown>, A> = If<
  IsAllTagOnly<OPTIONS>,
  IsUnionSubset<A, TupleToUnion<OPTIONS>>,
  false
>;

type IsVariant<T> = T extends { __tag: string } ? true : false;

type IsAllVariant<ARR extends ReadonlyArray<unknown>> = ARR extends [
  infer Head,
  ...infer Tail,
]
  ? IsVariant<Head> extends true
    ? IsAllVariant<Tail>
    : false
  : true;

type IsOnlyTag<T> = T extends { __tag: string }
  ? keyof T extends "__tag"
    ? T["__tag"] extends string
      ? Exclude<keyof T, "__tag"> extends never
        ? true
        : false
      : false
    : false
  : false;

type IsAllTagOnly<ARR extends ReadonlyArray<unknown>> = ARR extends [
  infer Head,
  ...infer Tail,
]
  ? IsOnlyTag<Head> extends true
    ? IsAllTagOnly<Tail>
    : false
  : true;

type PartialBodyVariant = Variant<string, Partial<unknown>>;

type MapperArg<T> = T extends PartialBodyVariant
  ? UnPartial<ExtractContent<T>>
  : T;

type MatchOption<T, R> = [T, (a: MapperArg<T>) => R];

function deepPartialEqual<T>(obj1: T, obj2: Partial<T>): boolean {
  const isObject = (obj: unknown): obj is object =>
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
 * O1~O2
 */
export function match<
  O1,
  O2,
  R,
  DEFAULT_LAST extends boolean = Is<O2, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<DEFAULT_LAST, [O1], [O1, O2]>,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

/**
 * O1~O3
 */
export function match<
  O1,
  O2,
  O3,
  R,
  DEFAULT_LAST extends boolean = Is<O3, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
    [O1, O2],
    [O1, O2, O3]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

/**
 * O1~O4
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  R,
  DEFAULT_LAST extends boolean = Is<O4, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
    [O1, O2, O3],
    [O1, O2, O3, O4]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O5, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
    [O1, O2, O3, O4],
    [O1, O2, O3, O4, O5]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
  o4: MatchOption<O4, R>,
  o5: MatchOption<O5, R>,
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O6, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O7, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O8, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O9, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O10, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O11, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O12, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11],
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, O12]
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O13, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, O12],
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, O12, O13]
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O14, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, O12, O13],
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, O12, O13, O14]
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O15, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, O12, O13, O14],
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, O12, O13, O14, O15]
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O16, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, O12, O13, O14, O15],
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, O12, O13, O14, O15, O16]
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O17, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, O12, O13, O14, O15, O16],
    [O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, O12, O13, O14, O15, O16, O17]
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O18, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O19, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

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
  DEFAULT_LAST extends boolean = Is<O20, typeof OTHERWISE>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
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
): <A>(a: A) => MatchResult<OPTIONS, DEFAULT_LAST, A, R>;

/**
 * match
 */
export function match(
  ...options: ReadonlyArray<[unknown, (ma: unknown) => unknown]>
): (a: unknown) => unknown {
  return (a: unknown): unknown => {
    for (const [cond, fn] of options) {
      if (cond === OTHERWISE) {
        return fn(a);
      }
      if (isVariant(a) && isVariant(cond) && deepPartialEqual(a, cond)) {
        return fn(a);
      }
      if (Object.is(a, cond)) {
        return fn(a);
      }
    }
    throw new Error(`Unexpectedly no match for value: ${String(a)}`);
  };
}
