import {
  isOk,
  err,
  ok,
  Procedural,
  isPlggError,
  Exception,
  isResult,
  Result,
  NonNeverFn,
} from "plgg/index";

/**
 * Async function composition with error short-circuiting for Procedural types.
 * Chains functions that return Procedural values, stopping on first error.
 * Unlike cast (synchronous), this handles async operations and stops on first error.
 *
 * @param a - Initial value to process
 * @param ab - Function to transform A to Procedural<B>
 * @returns Promise resolving to Result containing final value or error
 * @example
 * const result = await plgg(
 *   "123",
 *   async (s) => ok(parseInt(s)),
 *   async (n) => n > 0 ? ok(n * 2) : err(new Error("Invalid"))
 * ); // Promise<Result<number, Error>>
 */
export function proc<A, B>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
): Promise<Result<B, Error>>;
export function proc<A, B, C>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
): Promise<Result<C, Error>>;
export function proc<A, B, C, D>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
): Promise<Result<D, Error>>;
export function proc<A, B, C, D, E>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
): Promise<Result<E, Error>>;
export function proc<A, B, C, D, E, F>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
): Promise<Result<F, Error>>;
export function proc<A, B, C, D, E, F, G>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
): Promise<Result<G, Error>>;
export function proc<A, B, C, D, E, F, G, H>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
): Promise<Result<H, Error>>;
export function proc<A, B, C, D, E, F, G, H, I>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
): Promise<Result<I, Error>>;
export function proc<A, B, C, D, E, F, G, H, I, J>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
  ij: NonNeverFn<(i: I) => Procedural<J>>,
): Promise<Result<J, Error>>;
export function proc<A, B, C, D, E, F, G, H, I, J, K>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
  ij: NonNeverFn<(i: I) => Procedural<J>>,
  jk: NonNeverFn<(j: J) => Procedural<K>>,
): Promise<Result<K, Error>>;
export function proc<A, B, C, D, E, F, G, H, I, J, K, L>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
  ij: NonNeverFn<(i: I) => Procedural<J>>,
  jk: NonNeverFn<(j: J) => Procedural<K>>,
  kl: NonNeverFn<(k: K) => Procedural<L>>,
): Promise<Result<L, Error>>;
export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
  ij: NonNeverFn<(i: I) => Procedural<J>>,
  jk: NonNeverFn<(j: J) => Procedural<K>>,
  kl: NonNeverFn<(k: K) => Procedural<L>>,
  lm: NonNeverFn<(l: L) => Procedural<M>>,
): Promise<Result<M, Error>>;
export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
  ij: NonNeverFn<(i: I) => Procedural<J>>,
  jk: NonNeverFn<(j: J) => Procedural<K>>,
  kl: NonNeverFn<(k: K) => Procedural<L>>,
  lm: NonNeverFn<(l: L) => Procedural<M>>,
  mn: NonNeverFn<(m: M) => Procedural<N>>,
): Promise<Result<N, Error>>;
export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
  ij: NonNeverFn<(i: I) => Procedural<J>>,
  jk: NonNeverFn<(j: J) => Procedural<K>>,
  kl: NonNeverFn<(k: K) => Procedural<L>>,
  lm: NonNeverFn<(l: L) => Procedural<M>>,
  mn: NonNeverFn<(m: M) => Procedural<N>>,
  no: NonNeverFn<(n: N) => Procedural<O>>,
): Promise<Result<O, Error>>;
export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
  ij: NonNeverFn<(i: I) => Procedural<J>>,
  jk: NonNeverFn<(j: J) => Procedural<K>>,
  kl: NonNeverFn<(k: K) => Procedural<L>>,
  lm: NonNeverFn<(l: L) => Procedural<M>>,
  mn: NonNeverFn<(m: M) => Procedural<N>>,
  no: NonNeverFn<(n: N) => Procedural<O>>,
  op: NonNeverFn<(o: O) => Procedural<P>>,
): Promise<Result<P, Error>>;
export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
  ij: NonNeverFn<(i: I) => Procedural<J>>,
  jk: NonNeverFn<(j: J) => Procedural<K>>,
  kl: NonNeverFn<(k: K) => Procedural<L>>,
  lm: NonNeverFn<(l: L) => Procedural<M>>,
  mn: NonNeverFn<(m: M) => Procedural<N>>,
  no: NonNeverFn<(n: N) => Procedural<O>>,
  op: NonNeverFn<(o: O) => Procedural<P>>,
  pq: NonNeverFn<(p: P) => Procedural<Q>>,
): Promise<Result<Q, Error>>;
export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
  ij: NonNeverFn<(i: I) => Procedural<J>>,
  jk: NonNeverFn<(j: J) => Procedural<K>>,
  kl: NonNeverFn<(k: K) => Procedural<L>>,
  lm: NonNeverFn<(l: L) => Procedural<M>>,
  mn: NonNeverFn<(m: M) => Procedural<N>>,
  no: NonNeverFn<(n: N) => Procedural<O>>,
  op: NonNeverFn<(o: O) => Procedural<P>>,
  pq: NonNeverFn<(p: P) => Procedural<Q>>,
  qr: NonNeverFn<(q: Q) => Procedural<R>>,
): Promise<Result<R, Error>>;
export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
  ij: NonNeverFn<(i: I) => Procedural<J>>,
  jk: NonNeverFn<(j: J) => Procedural<K>>,
  kl: NonNeverFn<(k: K) => Procedural<L>>,
  lm: NonNeverFn<(l: L) => Procedural<M>>,
  mn: NonNeverFn<(m: M) => Procedural<N>>,
  no: NonNeverFn<(n: N) => Procedural<O>>,
  op: NonNeverFn<(o: O) => Procedural<P>>,
  pq: NonNeverFn<(p: P) => Procedural<Q>>,
  qr: NonNeverFn<(q: Q) => Procedural<R>>,
  rs: NonNeverFn<(r: R) => Procedural<S>>,
): Promise<Result<S, Error>>;
export function proc<
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
>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
  ij: NonNeverFn<(i: I) => Procedural<J>>,
  jk: NonNeverFn<(j: J) => Procedural<K>>,
  kl: NonNeverFn<(k: K) => Procedural<L>>,
  lm: NonNeverFn<(l: L) => Procedural<M>>,
  mn: NonNeverFn<(m: M) => Procedural<N>>,
  no: NonNeverFn<(n: N) => Procedural<O>>,
  op: NonNeverFn<(o: O) => Procedural<P>>,
  pq: NonNeverFn<(p: P) => Procedural<Q>>,
  qr: NonNeverFn<(q: Q) => Procedural<R>>,
  rs: NonNeverFn<(r: R) => Procedural<S>>,
  st: NonNeverFn<(s: S) => Procedural<T>>,
): Promise<Result<T, Error>>;
export function proc<
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
>(
  a: A,
  ab: NonNeverFn<(a: A) => Procedural<B>>,
  bc: NonNeverFn<(b: B) => Procedural<C>>,
  cd: NonNeverFn<(c: C) => Procedural<D>>,
  de: NonNeverFn<(d: D) => Procedural<E>>,
  ef: NonNeverFn<(e: E) => Procedural<F>>,
  fg: NonNeverFn<(f: F) => Procedural<G>>,
  gh: NonNeverFn<(g: G) => Procedural<H>>,
  hi: NonNeverFn<(h: H) => Procedural<I>>,
  ij: NonNeverFn<(i: I) => Procedural<J>>,
  jk: NonNeverFn<(j: J) => Procedural<K>>,
  kl: NonNeverFn<(k: K) => Procedural<L>>,
  lm: NonNeverFn<(l: L) => Procedural<M>>,
  mn: NonNeverFn<(m: M) => Procedural<N>>,
  no: NonNeverFn<(n: N) => Procedural<O>>,
  op: NonNeverFn<(o: O) => Procedural<P>>,
  pq: NonNeverFn<(p: P) => Procedural<Q>>,
  qr: NonNeverFn<(q: Q) => Procedural<R>>,
  rs: NonNeverFn<(r: R) => Procedural<S>>,
  st: NonNeverFn<(s: S) => Procedural<T>>,
  tu: NonNeverFn<(t: T) => Procedural<U>>,
): Promise<Result<U, Error>>;

/**
 * Implementation function that chains any number of Procedural-returning functions.
 * Processes functions sequentially, stopping on first error.
 *
 * @param value - Initial value to process
 * @param fns - Array of functions that return Procedural values
 * @returns Promise resolving to Result with final value or first encountered error
 */
export async function proc(
  value: unknown,
  ...fns: ReadonlyArray<ChainFn>
): Promise<Result<unknown, unknown>> {
  const result = await fns.reduce(
    async (acc: Procedural<unknown>, fn: ChainFn) => {
      try {
        const current = await acc;
        if (isResult(current)) {
          return isOk(current) ? fn(current.content) : current;
        }
        return fn(current);
      } catch (e: unknown) {
        return isPlggError(e)
          ? err(e)
          : e instanceof Error
            ? err(new Exception("Unexpected error in proc", e))
            : err(new Exception("Unknown error in proc"));
      }
    },
    Promise.resolve(ok(value)),
  );
  if (isResult(result)) {
    return result;
  }
  return ok(result);
}

/**
 * Function type for plgg operations.
 * Represents a function that takes any value and returns a Procedural result.
 */
type ChainFn = (a: unknown) => Procedural<unknown>;
