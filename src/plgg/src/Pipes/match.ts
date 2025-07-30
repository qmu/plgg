// ------------------------------------
// Helper types
// ------------------------------------

type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false;

type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true
    ? true
    : false;

type IsAssignable<From, To> = From extends To ? true : false;

export const DEFAULT = "__MATCH_DEFAULT__" as const;

// ------------------------------------
// Actual match function
// ------------------------------------

export function match<O1, R>(
  o1: [O1, () => R],
): <A>(a: A) => IsEqual<O1, A> extends true ? R : never;
export function match<O1, O2, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
): <A>(a: A) => IsEqual<O1 | O2, A> extends true ? R : never;
export function match<O1, O2, O3, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
): <A>(a: A) => IsEqual<O1 | O2 | O3, A> extends true ? R : never;
export function match<O1, O2, O3, O4, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
): <A>(
  a: A,
) => Or<
  IsEqual<O1 | O2 | O3 | O4, A>,
  And<IsAssignable<O1 | O2 | O3, A>, IsEqual<O4, typeof DEFAULT>>
> extends true
  ? R
  : never;
export function match<O1, O2, O3, O4, O5, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
): <A>(a: A) => IsEqual<O1 | O2 | O3 | O4 | O5, A> extends true ? R : never;
export function match<O1, O2, O3, O4, O5, O6, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
): <A>(
  a: A,
) => IsEqual<O1 | O2 | O3 | O4 | O5 | O6, A> extends true ? R : never;
export function match<O1, O2, O3, O4, O5, O6, O7, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
): <A>(
  a: A,
) => IsEqual<O1 | O2 | O3 | O4 | O5 | O6 | O7, A> extends true ? R : never;
export function match<O1, O2, O3, O4, O5, O6, O7, O8, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
): <A>(
  a: A,
) => IsEqual<O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8, A> extends true ? R : never;
export function match<O1, O2, O3, O4, O5, O6, O7, O8, O9, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
  o9: [O9, () => R],
): <A>(
  a: A,
) => IsEqual<O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8 | O9, A> extends true
  ? R
  : never;
export function match<O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
  o9: [O9, () => R],
  o10: [O10, () => R],
): <A>(
  a: A,
) => IsEqual<O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8 | O9 | O10, A> extends true
  ? R
  : never;
export function match<O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
  o9: [O9, () => R],
  o10: [O10, () => R],
  o11: [O11, () => R],
): <A>(
  a: A,
) => IsEqual<
  O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8 | O9 | O10 | O11,
  A
> extends true
  ? R
  : never;
export function match<O1, O2, O3, O4, O5, O6, O7, O8, O9, O10, O11, O12, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
  o9: [O9, () => R],
  o10: [O10, () => R],
  o11: [O11, () => R],
  o12: [O12, () => R],
): <A>(
  a: A,
) => IsEqual<
  O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8 | O9 | O10 | O11 | O12,
  A
> extends true
  ? R
  : never;
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
>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
  o9: [O9, () => R],
  o10: [O10, () => R],
  o11: [O11, () => R],
  o12: [O12, () => R],
  o13: [O13, () => R],
): <A>(
  a: A,
) => IsEqual<
  O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8 | O9 | O10 | O11 | O12 | O13,
  A
> extends true
  ? R
  : never;
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
>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
  o9: [O9, () => R],
  o10: [O10, () => R],
  o11: [O11, () => R],
  o12: [O12, () => R],
  o13: [O13, () => R],
  o14: [O14, () => R],
): <A>(
  a: A,
) => IsEqual<
  O1 | O2 | O3 | O4 | O5 | O6 | O7 | O8 | O9 | O10 | O11 | O12 | O13 | O14,
  A
