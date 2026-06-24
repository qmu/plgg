import {
  Procedural,
  defect,
  Result,
  Ok,
  Err,
  NonNeverFn,
  isOk,
  err,
  ok,
  isPlggError,
  isResult,
  Defect,
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
 * Extracts the error type carried by a Procedural value's raw type.
 *
 * A step (or the seed) is Procedural<T, E> =
 * PossiblyPromise<PossiblyResult<T, E>>, a union whose bare-value arm
 * would collapse a naive inference to unknown. We instead infer the raw
 * type R and read E off only its Result arms: Awaited<R> flattens any
 * Promise, and because Result<T, E> = Ok<T> | Err<E>, distributing over
 * the resulting union lets the Err<infer E> arm recover E while the Ok and
 * bare-value arms yield never.
 */
type ProcErr<R> = ProcErrInner<Awaited<R>>;
type ProcErrInner<R> =
  R extends Err<infer E>
    ? E
    : R extends Ok<unknown>
      ? never
      : R extends Result<unknown, infer E>
        ? E
        : never;

/**
 * Async function composition for Procedural types. Variadic — a seed followed
 * by 2–19 steps (only the 2-argument arity is shown here; the higher arities
 * are equivalent).
 *
 * Each step (and the seed) is inferred at its raw type (A, RB, RC, ...) so
 * that both the success type (via UnwrapProcedural) and the precise error
 * type (via ProcErr) can be recovered. The result error channel is the
 * union of the seed's error, every step's error, and Defect, the bottom
 * for unexpected throws.
 */
export function proc<A, RB>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
): Promise<
  Result<
    UnwrapProcedural<RB>,
    ProcErr<A> | ProcErr<RB> | Defect
  >
>;
/** @internal */
export function proc<A, RB, RC>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
): Promise<
  Result<
    UnwrapProcedural<RC>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | Defect
  >
>;
/** @internal */
export function proc<A, RB, RC, RD>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
): Promise<
  Result<
    UnwrapProcedural<RD>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | Defect
  >
>;
/** @internal */
export function proc<A, RB, RC, RD, RE>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
): Promise<
  Result<
    UnwrapProcedural<RE>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | Defect
  >
>;
/** @internal */
export function proc<A, RB, RC, RD, RE, RF>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
): Promise<
  Result<
    UnwrapProcedural<RF>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | Defect
  >
