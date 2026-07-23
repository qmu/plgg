import {
  Result,
  InvalidError,
  invalidError,
  NonNeverFn,
  isOk,
  ok,
  err,
} from "plgg/index";

/**
 * Synchronous validation composition for `Result` types: thread a value through
 * a chain of `Result`-returning steps, short-circuiting on the first `Err`.
 * Variadic — a value followed by 2–20 steps (only the 2-step arity is shown
 * here; the higher arities are equivalent).
 */
export function cast<A, B, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
): Result<B, ERR>;
/**
 * Two-step function composition for Result types.
 */
/** @internal */
export function cast<A, B, C, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
): Result<C, ERR>;
/** @internal */
export function cast<A, B, C, D, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
): Result<D, ERR>;
/** @internal */
export function cast<A, B, C, D, E, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
): Result<E, ERR>;
/** @internal */
export function cast<A, B, C, D, E, F, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
): Result<F, ERR>;
/** @internal */
export function cast<A, B, C, D, E, F, G, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
): Result<G, ERR>;
/** @internal */
export function cast<A, B, C, D, E, F, G, H, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
): Result<H, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
): Result<I, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
  ij: NonNeverFn<(i: I) => Result<J, ERR>>,
): Result<J, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
  ij: NonNeverFn<(i: I) => Result<J, ERR>>,
  jk: NonNeverFn<(j: J) => Result<K, ERR>>,
): Result<K, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
  ij: NonNeverFn<(i: I) => Result<J, ERR>>,
  jk: NonNeverFn<(j: J) => Result<K, ERR>>,
  kl: NonNeverFn<(k: K) => Result<L, ERR>>,
): Result<L, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
  ij: NonNeverFn<(i: I) => Result<J, ERR>>,
  jk: NonNeverFn<(j: J) => Result<K, ERR>>,
  kl: NonNeverFn<(k: K) => Result<L, ERR>>,
  lm: NonNeverFn<(l: L) => Result<M, ERR>>,
): Result<M, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
  ij: NonNeverFn<(i: I) => Result<J, ERR>>,
  jk: NonNeverFn<(j: J) => Result<K, ERR>>,
  kl: NonNeverFn<(k: K) => Result<L, ERR>>,
  lm: NonNeverFn<(l: L) => Result<M, ERR>>,
  mn: NonNeverFn<(m: M) => Result<N, ERR>>,
): Result<N, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
  ij: NonNeverFn<(i: I) => Result<J, ERR>>,
  jk: NonNeverFn<(j: J) => Result<K, ERR>>,
  kl: NonNeverFn<(k: K) => Result<L, ERR>>,
  lm: NonNeverFn<(l: L) => Result<M, ERR>>,
  mn: NonNeverFn<(m: M) => Result<N, ERR>>,
  no: NonNeverFn<(n: N) => Result<O, ERR>>,
): Result<O, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
  ij: NonNeverFn<(i: I) => Result<J, ERR>>,
  jk: NonNeverFn<(j: J) => Result<K, ERR>>,
  kl: NonNeverFn<(k: K) => Result<L, ERR>>,
  lm: NonNeverFn<(l: L) => Result<M, ERR>>,
  mn: NonNeverFn<(m: M) => Result<N, ERR>>,
  no: NonNeverFn<(n: N) => Result<O, ERR>>,
  op: NonNeverFn<(o: O) => Result<P, ERR>>,
): Result<P, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
  ij: NonNeverFn<(i: I) => Result<J, ERR>>,
  jk: NonNeverFn<(j: J) => Result<K, ERR>>,
  kl: NonNeverFn<(k: K) => Result<L, ERR>>,
  lm: NonNeverFn<(l: L) => Result<M, ERR>>,
  mn: NonNeverFn<(m: M) => Result<N, ERR>>,
  no: NonNeverFn<(n: N) => Result<O, ERR>>,
  op: NonNeverFn<(o: O) => Result<P, ERR>>,
  pq: NonNeverFn<(p: P) => Result<Q, ERR>>,
): Result<Q, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
  ij: NonNeverFn<(i: I) => Result<J, ERR>>,
  jk: NonNeverFn<(j: J) => Result<K, ERR>>,
  kl: NonNeverFn<(k: K) => Result<L, ERR>>,
  lm: NonNeverFn<(l: L) => Result<M, ERR>>,
  mn: NonNeverFn<(m: M) => Result<N, ERR>>,
  no: NonNeverFn<(n: N) => Result<O, ERR>>,
  op: NonNeverFn<(o: O) => Result<P, ERR>>,
  pq: NonNeverFn<(p: P) => Result<Q, ERR>>,
  qr: NonNeverFn<(q: Q) => Result<R, ERR>>,
): Result<R, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
  ij: NonNeverFn<(i: I) => Result<J, ERR>>,
  jk: NonNeverFn<(j: J) => Result<K, ERR>>,
  kl: NonNeverFn<(k: K) => Result<L, ERR>>,
  lm: NonNeverFn<(l: L) => Result<M, ERR>>,
  mn: NonNeverFn<(m: M) => Result<N, ERR>>,
  no: NonNeverFn<(n: N) => Result<O, ERR>>,
  op: NonNeverFn<(o: O) => Result<P, ERR>>,
  pq: NonNeverFn<(p: P) => Result<Q, ERR>>,
  qr: NonNeverFn<(q: Q) => Result<R, ERR>>,
  rs: NonNeverFn<(r: R) => Result<S, ERR>>,
): Result<S, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
  ij: NonNeverFn<(i: I) => Result<J, ERR>>,
  jk: NonNeverFn<(j: J) => Result<K, ERR>>,
  kl: NonNeverFn<(k: K) => Result<L, ERR>>,
  lm: NonNeverFn<(l: L) => Result<M, ERR>>,
  mn: NonNeverFn<(m: M) => Result<N, ERR>>,
  no: NonNeverFn<(n: N) => Result<O, ERR>>,
  op: NonNeverFn<(o: O) => Result<P, ERR>>,
  pq: NonNeverFn<(p: P) => Result<Q, ERR>>,
  qr: NonNeverFn<(q: Q) => Result<R, ERR>>,
  rs: NonNeverFn<(r: R) => Result<S, ERR>>,
  st: NonNeverFn<(s: S) => Result<T, ERR>>,
): Result<T, ERR>;
/** @internal */
export function cast<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  ERR,
>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
  gh: NonNeverFn<(g: G) => Result<H, ERR>>,
  hi: NonNeverFn<(h: H) => Result<I, ERR>>,
  ij: NonNeverFn<(i: I) => Result<J, ERR>>,
  jk: NonNeverFn<(j: J) => Result<K, ERR>>,
  kl: NonNeverFn<(k: K) => Result<L, ERR>>,
  lm: NonNeverFn<(l: L) => Result<M, ERR>>,
  mn: NonNeverFn<(m: M) => Result<N, ERR>>,
  no: NonNeverFn<(n: N) => Result<O, ERR>>,
  op: NonNeverFn<(o: O) => Result<P, ERR>>,
  pq: NonNeverFn<(p: P) => Result<Q, ERR>>,
  qr: NonNeverFn<(q: Q) => Result<R, ERR>>,
  rs: NonNeverFn<(r: R) => Result<S, ERR>>,
  st: NonNeverFn<(s: S) => Result<T, ERR>>,
  tu: NonNeverFn<(t: T) => Result<U, ERR>>,
): Result<U, ERR>;

