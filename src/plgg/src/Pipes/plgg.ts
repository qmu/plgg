import {
  isOk,
  err,
  ok,
  Plggable,
  isPlggError,
  Exception,
  isResult,
  Result,
  NonNeverFn,
} from "plgg/index";

/**
 * Async function composition with error short-circuiting for Plggable types.
 * Chains functions that return Plggable values, stopping on first error.
 */
export function plgg<A, B>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
): Promise<Result<B, Error>>;
export function plgg<A, B, C>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
): Promise<Result<C, Error>>;
export function plgg<A, B, C, D>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
): Promise<Result<D, Error>>;
export function plgg<A, B, C, D, E>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
): Promise<Result<E, Error>>;
export function plgg<A, B, C, D, E, F>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
): Promise<Result<F, Error>>;
export function plgg<A, B, C, D, E, F, G>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
): Promise<Result<G, Error>>;
export function plgg<A, B, C, D, E, F, G, H>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
): Promise<Result<H, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
): Promise<Result<I, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
  ij: NonNeverFn<(i: I) => Plggable<J>>,
): Promise<Result<J, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
  ij: NonNeverFn<(i: I) => Plggable<J>>,
  jk: NonNeverFn<(j: J) => Plggable<K>>,
): Promise<Result<K, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
  ij: NonNeverFn<(i: I) => Plggable<J>>,
  jk: NonNeverFn<(j: J) => Plggable<K>>,
  kl: NonNeverFn<(k: K) => Plggable<L>>,
): Promise<Result<L, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
  ij: NonNeverFn<(i: I) => Plggable<J>>,
  jk: NonNeverFn<(j: J) => Plggable<K>>,
  kl: NonNeverFn<(k: K) => Plggable<L>>,
  lm: NonNeverFn<(l: L) => Plggable<M>>,
): Promise<Result<M, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
  ij: NonNeverFn<(i: I) => Plggable<J>>,
  jk: NonNeverFn<(j: J) => Plggable<K>>,
  kl: NonNeverFn<(k: K) => Plggable<L>>,
  lm: NonNeverFn<(l: L) => Plggable<M>>,
  mn: NonNeverFn<(m: M) => Plggable<N>>,
): Promise<Result<N, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
  ij: NonNeverFn<(i: I) => Plggable<J>>,
  jk: NonNeverFn<(j: J) => Plggable<K>>,
  kl: NonNeverFn<(k: K) => Plggable<L>>,
  lm: NonNeverFn<(l: L) => Plggable<M>>,
  mn: NonNeverFn<(m: M) => Plggable<N>>,
  no: NonNeverFn<(n: N) => Plggable<O>>,
): Promise<Result<O, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
  ij: NonNeverFn<(i: I) => Plggable<J>>,
  jk: NonNeverFn<(j: J) => Plggable<K>>,
  kl: NonNeverFn<(k: K) => Plggable<L>>,
  lm: NonNeverFn<(l: L) => Plggable<M>>,
  mn: NonNeverFn<(m: M) => Plggable<N>>,
  no: NonNeverFn<(n: N) => Plggable<O>>,
  op: NonNeverFn<(o: O) => Plggable<P>>,
): Promise<Result<P, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
  ij: NonNeverFn<(i: I) => Plggable<J>>,
  jk: NonNeverFn<(j: J) => Plggable<K>>,
  kl: NonNeverFn<(k: K) => Plggable<L>>,
  lm: NonNeverFn<(l: L) => Plggable<M>>,
  mn: NonNeverFn<(m: M) => Plggable<N>>,
  no: NonNeverFn<(n: N) => Plggable<O>>,
  op: NonNeverFn<(o: O) => Plggable<P>>,
  pq: NonNeverFn<(p: P) => Plggable<Q>>,
): Promise<Result<Q, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
  ij: NonNeverFn<(i: I) => Plggable<J>>,
  jk: NonNeverFn<(j: J) => Plggable<K>>,
  kl: NonNeverFn<(k: K) => Plggable<L>>,
  lm: NonNeverFn<(l: L) => Plggable<M>>,
  mn: NonNeverFn<(m: M) => Plggable<N>>,
  no: NonNeverFn<(n: N) => Plggable<O>>,
  op: NonNeverFn<(o: O) => Plggable<P>>,
  pq: NonNeverFn<(p: P) => Plggable<Q>>,
  qr: NonNeverFn<(q: Q) => Plggable<R>>,
): Promise<Result<R, Error>>;
export function plgg<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
  a: A,
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
  ij: NonNeverFn<(i: I) => Plggable<J>>,
  jk: NonNeverFn<(j: J) => Plggable<K>>,
  kl: NonNeverFn<(k: K) => Plggable<L>>,
  lm: NonNeverFn<(l: L) => Plggable<M>>,
  mn: NonNeverFn<(m: M) => Plggable<N>>,
  no: NonNeverFn<(n: N) => Plggable<O>>,
  op: NonNeverFn<(o: O) => Plggable<P>>,
  pq: NonNeverFn<(p: P) => Plggable<Q>>,
  qr: NonNeverFn<(q: Q) => Plggable<R>>,
  rs: NonNeverFn<(r: R) => Plggable<S>>,
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
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
  ij: NonNeverFn<(i: I) => Plggable<J>>,
  jk: NonNeverFn<(j: J) => Plggable<K>>,
  kl: NonNeverFn<(k: K) => Plggable<L>>,
  lm: NonNeverFn<(l: L) => Plggable<M>>,
  mn: NonNeverFn<(m: M) => Plggable<N>>,
  no: NonNeverFn<(n: N) => Plggable<O>>,
  op: NonNeverFn<(o: O) => Plggable<P>>,
  pq: NonNeverFn<(p: P) => Plggable<Q>>,
  qr: NonNeverFn<(q: Q) => Plggable<R>>,
  rs: NonNeverFn<(r: R) => Plggable<S>>,
  st: NonNeverFn<(s: S) => Plggable<T>>,
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
  ab: NonNeverFn<(a: A) => Plggable<B>>,
  bc: NonNeverFn<(b: B) => Plggable<C>>,
  cd: NonNeverFn<(c: C) => Plggable<D>>,
  de: NonNeverFn<(d: D) => Plggable<E>>,
  ef: NonNeverFn<(e: E) => Plggable<F>>,
  fg: NonNeverFn<(f: F) => Plggable<G>>,
  gh: NonNeverFn<(g: G) => Plggable<H>>,
  hi: NonNeverFn<(h: H) => Plggable<I>>,
  ij: NonNeverFn<(i: I) => Plggable<J>>,
  jk: NonNeverFn<(j: J) => Plggable<K>>,
  kl: NonNeverFn<(k: K) => Plggable<L>>,
  lm: NonNeverFn<(l: L) => Plggable<M>>,
  mn: NonNeverFn<(m: M) => Plggable<N>>,
  no: NonNeverFn<(n: N) => Plggable<O>>,
  op: NonNeverFn<(o: O) => Plggable<P>>,
  pq: NonNeverFn<(p: P) => Plggable<Q>>,
  qr: NonNeverFn<(q: Q) => Plggable<R>>,
  rs: NonNeverFn<(r: R) => Plggable<S>>,
  st: NonNeverFn<(s: S) => Plggable<T>>,
  tu: NonNeverFn<(t: T) => Plggable<U>>,
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
          return isOk(current) ? fn(current.content) : current;
        }
        return fn(current);
      } catch (e: unknown) {
        return isPlggError(e)
          ? err(e)
          : e instanceof Error
            ? err(new Exception("Unexpected error in plgg", e))
            : err(new Exception("Unknown error in plgg"));
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
