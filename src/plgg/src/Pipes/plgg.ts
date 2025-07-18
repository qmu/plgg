import {
  isOk,
  fail,
  ok,
  Plggable,
  isDomainError,
  Exception,
  isResult,
  Result,
} from "plgg/index";

/**
 * Async function composition with error short-circuiting for Plggable types.
 * Chains functions that return Plggable values, stopping on first error.
 */
export function plgg<A, B>(
  a: A,
  ab: (a: A) => Plggable<B>,
): Promise<Result<B, Error>>;
export function plgg<A, B, C>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
): Promise<Result<C, Error>>;
export function plgg<A, B, C, D>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
): Promise<Result<D, Error>>;
export function plgg<A, B, C, D, E>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
): Promise<Result<E, Error>>;
export function plgg<A, B, C, D, E, F>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
): Promise<Result<F, Error>>;
export function plgg<A, B, C, D, E, F, G>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
): Promise<Result<G, Error>>;
export function plgg<A, B, C, D, E, F, G, H>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
): Promise<Result<H, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
): Promise<Result<I, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
  ij: (i: I) => Plggable<J>,
): Promise<Result<J, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
  ij: (i: I) => Plggable<J>,
  jk: (j: J) => Plggable<K>,
): Promise<Result<K, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
  ij: (i: I) => Plggable<J>,
  jk: (j: J) => Plggable<K>,
  kl: (k: K) => Plggable<L>,
): Promise<Result<L, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
  ij: (i: I) => Plggable<J>,
  jk: (j: J) => Plggable<K>,
  kl: (k: K) => Plggable<L>,
  lm: (l: L) => Plggable<M>,
): Promise<Result<M, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
  ij: (i: I) => Plggable<J>,
  jk: (j: J) => Plggable<K>,
  kl: (k: K) => Plggable<L>,
  lm: (l: L) => Plggable<M>,
  mn: (m: M) => Plggable<N>,
): Promise<Result<N, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
  ij: (i: I) => Plggable<J>,
  jk: (j: J) => Plggable<K>,
  kl: (k: K) => Plggable<L>,
  lm: (l: L) => Plggable<M>,
  mn: (m: M) => Plggable<N>,
  no: (n: N) => Plggable<O>,
): Promise<Result<O, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
  ij: (i: I) => Plggable<J>,
  jk: (j: J) => Plggable<K>,
  kl: (k: K) => Plggable<L>,
  lm: (l: L) => Plggable<M>,
  mn: (m: M) => Plggable<N>,
  no: (n: N) => Plggable<O>,
  op: (o: O) => Plggable<P>,
): Promise<Result<P, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
  ij: (i: I) => Plggable<J>,
  jk: (j: J) => Plggable<K>,
  kl: (k: K) => Plggable<L>,
  lm: (l: L) => Plggable<M>,
  mn: (m: M) => Plggable<N>,
  no: (n: N) => Plggable<O>,
  op: (o: O) => Plggable<P>,
  pq: (p: P) => Plggable<Q>,
): Promise<Result<Q, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
  ij: (i: I) => Plggable<J>,
  jk: (j: J) => Plggable<K>,
  kl: (k: K) => Plggable<L>,
  lm: (l: L) => Plggable<M>,
  mn: (m: M) => Plggable<N>,
  no: (n: N) => Plggable<O>,
  op: (o: O) => Plggable<P>,
  pq: (p: P) => Plggable<Q>,
  qr: (q: Q) => Plggable<R>,
): Promise<Result<R, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
  a: A,
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
  ij: (i: I) => Plggable<J>,
  jk: (j: J) => Plggable<K>,
  kl: (k: K) => Plggable<L>,
  lm: (l: L) => Plggable<M>,
  mn: (m: M) => Plggable<N>,
  no: (n: N) => Plggable<O>,
  op: (o: O) => Plggable<P>,
  pq: (p: P) => Plggable<Q>,
  qr: (q: Q) => Plggable<R>,
  rs: (r: R) => Plggable<S>,
): Promise<Result<S, Error>>;
export function plgg<
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
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
  ij: (i: I) => Plggable<J>,
  jk: (j: J) => Plggable<K>,
  kl: (k: K) => Plggable<L>,
  lm: (l: L) => Plggable<M>,
  mn: (m: M) => Plggable<N>,
  no: (n: N) => Plggable<O>,
  op: (o: O) => Plggable<P>,
  pq: (p: P) => Plggable<Q>,
  qr: (q: Q) => Plggable<R>,
  rs: (r: R) => Plggable<S>,
  st: (s: S) => Plggable<T>,
): Promise<Result<T, Error>>;
export function plgg<
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
  ab: (a: A) => Plggable<B>,
  bc: (b: B) => Plggable<C>,
  cd: (c: C) => Plggable<D>,
  de: (d: D) => Plggable<E>,
  ef: (e: E) => Plggable<F>,
  fg: (f: F) => Plggable<G>,
  gh: (g: G) => Plggable<H>,
  hi: (h: H) => Plggable<I>,
  ij: (i: I) => Plggable<J>,
  jk: (j: J) => Plggable<K>,
  kl: (k: K) => Plggable<L>,
  lm: (l: L) => Plggable<M>,
  mn: (m: M) => Plggable<N>,
  no: (n: N) => Plggable<O>,
  op: (o: O) => Plggable<P>,
  pq: (p: P) => Plggable<Q>,
  qr: (q: Q) => Plggable<R>,
  rs: (r: R) => Plggable<S>,
  st: (s: S) => Plggable<T>,
  tu: (t: T) => Plggable<U>,
): Promise<Result<U, Error>>;

/**
 * Chains Plggable-returning functions with early error exit.
 * Processes functions sequentially, stopping on first error.
 */
export async function plgg(
  value: unknown,
  ...fns: ReadonlyArray<ChainFn>
): Promise<Result<unknown, unknown>> {
  const result = await fns.reduce(
    async (acc: Plggable<unknown>, fn: ChainFn) => {
      try {
        const current = await acc;
        if (isResult(current)) {
          return isOk(current) ? fn(current.ok) : current;
        }
        return fn(current);
      } catch (e: unknown) {
        return isDomainError(e)
          ? fail(e)
          : e instanceof Error
            ? fail(new Exception("Unexpected error in plgg", e))
            : fail(new Exception("Unknown error in plgg"));
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
 */
type ChainFn = (a: unknown) => Plggable<unknown>;
