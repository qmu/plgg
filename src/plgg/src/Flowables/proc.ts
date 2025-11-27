import {
  Procedural,
  Exception,
  Result,
  Ok,
  Err,
  NonNeverFn,
  isOk,
  err,
  ok,
  isPlggError,
  isResult,
} from "plgg/index";

/**
 * Extracts the success type from a Procedural return type.
 * Handles: T, Result<T, E>, Promise<T>, Promise<Result<T, E>>
 */
type UnwrapProcedural<T> =
  T extends Promise<infer U>
    ? UnwrapProcedural<U>
    : T extends Ok<infer V>
      ? V
      : T extends Err<unknown>
        ? never
        : T extends Result<infer V, unknown>
          ? V
          : T;

/**
 * Async function composition for Procedural types.
 */
export function proc<A, B>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
): Promise<Result<UnwrapProcedural<B>, Error>>;
export function proc<A, B, C>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
): Promise<Result<UnwrapProcedural<C>, Error>>;
export function proc<A, B, C, D>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
): Promise<Result<UnwrapProcedural<D>, Error>>;
export function proc<A, B, C, D, E>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
): Promise<Result<UnwrapProcedural<E>, Error>>;
export function proc<A, B, C, D, E, F>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
): Promise<Result<UnwrapProcedural<F>, Error>>;
export function proc<A, B, C, D, E, F, G>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
): Promise<Result<UnwrapProcedural<G>, Error>>;
export function proc<A, B, C, D, E, F, G, H>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
): Promise<Result<UnwrapProcedural<H>, Error>>;
export function proc<A, B, C, D, E, F, G, H, I>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
): Promise<Result<UnwrapProcedural<I>, Error>>;
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
>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
  ij: NonNeverFn<
    (i: UnwrapProcedural<I>) => Procedural<J>
  >,
): Promise<Result<UnwrapProcedural<J>, Error>>;
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
>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
  ij: NonNeverFn<
    (i: UnwrapProcedural<I>) => Procedural<J>
  >,
  jk: NonNeverFn<
    (j: UnwrapProcedural<J>) => Procedural<K>
  >,
): Promise<Result<UnwrapProcedural<K>, Error>>;
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
>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
  ij: NonNeverFn<
    (i: UnwrapProcedural<I>) => Procedural<J>
  >,
  jk: NonNeverFn<
    (j: UnwrapProcedural<J>) => Procedural<K>
  >,
  kl: NonNeverFn<
    (k: UnwrapProcedural<K>) => Procedural<L>
  >,
): Promise<Result<UnwrapProcedural<L>, Error>>;
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
>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
  ij: NonNeverFn<
    (i: UnwrapProcedural<I>) => Procedural<J>
  >,
  jk: NonNeverFn<
    (j: UnwrapProcedural<J>) => Procedural<K>
  >,
  kl: NonNeverFn<
    (k: UnwrapProcedural<K>) => Procedural<L>
  >,
  lm: NonNeverFn<
    (l: UnwrapProcedural<L>) => Procedural<M>
  >,
): Promise<Result<UnwrapProcedural<M>, Error>>;
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
>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
  ij: NonNeverFn<
    (i: UnwrapProcedural<I>) => Procedural<J>
  >,
  jk: NonNeverFn<
    (j: UnwrapProcedural<J>) => Procedural<K>
  >,
  kl: NonNeverFn<
    (k: UnwrapProcedural<K>) => Procedural<L>
  >,
  lm: NonNeverFn<
    (l: UnwrapProcedural<L>) => Procedural<M>
  >,
  mn: NonNeverFn<
    (m: UnwrapProcedural<M>) => Procedural<N>
  >,
): Promise<Result<UnwrapProcedural<N>, Error>>;
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
>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
  ij: NonNeverFn<
    (i: UnwrapProcedural<I>) => Procedural<J>
  >,
  jk: NonNeverFn<
    (j: UnwrapProcedural<J>) => Procedural<K>
  >,
  kl: NonNeverFn<
    (k: UnwrapProcedural<K>) => Procedural<L>
  >,
  lm: NonNeverFn<
    (l: UnwrapProcedural<L>) => Procedural<M>
  >,
  mn: NonNeverFn<
    (m: UnwrapProcedural<M>) => Procedural<N>
  >,
  no: NonNeverFn<
    (n: UnwrapProcedural<N>) => Procedural<O>
  >,
): Promise<Result<UnwrapProcedural<O>, Error>>;
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
>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
  ij: NonNeverFn<
    (i: UnwrapProcedural<I>) => Procedural<J>
  >,
  jk: NonNeverFn<
    (j: UnwrapProcedural<J>) => Procedural<K>
  >,
  kl: NonNeverFn<
    (k: UnwrapProcedural<K>) => Procedural<L>
  >,
  lm: NonNeverFn<
    (l: UnwrapProcedural<L>) => Procedural<M>
  >,
  mn: NonNeverFn<
    (m: UnwrapProcedural<M>) => Procedural<N>
  >,
  no: NonNeverFn<
    (n: UnwrapProcedural<N>) => Procedural<O>
  >,
  op: NonNeverFn<
    (o: UnwrapProcedural<O>) => Procedural<P>
  >,
): Promise<Result<UnwrapProcedural<P>, Error>>;
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
>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
  ij: NonNeverFn<
    (i: UnwrapProcedural<I>) => Procedural<J>
  >,
  jk: NonNeverFn<
    (j: UnwrapProcedural<J>) => Procedural<K>
  >,
  kl: NonNeverFn<
    (k: UnwrapProcedural<K>) => Procedural<L>
  >,
  lm: NonNeverFn<
    (l: UnwrapProcedural<L>) => Procedural<M>
  >,
  mn: NonNeverFn<
    (m: UnwrapProcedural<M>) => Procedural<N>
  >,
  no: NonNeverFn<
    (n: UnwrapProcedural<N>) => Procedural<O>
  >,
  op: NonNeverFn<
    (o: UnwrapProcedural<O>) => Procedural<P>
  >,
  pq: NonNeverFn<
    (p: UnwrapProcedural<P>) => Procedural<Q>
  >,
): Promise<Result<UnwrapProcedural<Q>, Error>>;
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
>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
  ij: NonNeverFn<
    (i: UnwrapProcedural<I>) => Procedural<J>
  >,
  jk: NonNeverFn<
    (j: UnwrapProcedural<J>) => Procedural<K>
  >,
  kl: NonNeverFn<
    (k: UnwrapProcedural<K>) => Procedural<L>
  >,
  lm: NonNeverFn<
    (l: UnwrapProcedural<L>) => Procedural<M>
  >,
  mn: NonNeverFn<
    (m: UnwrapProcedural<M>) => Procedural<N>
  >,
  no: NonNeverFn<
    (n: UnwrapProcedural<N>) => Procedural<O>
  >,
  op: NonNeverFn<
    (o: UnwrapProcedural<O>) => Procedural<P>
  >,
  pq: NonNeverFn<
    (p: UnwrapProcedural<P>) => Procedural<Q>
  >,
  qr: NonNeverFn<
    (q: UnwrapProcedural<Q>) => Procedural<R>
  >,
): Promise<Result<UnwrapProcedural<R>, Error>>;
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
>(
  a: A,
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
  ij: NonNeverFn<
    (i: UnwrapProcedural<I>) => Procedural<J>
  >,
  jk: NonNeverFn<
    (j: UnwrapProcedural<J>) => Procedural<K>
  >,
  kl: NonNeverFn<
    (k: UnwrapProcedural<K>) => Procedural<L>
  >,
  lm: NonNeverFn<
    (l: UnwrapProcedural<L>) => Procedural<M>
  >,
  mn: NonNeverFn<
    (m: UnwrapProcedural<M>) => Procedural<N>
  >,
  no: NonNeverFn<
    (n: UnwrapProcedural<N>) => Procedural<O>
  >,
  op: NonNeverFn<
    (o: UnwrapProcedural<O>) => Procedural<P>
  >,
  pq: NonNeverFn<
    (p: UnwrapProcedural<P>) => Procedural<Q>
  >,
  qr: NonNeverFn<
    (q: UnwrapProcedural<Q>) => Procedural<R>
  >,
  rs: NonNeverFn<
    (r: UnwrapProcedural<R>) => Procedural<S>
  >,
): Promise<Result<UnwrapProcedural<S>, Error>>;
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
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
  ij: NonNeverFn<
    (i: UnwrapProcedural<I>) => Procedural<J>
  >,
  jk: NonNeverFn<
    (j: UnwrapProcedural<J>) => Procedural<K>
  >,
  kl: NonNeverFn<
    (k: UnwrapProcedural<K>) => Procedural<L>
  >,
  lm: NonNeverFn<
    (l: UnwrapProcedural<L>) => Procedural<M>
  >,
  mn: NonNeverFn<
    (m: UnwrapProcedural<M>) => Procedural<N>
  >,
  no: NonNeverFn<
    (n: UnwrapProcedural<N>) => Procedural<O>
  >,
  op: NonNeverFn<
    (o: UnwrapProcedural<O>) => Procedural<P>
  >,
  pq: NonNeverFn<
    (p: UnwrapProcedural<P>) => Procedural<Q>
  >,
  qr: NonNeverFn<
    (q: UnwrapProcedural<Q>) => Procedural<R>
  >,
  rs: NonNeverFn<
    (r: UnwrapProcedural<R>) => Procedural<S>
  >,
  st: NonNeverFn<
    (s: UnwrapProcedural<S>) => Procedural<T>
  >,
): Promise<Result<UnwrapProcedural<T>, Error>>;
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
  ab: NonNeverFn<
    (a: UnwrapProcedural<A>) => Procedural<B>
  >,
  bc: NonNeverFn<
    (b: UnwrapProcedural<B>) => Procedural<C>
  >,
  cd: NonNeverFn<
    (c: UnwrapProcedural<C>) => Procedural<D>
  >,
  de: NonNeverFn<
    (d: UnwrapProcedural<D>) => Procedural<E>
  >,
  ef: NonNeverFn<
    (e: UnwrapProcedural<E>) => Procedural<F>
  >,
  fg: NonNeverFn<
    (f: UnwrapProcedural<F>) => Procedural<G>
  >,
  gh: NonNeverFn<
    (g: UnwrapProcedural<G>) => Procedural<H>
  >,
  hi: NonNeverFn<
    (h: UnwrapProcedural<H>) => Procedural<I>
  >,
  ij: NonNeverFn<
    (i: UnwrapProcedural<I>) => Procedural<J>
  >,
  jk: NonNeverFn<
    (j: UnwrapProcedural<J>) => Procedural<K>
  >,
  kl: NonNeverFn<
    (k: UnwrapProcedural<K>) => Procedural<L>
  >,
  lm: NonNeverFn<
    (l: UnwrapProcedural<L>) => Procedural<M>
  >,
  mn: NonNeverFn<
    (m: UnwrapProcedural<M>) => Procedural<N>
  >,
  no: NonNeverFn<
    (n: UnwrapProcedural<N>) => Procedural<O>
  >,
  op: NonNeverFn<
    (o: UnwrapProcedural<O>) => Procedural<P>
  >,
  pq: NonNeverFn<
    (p: UnwrapProcedural<P>) => Procedural<Q>
  >,
  qr: NonNeverFn<
    (q: UnwrapProcedural<Q>) => Procedural<R>
  >,
  rs: NonNeverFn<
    (r: UnwrapProcedural<R>) => Procedural<S>
  >,
  st: NonNeverFn<
    (s: UnwrapProcedural<S>) => Procedural<T>
  >,
  tu: NonNeverFn<
    (t: UnwrapProcedural<T>) => Procedural<U>
  >,
): Promise<Result<UnwrapProcedural<U>, Error>>;

/**
 * Implementation function that chains Procedural-returning functions.
 */
export async function proc(
  value: unknown,
  ...fns: ReadonlyArray<ChainFn>
): Promise<Result<unknown, unknown>> {
  // If initial value is already a Result, use it directly
  // Otherwise wrap it in Ok
  const initialValue = isResult(value)
    ? value
    : ok(value);
  const result = await fns.reduce(
    async (
      acc: Procedural<unknown>,
      fn: ChainFn,
    ) => {
      try {
        const current = await acc;
        if (isResult(current)) {
          return isOk(current)
            ? fn(current.content)
            : current;
        }
        return fn(current);
      } catch (e: unknown) {
        return isPlggError(e)
          ? err(e)
          : e instanceof Error
            ? err(
                new Exception(
                  "Unexpected error in proc",
                  e,
                ),
              )
            : err(
                new Exception(
                  "Unknown error in proc",
                ),
              );
      }
    },
    Promise.resolve(initialValue),
  );
  if (isResult(result)) {
    return result;
  }
  return ok(result);
}

/**
 * Function type for proc operations.
 */
type ChainFn = (
  a: unknown,
) => Procedural<unknown>;
