import { isOk, ok, Result, ValidationError, err } from "plgg/index";

/*
 * Result-aware function chaining with error short-circuiting.
 */
/* prettier-ignore */ export function validate<A, B, ERR>(a: A, ab: (a: A) => Result<B,ERR>): Result<B, ERR>;
/* prettier-ignore */ export function validate<A, B, C, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>): Result<C, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>): Result<D, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>): Result<E, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>): Result<F, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>): Result<G, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>): Result<H, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>): Result<I, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, J, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>, ij: (i: I) => Result<J, ERR>): Result<J, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, J, K, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>, ij: (i: I) => Result<J, ERR>, jk: (j: J) => Result<K, ERR>): Result<K, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, J, K, L, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>, ij: (i: I) => Result<J, ERR>, jk: (j: J) => Result<K, ERR>, kl: (k: K) => Result<L, ERR>): Result<L, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, J, K, L, M, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>, ij: (i: I) => Result<J, ERR>, jk: (j: J) => Result<K, ERR>, kl: (k: K) => Result<L, ERR>, lm: (l: L) => Result<M, ERR>): Result<M, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, J, K, L, M, N, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>, ij: (i: I) => Result<J, ERR>, jk: (j: J) => Result<K, ERR>, kl: (k: K) => Result<L, ERR>, lm: (l: L) => Result<M, ERR>, mn: (m: M) => Result<N, ERR>): Result<N, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>, ij: (i: I) => Result<J, ERR>, jk: (j: J) => Result<K, ERR>, kl: (k: K) => Result<L, ERR>, lm: (l: L) => Result<M, ERR>, mn: (m: M) => Result<N, ERR>, no: (n: N) => Result<O, ERR>): Result<O, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>, ij: (i: I) => Result<J, ERR>, jk: (j: J) => Result<K, ERR>, kl: (k: K) => Result<L, ERR>, lm: (l: L) => Result<M, ERR>, mn: (m: M) => Result<N, ERR>, no: (n: N) => Result<O, ERR>, op: (o: O) => Result<P, ERR>): Result<P, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>, ij: (i: I) => Result<J, ERR>, jk: (j: J) => Result<K, ERR>, kl: (k: K) => Result<L, ERR>, lm: (l: L) => Result<M, ERR>, mn: (m: M) => Result<N, ERR>, no: (n: N) => Result<O, ERR>, op: (o: O) => Result<P, ERR>, pq: (p: P) => Result<Q, ERR>): Result<Q, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>, ij: (i: I) => Result<J, ERR>, jk: (j: J) => Result<K, ERR>, kl: (k: K) => Result<L, ERR>, lm: (l: L) => Result<M, ERR>, mn: (m: M) => Result<N, ERR>, no: (n: N) => Result<O, ERR>, op: (o: O) => Result<P, ERR>, pq: (p: P) => Result<Q, ERR>, qr: (q: Q) => Result<R, ERR>): Result<R, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>, ij: (i: I) => Result<J, ERR>, jk: (j: J) => Result<K, ERR>, kl: (k: K) => Result<L, ERR>, lm: (l: L) => Result<M, ERR>, mn: (m: M) => Result<N, ERR>, no: (n: N) => Result<O, ERR>, op: (o: O) => Result<P, ERR>, pq: (p: P) => Result<Q, ERR>, qr: (q: Q) => Result<R, ERR>, rs: (r: R) => Result<S, ERR>): Result<S, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>, ij: (i: I) => Result<J, ERR>, jk: (j: J) => Result<K, ERR>, kl: (k: K) => Result<L, ERR>, lm: (l: L) => Result<M, ERR>, mn: (m: M) => Result<N, ERR>, no: (n: N) => Result<O, ERR>, op: (o: O) => Result<P, ERR>, pq: (p: P) => Result<Q, ERR>, qr: (q: Q) => Result<R, ERR>, rs: (r: R) => Result<S, ERR>, st: (s: S) => Result<T, ERR>): Result<T, ERR>;
/* prettier-ignore */ export function validate<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, ERR>(a: A, ab: (a: A) => Result<B, ERR>, bc: (b: B) => Result<C, ERR>, cd: (c: C) => Result<D, ERR>, de: (d: D) => Result<E, ERR>, ef: (e: E) => Result<F, ERR>, fg: (f: F) => Result<G, ERR>, gh: (g: G) => Result<H, ERR>, hi: (h: H) => Result<I, ERR>, ij: (i: I) => Result<J, ERR>, jk: (j: J) => Result<K, ERR>, kl: (k: K) => Result<L, ERR>, lm: (l: L) => Result<M, ERR>, mn: (m: M) => Result<N, ERR>, no: (n: N) => Result<O, ERR>, op: (o: O) => Result<P, ERR>, pq: (p: P) => Result<Q, ERR>, qr: (q: Q) => Result<R, ERR>, rs: (r: R) => Result<S, ERR>, st: (s: S) => Result<T, ERR>, tu: (t: T) => Result<U, ERR>): Result<U, ERR>;

/*
 * Chains Result-returning functions with early error exit.
 */
export function validate(
  value: unknown,
  ...fns: ReadonlyArray<ChainFn>
): Result<unknown, ValidationError> {
  return fns.reduce((acc: Result<unknown, ValidationError>, fn: ChainFn) => {
    if (isOk(acc)) {
      try {
        return fn(acc.ok);
      } catch (e) {
        return convUnknownToValidationError(e);
      }
    }
    const currentResult = (() => {
      try {
        return fn(value);
      } catch (e) {
        return convUnknownToValidationError(e);
      }
    })();
    if (isOk(currentResult)) {
      return err(acc.err);
    }
    const prevError = acc.err.sibling.length > 0 ? [] : [acc.err];
    const sibling = [...prevError, ...acc.err.sibling, currentResult.err];
    return err(new ValidationError({ message: "Validation failed", sibling }));
  }, ok(value));
}

const convUnknownToValidationError = (
  e: unknown,
): Result<never, ValidationError> =>
  err(
    new ValidationError({
      message: "Validation failed",
      parent: e instanceof Error ? e : new Error(String(e)),
    }),
  );
1;

/**
 * Function type for chain operations.
 */
type ChainFn = (a: unknown) => Result<unknown, ValidationError>;