> extends true
  ? R
  : never;
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
>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
  o9: [O9, () => R],
  o10: [O10, () => R],
  o11: [O11, () => R],
  o12: [O12, () => R],
  o13: [O13, () => R],
  o14: [O14, () => R],
  o15: [O15, () => R],
): <A>(
  a: A,
) => IsEqual<
  | O1
  | O2
  | O3
  | O4
  | O5
  | O6
  | O7
  | O8
  | O9
  | O10
  | O11
  | O12
  | O13
  | O14
  | O15,
  A
> extends true
  ? R
  : never;
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
>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
  o9: [O9, () => R],
  o10: [O10, () => R],
  o11: [O11, () => R],
  o12: [O12, () => R],
  o13: [O13, () => R],
  o14: [O14, () => R],
  o15: [O15, () => R],
  o16: [O16, () => R],
): <A>(
  a: A,
) => IsEqual<
  | O1
  | O2
  | O3
  | O4
  | O5
  | O6
  | O7
  | O8
  | O9
  | O10
  | O11
  | O12
  | O13
  | O14
  | O15
  | O16,
  A
> extends true
  ? R
  : never;
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
>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
  o9: [O9, () => R],
  o10: [O10, () => R],
  o11: [O11, () => R],
  o12: [O12, () => R],
  o13: [O13, () => R],
  o14: [O14, () => R],
  o15: [O15, () => R],
  o16: [O16, () => R],
  o17: [O17, () => R],
): <A>(
  a: A,
) => IsEqual<
  | O1
  | O2
  | O3
  | O4
  | O5
  | O6
  | O7
  | O8
  | O9
  | O10
  | O11
  | O12
  | O13
  | O14
  | O15
  | O16
  | O17,
  A
> extends true
  ? R
  : never;
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
>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
  o9: [O9, () => R],
  o10: [O10, () => R],
  o11: [O11, () => R],
  o12: [O12, () => R],
  o13: [O13, () => R],
  o14: [O14, () => R],
  o15: [O15, () => R],
  o16: [O16, () => R],
  o17: [O17, () => R],
  o18: [O18, () => R],
): <A>(
  a: A,
) => IsEqual<
  | O1
  | O2
  | O3
  | O4
  | O5
  | O6
  | O7
  | O8
  | O9
  | O10
  | O11
  | O12
  | O13
  | O14
  | O15
  | O16
  | O17
  | O18,
  A
> extends true
  ? R
  : never;
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
>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
  o9: [O9, () => R],
  o10: [O10, () => R],
  o11: [O11, () => R],
  o12: [O12, () => R],
  o13: [O13, () => R],
  o14: [O14, () => R],
  o15: [O15, () => R],
  o16: [O16, () => R],
  o17: [O17, () => R],
  o18: [O18, () => R],
  o19: [O19, () => R],
): <A>(
  a: A,
) => IsEqual<
  | O1
  | O2
  | O3
  | O4
  | O5
  | O6
  | O7
  | O8
  | O9
  | O10
  | O11
  | O12
  | O13
  | O14
  | O15
  | O16
  | O17
  | O18
  | O19,
  A
> extends true
  ? R
  : never;
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
>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
  o5: [O5, () => R],
  o6: [O6, () => R],
  o7: [O7, () => R],
  o8: [O8, () => R],
  o9: [O9, () => R],
  o10: [O10, () => R],
  o11: [O11, () => R],
  o12: [O12, () => R],
  o13: [O13, () => R],
  o14: [O14, () => R],
  o15: [O15, () => R],
  o16: [O16, () => R],
  o17: [O17, () => R],
  o18: [O18, () => R],
  o19: [O19, () => R],
  o20: [O20, () => R],
): <A>(
  a: A,
) => IsEqual<
  | O1
  | O2
  | O3
  | O4
  | O5
  | O6
  | O7
  | O8
  | O9
  | O10
  | O11
  | O12
  | O13
  | O14
  | O15
  | O16
  | O17
  | O18
  | O19
  | O20,
  A
> extends true
  ? R
  : never;

export function match(
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
