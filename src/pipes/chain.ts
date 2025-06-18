import { isErr, isResult, ok, Procedural } from "plgg/index";

/**
 * Function type for chain operations.
 */
export type ChainFn = (a: unknown) => Procedural<unknown>;

/*
 * Result-aware function chaining with error short-circuiting.
 */
/* prettier-ignore */ export function chain<A, B>(a: A, ab: (a: A) => Procedural<B>): Procedural<B>;
/* prettier-ignore */ export function chain<A, B, C>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>): Procedural<C>;
/* prettier-ignore */ export function chain<A, B, C, D>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>): Procedural<D>;
/* prettier-ignore */ export function chain<A, B, C, D, E>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>): Procedural<E>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>): Procedural<F>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>): Procedural<G>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>): Procedural<H>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>): Procedural<I>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I, J>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>): Procedural<J>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I, J, K>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>): Procedural<K>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I, J, K, L>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>): Procedural<L>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I, J, K, L, M>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>): Procedural<M>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>): Procedural<N>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>): Procedural<O>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>, op: (o: O) => Procedural<P>): Procedural<P>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>, op: (o: O) => Procedural<P>, pq: (p: P) => Procedural<Q>): Procedural<Q>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>, op: (o: O) => Procedural<P>, pq: (p: P) => Procedural<Q>, qr: (q: Q) => Procedural<R>): Procedural<R>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>, op: (o: O) => Procedural<P>, pq: (p: P) => Procedural<Q>, qr: (q: Q) => Procedural<R>, rs: (r: R) => Procedural<S>): Procedural<S>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>, op: (o: O) => Procedural<P>, pq: (p: P) => Procedural<Q>, qr: (q: Q) => Procedural<R>, rs: (r: R) => Procedural<S>, st: (s: S) => Procedural<T>): Procedural<T>;
/* prettier-ignore */ export function chain<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(a: A, ab: (a: A) => Procedural<B>, bc: (b: B) => Procedural<C>, cd: (c: C) => Procedural<D>, de: (d: D) => Procedural<E>, ef: (e: E) => Procedural<F>, fg: (f: F) => Procedural<G>, gh: (g: G) => Procedural<H>, hi: (h: H) => Procedural<I>, ij: (i: I) => Procedural<J>, jk: (j: J) => Procedural<K>, kl: (k: K) => Procedural<L>, lm: (l: L) => Procedural<M>, mn: (m: M) => Procedural<N>, no: (n: N) => Procedural<O>, op: (o: O) => Procedural<P>, pq: (p: P) => Procedural<Q>, qr: (q: Q) => Procedural<R>, rs: (r: R) => Procedural<S>, st: (s: S) => Procedural<T>, tu: (t: T) => Procedural<U>): Procedural<U>;

/*
 * Chains Result-returning functions with early error exit.
 */
export function chain(
  value: unknown,
  ...fns: ReadonlyArray<ChainFn>
): Procedural<unknown> {
  return fns.reduce(
    async (acc: Procedural<unknown>, fn: ChainFn) => {
      const current = await acc;
      if (isErr(current)) {
        return current;
      }
      const currentValue = isResult(current) ? current.ok : current;
      return await fn(currentValue);
    },
    Promise.resolve(ok(value)),
  );
}