>;
/** @internal */
export function proc<A, RB, RC, RD, RE, RF, RG>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
): Promise<
  Result<
    UnwrapProcedural<RG>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
): Promise<
  Result<
    UnwrapProcedural<RH>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
): Promise<
  Result<
    UnwrapProcedural<RI>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
  RJ,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
  ij: NonNeverFn<(i: UnwrapProcedural<RI>) => RJ>,
): Promise<
  Result<
    UnwrapProcedural<RJ>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | ProcErr<RJ>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
  RJ,
  RK,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
  ij: NonNeverFn<(i: UnwrapProcedural<RI>) => RJ>,
  jk: NonNeverFn<(j: UnwrapProcedural<RJ>) => RK>,
): Promise<
  Result<
    UnwrapProcedural<RK>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | ProcErr<RJ>
    | ProcErr<RK>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
  RJ,
  RK,
  RL,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
  ij: NonNeverFn<(i: UnwrapProcedural<RI>) => RJ>,
  jk: NonNeverFn<(j: UnwrapProcedural<RJ>) => RK>,
  kl: NonNeverFn<(k: UnwrapProcedural<RK>) => RL>,
): Promise<
  Result<
    UnwrapProcedural<RL>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | ProcErr<RJ>
    | ProcErr<RK>
    | ProcErr<RL>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
  RJ,
  RK,
  RL,
  RM,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
  ij: NonNeverFn<(i: UnwrapProcedural<RI>) => RJ>,
  jk: NonNeverFn<(j: UnwrapProcedural<RJ>) => RK>,
  kl: NonNeverFn<(k: UnwrapProcedural<RK>) => RL>,
  lm: NonNeverFn<(l: UnwrapProcedural<RL>) => RM>,
): Promise<
  Result<
    UnwrapProcedural<RM>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | ProcErr<RJ>
    | ProcErr<RK>
    | ProcErr<RL>
    | ProcErr<RM>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
  RJ,
  RK,
  RL,
  RM,
  RN,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
  ij: NonNeverFn<(i: UnwrapProcedural<RI>) => RJ>,
  jk: NonNeverFn<(j: UnwrapProcedural<RJ>) => RK>,
  kl: NonNeverFn<(k: UnwrapProcedural<RK>) => RL>,
  lm: NonNeverFn<(l: UnwrapProcedural<RL>) => RM>,
  mn: NonNeverFn<(m: UnwrapProcedural<RM>) => RN>,
): Promise<
  Result<
    UnwrapProcedural<RN>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | ProcErr<RJ>
    | ProcErr<RK>
    | ProcErr<RL>
    | ProcErr<RM>
    | ProcErr<RN>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
  RJ,
  RK,
  RL,
  RM,
  RN,
  RO,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
  ij: NonNeverFn<(i: UnwrapProcedural<RI>) => RJ>,
  jk: NonNeverFn<(j: UnwrapProcedural<RJ>) => RK>,
  kl: NonNeverFn<(k: UnwrapProcedural<RK>) => RL>,
  lm: NonNeverFn<(l: UnwrapProcedural<RL>) => RM>,
  mn: NonNeverFn<(m: UnwrapProcedural<RM>) => RN>,
  no: NonNeverFn<(n: UnwrapProcedural<RN>) => RO>,
): Promise<
  Result<
    UnwrapProcedural<RO>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | ProcErr<RJ>
    | ProcErr<RK>
    | ProcErr<RL>
    | ProcErr<RM>
    | ProcErr<RN>
    | ProcErr<RO>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
  RJ,
  RK,
  RL,
  RM,
  RN,
  RO,
  RP,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
  ij: NonNeverFn<(i: UnwrapProcedural<RI>) => RJ>,
  jk: NonNeverFn<(j: UnwrapProcedural<RJ>) => RK>,
  kl: NonNeverFn<(k: UnwrapProcedural<RK>) => RL>,
  lm: NonNeverFn<(l: UnwrapProcedural<RL>) => RM>,
  mn: NonNeverFn<(m: UnwrapProcedural<RM>) => RN>,
  no: NonNeverFn<(n: UnwrapProcedural<RN>) => RO>,
  op: NonNeverFn<(o: UnwrapProcedural<RO>) => RP>,
): Promise<
  Result<
    UnwrapProcedural<RP>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | ProcErr<RJ>
    | ProcErr<RK>
    | ProcErr<RL>
    | ProcErr<RM>
    | ProcErr<RN>
    | ProcErr<RO>
    | ProcErr<RP>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
  RJ,
  RK,
  RL,
  RM,
  RN,
  RO,
  RP,
  RQ,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
  ij: NonNeverFn<(i: UnwrapProcedural<RI>) => RJ>,
  jk: NonNeverFn<(j: UnwrapProcedural<RJ>) => RK>,
  kl: NonNeverFn<(k: UnwrapProcedural<RK>) => RL>,
  lm: NonNeverFn<(l: UnwrapProcedural<RL>) => RM>,
  mn: NonNeverFn<(m: UnwrapProcedural<RM>) => RN>,
  no: NonNeverFn<(n: UnwrapProcedural<RN>) => RO>,
  op: NonNeverFn<(o: UnwrapProcedural<RO>) => RP>,
  pq: NonNeverFn<(p: UnwrapProcedural<RP>) => RQ>,
): Promise<
  Result<
    UnwrapProcedural<RQ>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | ProcErr<RJ>
    | ProcErr<RK>
    | ProcErr<RL>
    | ProcErr<RM>
    | ProcErr<RN>
    | ProcErr<RO>
    | ProcErr<RP>
    | ProcErr<RQ>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
  RJ,
  RK,
  RL,
  RM,
  RN,
  RO,
  RP,
  RQ,
  RR,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
  ij: NonNeverFn<(i: UnwrapProcedural<RI>) => RJ>,
  jk: NonNeverFn<(j: UnwrapProcedural<RJ>) => RK>,
  kl: NonNeverFn<(k: UnwrapProcedural<RK>) => RL>,
  lm: NonNeverFn<(l: UnwrapProcedural<RL>) => RM>,
  mn: NonNeverFn<(m: UnwrapProcedural<RM>) => RN>,
  no: NonNeverFn<(n: UnwrapProcedural<RN>) => RO>,
  op: NonNeverFn<(o: UnwrapProcedural<RO>) => RP>,
  pq: NonNeverFn<(p: UnwrapProcedural<RP>) => RQ>,
  qr: NonNeverFn<(q: UnwrapProcedural<RQ>) => RR>,
): Promise<
  Result<
    UnwrapProcedural<RR>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | ProcErr<RJ>
    | ProcErr<RK>
    | ProcErr<RL>
    | ProcErr<RM>
    | ProcErr<RN>
    | ProcErr<RO>
    | ProcErr<RP>
    | ProcErr<RQ>
    | ProcErr<RR>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
  RJ,
  RK,
  RL,
  RM,
  RN,
  RO,
  RP,
  RQ,
  RR,
  RS,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
  ij: NonNeverFn<(i: UnwrapProcedural<RI>) => RJ>,
  jk: NonNeverFn<(j: UnwrapProcedural<RJ>) => RK>,
  kl: NonNeverFn<(k: UnwrapProcedural<RK>) => RL>,
  lm: NonNeverFn<(l: UnwrapProcedural<RL>) => RM>,
  mn: NonNeverFn<(m: UnwrapProcedural<RM>) => RN>,
  no: NonNeverFn<(n: UnwrapProcedural<RN>) => RO>,
  op: NonNeverFn<(o: UnwrapProcedural<RO>) => RP>,
  pq: NonNeverFn<(p: UnwrapProcedural<RP>) => RQ>,
  qr: NonNeverFn<(q: UnwrapProcedural<RQ>) => RR>,
  rs: NonNeverFn<(r: UnwrapProcedural<RR>) => RS>,
): Promise<
  Result<
    UnwrapProcedural<RS>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | ProcErr<RJ>
    | ProcErr<RK>
    | ProcErr<RL>
    | ProcErr<RM>
    | ProcErr<RN>
    | ProcErr<RO>
    | ProcErr<RP>
    | ProcErr<RQ>
    | ProcErr<RR>
    | ProcErr<RS>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
  RJ,
  RK,
  RL,
  RM,
  RN,
  RO,
  RP,
  RQ,
  RR,
  RS,
  RT,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
  ij: NonNeverFn<(i: UnwrapProcedural<RI>) => RJ>,
  jk: NonNeverFn<(j: UnwrapProcedural<RJ>) => RK>,
  kl: NonNeverFn<(k: UnwrapProcedural<RK>) => RL>,
  lm: NonNeverFn<(l: UnwrapProcedural<RL>) => RM>,
  mn: NonNeverFn<(m: UnwrapProcedural<RM>) => RN>,
  no: NonNeverFn<(n: UnwrapProcedural<RN>) => RO>,
  op: NonNeverFn<(o: UnwrapProcedural<RO>) => RP>,
  pq: NonNeverFn<(p: UnwrapProcedural<RP>) => RQ>,
  qr: NonNeverFn<(q: UnwrapProcedural<RQ>) => RR>,
  rs: NonNeverFn<(r: UnwrapProcedural<RR>) => RS>,
  st: NonNeverFn<(s: UnwrapProcedural<RS>) => RT>,
): Promise<
  Result<
    UnwrapProcedural<RT>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | ProcErr<RJ>
    | ProcErr<RK>
    | ProcErr<RL>
    | ProcErr<RM>
    | ProcErr<RN>
    | ProcErr<RO>
    | ProcErr<RP>
    | ProcErr<RQ>
    | ProcErr<RR>
    | ProcErr<RS>
    | ProcErr<RT>
    | Defect
  >