/**
 * Implementation function that processes any number of functions.
 */
export function cast(
  value: unknown,
  ...fns: ReadonlyArray<ChainFn>
): Result<unknown, InvalidError> {
  return fns.reduce(
    (
      acc: Result<unknown, InvalidError>,
      fn: ChainFn,
    ) => {
      if (isOk(acc)) {
        try {
          return fn(acc.content);
        } catch (e) {
          return convUnknownToInvalidError(e);
        }
      }
      const currentResult = (() => {
        try {
          return fn(value);
        } catch (e) {
          return convUnknownToInvalidError(e);
        }
      })();
      if (isOk(currentResult)) {
        return err(acc.content);
      }
      const prevError =
        acc.content.content.sibling.length > 0
          ? []
          : [acc.content];
      const sibling = [
        ...prevError,
        ...acc.content.content.sibling,
        currentResult.content,
      ];
      return err(
        invalidError({
          message: `Cast failed at ${sibling.length} of ${fns.length} step(s), see sibling errors for details.`,
          sibling,
        }),
      );
    },
    ok<unknown>(value),
  );
}

const convUnknownToInvalidError = (
  e: unknown,
): Result<never, InvalidError> =>
  err(
    invalidError({
      // an unexpected throw inside a validation step: keep the origin in `cause`
      // (serializable) rather than flattening it to a stackless string.
      message: `Validation failed: ${
        e instanceof Error ? e.message : String(e)
      }`,
      cause: e,
    }),
  );

/**
 * Function type for cast operations.
 */
type ChainFn = (
  a: unknown,
) => Result<unknown, InvalidError>;
