type Body<A, R> = (a: A) => R;

export function match<O1, A extends O1, R>(o1: [O1, () => R]): Body<A, R>;
export function match<O1, O2, A extends O1 | O2, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
): Body<A, R>;
export function match<O1, O2, O3, A extends O1 | O2 | O3, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
): Body<A, R>;
export function match<O1, O2, O3, O4, A extends O1 | O2 | O3 | O4, R>(
  o1: [O1, () => R],
  o2: [O2, () => R],
  o3: [O3, () => R],
  o4: [O4, () => R],
): Body<A, R>;

export function match(
  ...options: ReadonlyArray<[unknown, () => unknown]>
): Body<unknown, unknown> {
  return (v: unknown): unknown => {
    for (const [cond, fn] of options) {
      if (Object.is(v, cond)) {
        return fn();
      }
    }
    throw new Error(`Unexpectedly no match for value: ${String(v)}`);
  };
}