>;
/** @internal */
export function proc<
  A,
  RB,
  RC,
  RD,
  RE,
  RF,
  RG,
  RH,
  RI,
  RJ,
  RK,
  RL,
  RM,
  RN,
  RO,
  RP,
  RQ,
  RR,
  RS,
  RT,
  RU,
>(
  a: A,
  ab: NonNeverFn<(a: UnwrapProcedural<A>) => RB>,
  bc: NonNeverFn<(b: UnwrapProcedural<RB>) => RC>,
  cd: NonNeverFn<(c: UnwrapProcedural<RC>) => RD>,
  de: NonNeverFn<(d: UnwrapProcedural<RD>) => RE>,
  ef: NonNeverFn<(e: UnwrapProcedural<RE>) => RF>,
  fg: NonNeverFn<(f: UnwrapProcedural<RF>) => RG>,
  gh: NonNeverFn<(g: UnwrapProcedural<RG>) => RH>,
  hi: NonNeverFn<(h: UnwrapProcedural<RH>) => RI>,
  ij: NonNeverFn<(i: UnwrapProcedural<RI>) => RJ>,
  jk: NonNeverFn<(j: UnwrapProcedural<RJ>) => RK>,
  kl: NonNeverFn<(k: UnwrapProcedural<RK>) => RL>,
  lm: NonNeverFn<(l: UnwrapProcedural<RL>) => RM>,
  mn: NonNeverFn<(m: UnwrapProcedural<RM>) => RN>,
  no: NonNeverFn<(n: UnwrapProcedural<RN>) => RO>,
  op: NonNeverFn<(o: UnwrapProcedural<RO>) => RP>,
  pq: NonNeverFn<(p: UnwrapProcedural<RP>) => RQ>,
  qr: NonNeverFn<(q: UnwrapProcedural<RQ>) => RR>,
  rs: NonNeverFn<(r: UnwrapProcedural<RR>) => RS>,
  st: NonNeverFn<(s: UnwrapProcedural<RS>) => RT>,
  tu: NonNeverFn<(t: UnwrapProcedural<RT>) => RU>,
): Promise<
  Result<
    UnwrapProcedural<RU>,
    | ProcErr<A>
    | ProcErr<RB>
    | ProcErr<RC>
    | ProcErr<RD>
    | ProcErr<RE>
    | ProcErr<RF>
    | ProcErr<RG>
    | ProcErr<RH>
    | ProcErr<RI>
    | ProcErr<RJ>
    | ProcErr<RK>
    | ProcErr<RL>
    | ProcErr<RM>
    | ProcErr<RN>
    | ProcErr<RO>
    | ProcErr<RP>
    | ProcErr<RQ>
    | ProcErr<RR>
    | ProcErr<RS>
    | ProcErr<RT>
    | ProcErr<RU>
    | Defect
  >
>;

/**
 * Implementation function that chains Procedural-returning functions.
 */
export async function proc(
  value: unknown,
  ...fns: ReadonlyArray<ChainFn>
): Promise<Result<unknown, unknown>> {
  // Await the initial value if it's a Promise
  const resolvedValue = await value;
  // If initial value is already a Result, use it directly
  // Otherwise wrap it in Ok
  const initialValue = isResult(resolvedValue)
    ? resolvedValue
    : ok(resolvedValue);
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
        // A thrown plgg error keeps its identity; any other throw is an
        // unexpected defect (domain code returns `err(...)`, never throws).
        return isPlggError(e)
          ? err(e)
          : err(
              defect(
                "Unhandled throw in proc",
                e,
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
