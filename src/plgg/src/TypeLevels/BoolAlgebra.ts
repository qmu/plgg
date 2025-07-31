import {
  pipe,
  TRUE,
  FALSE,
  Variant,
  pattern,
  ExtractBody,
  isVariant,
} from "plgg/index";

export const DEFAULT = "__MATCH_DEFAULT__" as const;

export type If<C extends boolean, T, F> = C extends true ? T : F;

export type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

export type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false;

export type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true
    ? true
    : false;

export type Is<A, B> = A extends B ? true : false;

export type TupleToUnion<T extends ReadonlyArray<unknown>> = T[number];

export type IsUnionSubset<A, B> = [Exclude<A, B>] extends [never]
  ? true
  : false;

type UnPartial<T> = {
  [K in keyof T]-?: T[K];
};

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

export type MatchActually<
  R,
  A,
  DEFAULT_LAST extends boolean,
  OPTIONS extends ReadonlyArray<unknown>,
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
  ? UnPartial<ExtractBody<T>>
  : T;

type MatchOption<T, R> = [T, (a: MapperArg<T>) => R];

// -------------------------

/**
 * O1~O2
 */
export function match<
  O1,
  O2,
  R,
  DEFAULT_LAST extends boolean = Is<O2, typeof DEFAULT>,
  OPTIONS extends ReadonlyArray<unknown> = If<DEFAULT_LAST, [O1], [O1, O2]>,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
): <A>(a: A) => MatchActually<R, A, DEFAULT_LAST, OPTIONS>;

/**
 * O1~O3
 */
export function match<
  O1,
  O2,
  O3,
  R,
  DEFAULT_LAST extends boolean = Is<O3, typeof DEFAULT>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    DEFAULT_LAST,
    [O1, O2],
    [O1, O2, O3]
  >,
>(
  o1: MatchOption<O1, R>,
  o2: MatchOption<O2, R>,
  o3: MatchOption<O3, R>,
): <A>(a: A) => MatchActually<R, A, DEFAULT_LAST, OPTIONS>;

/**
 * O1~O4
 */
export function match<
  O1,
  O2,
  O3,
  O4,
  R,
  DEFAULT_LAST extends boolean = Is<O4, typeof DEFAULT>,
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
): <A>(a: A) => MatchActually<R, A, DEFAULT_LAST, OPTIONS>;

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
  DEFAULT_LAST extends boolean = Is<O5, typeof DEFAULT>,
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
): <A>(a: A) => MatchActually<R, A, DEFAULT_LAST, OPTIONS>;

/**
 * matchExample
 */
export function match(
  ...options: ReadonlyArray<[unknown, (ma: unknown) => unknown]>
): (a: unknown) => unknown {
  return (a: unknown): unknown => {
    for (const [cond, fn] of options) {
      if (cond === "__MATCH_DEFAULT__") {
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

/**
 * Example1
 */
{
  const s1 = "a" as const,
    s2 = 2 as const,
    s3 = false as const,
    s4 = { type: "hoge" } as const;
  type status = typeof s1 | typeof s2 | typeof s3 | typeof s4;
  (a: status) =>
    pipe(
      a,
      match(
        [s1, () => "a"],
        [s2, () => "b"],
        [s3, () => "c"], // should compile error when erased
        [s4, () => "d"], // should compile error when erased
      ),
      (a) => a,
    );
}

/**
 * Example2
 */
{
  (a: boolean) =>
    pipe(
      a,
      match(
        [TRUE, () => "true"],
        [FALSE, () => "false"], // should compile error when erased
      ),
      (a) => a,
    );
}

/**
 * Example3
 */
{
  type Circle = Variant<
    "circle",
    {
      radius: number;
    }
  >;
  const circle = pattern("circle")<Circle>();

  type Square = Variant<
    "square",
    {
      side: number;
    }
  >;
  const square = pattern("square")<Square>();

  type Triangle = Variant<
    "triangle",
    {
      base: number;
      height: number;
    }
  >;
  const triangle = pattern("triangle")<Triangle>();

  type Shape = Circle | Square | Triangle;

  (a: Shape) =>
    pipe(
      a,
      match(
        [circle(), () => "a"],
        [square(), () => "b"],
        [triangle(), () => "b"],
      ),
      (a) => a,
    );
}

/**
 * Example4
 */
{
  type AST = Variant<
    "ast",
    {
      type: "root" | "leaf" | "branch";
      children?: ReadonlyArray<AST>;
    }
  >;
  const ast = pattern("ast")<AST>();

  (a: AST) =>
    pipe(
      a,
      match(
        [ast({ type: "root" }), () => "root"],
        [ast({ type: "leaf" }), () => "leaf"],
        [ast({ type: "branch" }), () => "branch"],
        [DEFAULT, () => "default"],
      ),
      (a) => a,
    );
}
