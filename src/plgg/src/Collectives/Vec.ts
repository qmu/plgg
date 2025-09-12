import {
  Result,
  InvalidError,
  JsonSerializable,
  JsonReady,
  Datum,
  Refinable,
  Castable,
  FunctorDatum,
  FoldableDatum,
  newOk,
  newErr,
  isOk,
  isErr,
  toJsonReady,
  fromJsonReady,
  isJsonReady,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface MapKindDatum<A> {
    Vec: Vec<A>;
  }
}

/**
 * Readonly vector type providing immutable functional programming operations.
 */
export type Vec<A extends Datum = Datum> =
  ReadonlyArray<A>;

/**
 * Type guard to check if a value is a Vec.
 */
const is = (value: unknown): value is Vec =>
  Array.isArray(value);

/**
 * Refinable instance for vector type guards.
 */
export const vecRefinable: Refinable<Vec> = {
  is,
};
/**
 * Exported type guard function for vector values.
 */
export const { is: isVec } = vecRefinable;

/**
 * Castable instance for vector safe casting.
 */
export const vecCastable: Castable<Vec> = {
  as: (
    value: unknown,
  ): Result<Vec, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Value is not a vector",
          }),
        ),
};
/**
 * Exported safe casting function for vector values.
 */
export const { as: asVec } = vecCastable;

/**
 * Functor instance providing mapping operations over vector elements.
 */
export const vecFunctor: FunctorDatum<"Vec"> = {
  KindKey: "Vec",
  map:
    <T1 extends Datum, T2 extends Datum>(
      f: (a: T1) => T2,
    ) =>
    (fa: Vec<T1>): Vec<T2> =>
      fa.map(f),
};
/**
 * Exported mapping function for vectors.
 */
export const { map: mapVec } = vecFunctor;

/**
 * Foldable instance providing fold operations for vectors.
 */
export const vecFoldable: FoldableDatum<"Vec"> = {
  KindKey: "Vec",
  foldr:
    <A extends Datum, B>(f: (a: A, b: B) => B) =>
    (initial: B) =>
    (fa: Vec<A>): B =>
      fa.reduceRight(
        (acc, x) => f(x, acc),
        initial,
      ),
  foldl:
    <A extends Datum, B>(f: (b: B, a: A) => B) =>
    (initial: B) =>
    (fa: Vec<A>): B =>
      fa.reduce(f, initial),
};
/**
 * Exported fold functions for vectors.
 */
export const {
  foldr: foldrVec,
  foldl: foldlVec,
} = vecFoldable;

/**
 * Applies function to each element, collecting all results or errors.
 */
export const conclude =
  <
    T extends Datum,
    U extends Datum,
    F extends Datum,
  >(
    fn: (item: T) => Result<U, F>,
  ) =>
  (vec: Vec<T>): Result<Vec<U>, Vec<F>> =>
    vec
      .map(fn)
      .reduce<
        Result<Vec<U>, Vec<F>>
      >((acc, result) => (isOk(result) ? (isOk(acc) ? newOk([...acc.content, result.content]) : acc) : isErr(acc) ? newErr([...acc.content, result.content]) : newErr([result.content])), newOk([]));

// --------------------------------
// JsonReady
// --------------------------------

/**
 * Type representing a vector that is ready for JSON serialization.
 */
export type JsonReadyVec =
  ReadonlyArray<JsonReady>;

/**
 * Type guard to check if a value is a JsonReadyVec.
 */
export const isJsonReadyVec = (
  value: unknown,
): value is JsonReadyVec =>
  isVec(value) && value.every(isJsonReady);

/**
 * JsonSerializer instance for Vec values using Datum types.
 */
export const vecJsonSerializer: JsonSerializable<
  Vec,
  JsonReadyVec
> = {
  toJsonReady: (value: Vec): JsonReadyVec =>
    value.map(toJsonReady),
  fromJsonReady: (jsonReady: JsonReadyVec): Vec =>
    jsonReady.map(fromJsonReady),
};

/**
 * Exported JSON serialization functions for Vec values.
 */
export const {
  toJsonReady: toJsonReadyVec,
  fromJsonReady: fromJsonReadyVec,
} = vecJsonSerializer;
