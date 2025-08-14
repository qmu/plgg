import { isOk, ok, Result, InvalidError, err, NonNeverFn } from "plgg/index";

/**
 * Synchronous function composition with error accumulation for Result types.
 */
export function cast<A, B, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
): Result<B, ERR>;
/**
 * Two-step synchronous function composition with error accumulation.
 */
export function cast<A, B, C, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
): Result<C, ERR>;
export function cast<A, B, C, D, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
): Result<D, ERR>;
export function cast<A, B, C, D, E, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
): Result<E, ERR>;
export function cast<A, B, C, D, E, F, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
): Result<F, ERR>;
export function cast<A, B, C, D, E, F, G, ERR>(
  a: A,
  ab: NonNeverFn<(a: A) => Result<B, ERR>>,
  bc: NonNeverFn<(b: B) => Result<C, ERR>>,
  cd: NonNeverFn<(c: C) => Result<D, ERR>>,
  de: NonNeverFn<(d: D) => Result<E, ERR>>,
  ef: NonNeverFn<(e: E) => Result<F, ERR>>,
  fg: NonNeverFn<(f: F) => Result<G, ERR>>,
): Result<G, ERR>;
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
export function cast<A, B, C, D, E, F, G, H, I, ERR>(
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
export function cast<A, B, C, D, E, F, G, H, I, J, ERR>(
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
export function cast<A, B, C, D, E, F, G, H, I, J, K, ERR>(
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
export function cast<A, B, C, D, E, F, G, H, I, J, K, L, ERR>(
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
export function cast<A, B, C, D, E, F, G, H, I, J, K, L, M, ERR>(
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
export function cast<A, B, C, D, E, F, G, H, I, J, K, L, M, N, ERR>(
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
export function cast<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, ERR>(
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
export function cast<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, ERR>(
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
export function cast<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, ERR>(
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
export function cast<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, ERR>(
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
 * Implementation function for cast that processes any number of functions.
 */
export function cast(
  value: unknown,
  ...fns: ReadonlyArray<ChainFn>
): Result<unknown, InvalidError> {
  return fns.reduce((acc: Result<unknown, InvalidError>, fn: ChainFn) => {
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
    const prevError = acc.content.sibling.length > 0 ? [] : [acc.content];
    const sibling = [
      ...prevError,
      ...acc.content.sibling,
      currentResult.content,
    ];
    return err(new InvalidError({ message: "Validation failed", sibling }));
  }, ok<unknown>(value));
}

const convUnknownToInvalidError = (e: unknown): Result<never, InvalidError> =>
  err(
    new InvalidError({
      message: "Validation failed",
      parent: e instanceof Error ? e : new Error(String(e)),
    }),
  );

/**
 * Function type for cast operations.
 * Represents a function that takes any value and returns a Result.
 */
type ChainFn = (a: unknown) => Result<unknown, InvalidError>;
