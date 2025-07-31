import { pipe, TRUE, FALSE } from "plgg/index";

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

export type IsExtended<A, B> = A extends B ? true : false;

export type Is<A, B> = A extends B ? true : false;

export type TupleToUnion<T extends ReadonlyArray<unknown>> = T[number];

export type IsUnionSubset<A, B> = [Exclude<A, B>] extends [never]
  ? true
  : false;

// -----------------------

//export type IsLiteralOf<BASE, T> = T extends BASE
//  ? BASE extends T
//    ? false
//    : true
//  : false;
//
//type IsLiteral<T> = Or<IsLiteralOf<string, T>, IsLiteralOf<number, T>>;
//
//type IsAllLiteral<ARR extends readonly unknown[]> = ARR extends [
//  infer Head,
//  ...infer Tail,
//]
//  ? IsLiteral<Head> extends true
//    ? IsAllLiteral<Tail>
//    : false
//  : true;
//
//export type IsLiteralUnion<OPTIONS extends ReadonlyArray<unknown>> = Or<
//  IsAllLiteral<OPTIONS>,
//  Is<OPTIONS, [true, false]>
//>;

// -------------------------

export type MatchActually<
  R,
  A,
  LAST_O_DEFAULT extends boolean,
  OPTIONS extends ReadonlyArray<unknown>,
  UNION_OPTIONS extends ReadonlyArray<unknown>[number] = TupleToUnion<OPTIONS>,
> = If<
  Is<A, boolean>,
  If<Is<OPTIONS, [true, false]>, R, never>,
  If<
    IsEqual<UNION_OPTIONS, A>,
    R,
    If<LAST_O_DEFAULT, If<IsUnionSubset<UNION_OPTIONS, A>, R, never>, never>
  >
>;

// -------------------------

/**
 * O1~O2
 */
export function matchExample<
  O1,
  O2,
  R,
  LAST_O_DEFAULT extends boolean = IsExtended<O2, typeof DEFAULT>,
  OPTIONS extends ReadonlyArray<unknown> = If<LAST_O_DEFAULT, [O1], [O1, O2]>,
>(
  o1: [O1, () => R],
  o2: [O2, () => R],
): <A>(a: A) => MatchActually<R, A, LAST_O_DEFAULT, OPTIONS>;

/**
 * O1~O3
 */
export function matchExample<
  O1,
  O2,
  O3,
  R,
  LAST_O_DEFAULT extends boolean = IsExtended<O3, typeof DEFAULT>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    LAST_O_DEFAULT,
    [O1, O2],
    [O1, O2, O3]
  >,
>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
): <A>(a: A) => MatchActually<R, A, LAST_O_DEFAULT, OPTIONS>;

/**
 * O1~O4
 */
export function matchExample<
  O1,
  O2,
  O3,
  O4,
  R,
  LAST_O_DEFAULT extends boolean = IsExtended<O4, typeof DEFAULT>,
  OPTIONS extends ReadonlyArray<unknown> = If<
    LAST_O_DEFAULT,
    [O1, O2, O3],
    [O1, O2, O3, O4]
  >,
>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
): <A>(a: A) => MatchActually<R, A, LAST_O_DEFAULT, OPTIONS>;

/**
 * matchExample
 */
export function matchExample(
  ...options: ReadonlyArray<[unknown, () => unknown]>
): (a: unknown) => unknown {
  return (v: unknown): unknown => {
    for (const [cond, fn] of options) {
      if (cond === "__MATCH_DEFAULT__") {
        return fn();
      }
      if (Object.is(v, cond)) {
        return fn();
      }
    }
    throw new Error(`Unexpectedly no match for value: ${String(v)}`);
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
      matchExample(
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
      matchExample(
        [TRUE, () => "true"],
        [FALSE, () => "false"], // should compile error when erased
      ),
      (a) => a,
    );
}
