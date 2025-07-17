import {
  isOk,
  fail,
  ok,
  Procedural,
  isDomainError,
  Exception,
  isResult,
  Result,
} from "plgg/index";

/**
 * Async function composition with error short-circuiting for Procedural types.
 * Chains functions that return Procedural values, stopping on first error.
 */
/* prettier-ignore */ export function proc<A, B>(a: A, ab: (a: A) => Procedural<B>): Promise<Result<B,Error>>;
/* prettier-ignore */ export function proc<A, B, C>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>): Promise<Result<C, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>): Promise<Result<D, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>): Promise<Result<E, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>): Promise<Result<F, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>): Promise<Result<G, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>): Promise<Result<H, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>): Promise<Result<I, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I, J>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>): Promise<Result<J, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I, J, K>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>): Promise<Result<K, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I, J, K, L>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>): Promise<Result<L, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>): Promise<Result<M, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>): Promise<Result<N, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>): Promise<Result<O, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>, op: (o: O) => Procedural<P>): Promise<Result<P, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>, op: (o: O) => Procedural<P>, pq: (p: P) => Procedural<Q>): Promise<Result<Q, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>, op: (o: O) => Procedural<P>, pq: (p: P) => Procedural<Q>, qr: (q: Q) => Procedural<R>): Promise<Result<R, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>, op: (o: O) => Procedural<P>, pq: (p: P) => Procedural<Q>, qr: (q: Q) => Procedural<R>, rs: (r: R) => Procedural<S>): Promise<Result<S, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>, op: (o: O) => Procedural<P>, pq: (p: P) => Procedural<Q>, qr: (q: Q) => Procedural<R>, rs: (r: R) => Procedural<S>, st: (s: S) => Procedural<T>): Promise<Result<T, Error>>;
/* prettier-ignore */ export function proc<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>, op: (o: O) => Procedural<P>, pq: (p: P) => Procedural<Q>, qr: (q: Q) => Procedural<R>, rs: (r: R) => Procedural<S>, st: (s: S) => Procedural<T>, tu: (t: T) => Procedural<U>): Promise<Result<U, Error>>;

/*
 * Chains Result-returning functions with early error exit.
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
          return isOk(current) ? fn(current.ok) : current;
        }
        return fn(current);
      } catch (e: unknown) {
        return isDomainError(e)
          ? fail(e)
          : e instanceof Error
            ? fail(new Exception("Unexpected error in proc", e))
            : fail(new Exception("Unknown error in proc"));
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
 * Function type for chain operations.
 */
type ChainFn = (a: unknown) => Procedural<unknown>;
