import {
  Result,
  newOk,
  newErr,
  InvalidError,
  Functor1Rec,
  Foldable1Rec,
  Traversable1Rec,
  Traverse1Rec,
  KindKeys1,
  Kind1,
  Applicative1,
  Refinable1Rec,
  Castable1Rec,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface KindKeytoKind1Rec<A> {
    Obj: Obj<A>;
  }
}

/**
 * Readonly record type for functional programming operations.
 */
export type Obj<
  T extends Record<string, unknown> = Record<
    string,
    unknown
  >,
> = Readonly<T>;

/**
 * Type guard to check if a value is an Obj.
 */
const is = <T extends Record<string, unknown>>(
  value: unknown,
): value is Obj<T> =>
  typeof value === "object" && value !== null;

/**
 * Refinable instance for record type guards.
 */
export const recRefinable: Refinable1Rec<"Obj"> =
  {
    KindKey: "Obj",
    is,
  };
/**
 * Exported type guard function for record values.
 */
/**
 * Exported type guard function for record values.
 */
export const { is: isObj } = recRefinable;

/**
 * Castable instance for record safe casting.
 */
export const recCastable: Castable1Rec<"Obj"> = {
  KindKey: "Obj",
  as: <A extends Record<string, unknown>>(
    value: unknown,
  ): Result<Obj<A>, InvalidError> =>
    is<A>(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Not record",
          }),
        ),
};
/**
 * Exported safe casting function for record values.
 */
export const { as: asObj } = recCastable;

/**
 * Functor instance providing mapping operations over record values.
 */
export const recFunctor: Functor1Rec<"Obj"> = {
  KindKey: "Obj",
  map:
    <
      A extends Record<string, unknown>,
      B extends Record<string, unknown>,
    >(
      f: (a: A) => B,
    ) =>
    (fa: Obj<A>): Obj<B> =>
      f(fa),
};
/**
 * Exported mapping function for records.
 */
export const { map: mapObj } = recFunctor;

/**
 * Foldable instance providing fold operations for records.
 */
export const recFoldable: Foldable1Rec<"Obj"> = {
  KindKey: "Obj",
  foldr:
    <A extends Record<string, unknown>, B>(
      f: (a: A, b: B) => B,
    ) =>
    (initial: B) =>
    (fa: Obj<A>): B =>
      f(fa, initial),
  foldl:
    <A extends Record<string, unknown>, B>(
      f: (b: B, a: A) => B,
    ) =>
    (initial: B) =>
    (fa: Obj<A>): B =>
      f(initial, fa),
};
/**
 * Exported fold functions for records.
 */
export const {
  foldr: foldrObj,
  foldl: foldlObj,
} = recFoldable;

/**
 * Traversable instance providing structure-preserving traversal for records.
 */
export const recTraversable: Traversable1Rec<"Obj"> =
  {
    ...recFunctor,
    ...recFoldable,
    traverse: (<F extends KindKeys1>(
        A: Applicative1<F>,
      ) =>
      <A extends Record<string, unknown>, B>(
        f: (a: A) => Kind1<F, B>,
      ) =>
      (ta: Obj<A>): Kind1<F, Obj<A>> =>
        A.map(() => ta)(
          f(ta),
        )) as Traverse1Rec<"Obj">,
    sequence:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A extends Record<string, unknown>>(
        tfa: Obj<A>,
      ): Kind1<F, Obj<A>> =>
        A.of(tfa),
  };
/**
 * Exported traversal functions for records.
 */
export const {
  traverse: traverseObj,
  sequence: sequenceObj,
} = recTraversable;
