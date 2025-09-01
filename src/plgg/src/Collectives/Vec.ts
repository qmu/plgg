import {
  Result,
  newOk,
  newErr,
  isOk,
  isErr,
  InvalidError,
  JsonSerializer,
  JsonReady,
  JsonSerializable,
  Refinable1JsonSerializable,
  Castable1JsonSerializable,
  Functor1JsonSerializable,
  Foldable1JsonSerializable,
  toJsonReady,
  fromJsonReady,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface KindKeytoKind1JsonSerializable<
    A,
  > {
    Vec: Vec<A>;
  }
}

/**
 * Readonly vector type providing immutable functional programming operations.
 */
export type Vec<
  A extends JsonSerializable = JsonSerializable,
> = readonly A[];

export type JsonReadyVec = readonly JsonReady[];

export const isJsonReadyVec = (
  value: JsonReady,
): value is JsonReadyVec => Array.isArray(value);

/**
 * Type guard to check if a value is a Vec.
 */
const is = <T extends JsonSerializable>(
  value: unknown,
): value is Vec<T> => Array.isArray(value);

/**
 * Refinable instance for vector type guards.
 */
export const vecRefinable: Refinable1JsonSerializable<"Vec"> =
  {
    KindKey: "Vec",
    is,
  };
/**
 * Exported type guard function for vector values.
 */
export const { is: isVec } = vecRefinable;

/**
 * Castable instance for vector safe casting.
 */
export const vecCastable: Castable1JsonSerializable<"Vec"> =
  {
    KindKey: "Vec",
    as: <A extends JsonSerializable>(
      value: unknown,
    ): Result<Vec<A>, InvalidError> =>
      is<A>(value)
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
export const vecFunctor: Functor1JsonSerializable<"Vec"> =
  {
    KindKey: "Vec",
    map:
      <
        T1 extends JsonSerializable,
        T2 extends JsonSerializable,
      >(
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
export const vecFoldable: Foldable1JsonSerializable<"Vec"> =
  {
    KindKey: "Vec",
    foldr:
      <A extends JsonSerializable, B>(
        f: (a: A, b: B) => B,
      ) =>
      (initial: B) =>
      (fa: Vec<A>): B =>
        fa.reduceRight(
          (acc, x) => f(x, acc),
          initial,
        ),
    foldl:
      <A extends JsonSerializable, B>(
        f: (b: B, a: A) => B,
      ) =>
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
    T extends JsonSerializable,
    U extends JsonSerializable,
    F extends JsonSerializable,
  >(
    fn: (item: T) => Result<U, F>,
  ) =>
  (vec: Vec<T>): Result<Vec<U>, Vec<F>> =>
    vec
      .map(fn)
      .reduce<
        Result<Vec<U>, Vec<F>>
      >((acc, result) => (isOk(result) ? (isOk(acc) ? newOk([...acc.body, result.body]) : acc) : isErr(acc) ? newErr([...acc.body, result.body]) : newErr([result.body])), newOk([]));

/**
 * JsonSerializer instance for Vec values.
 */
export const vecJsonSerializer: JsonSerializer<
  Vec,
  JsonReadyVec
> = {
  toJsonReady: (value: Vec): JsonReadyVec =>
    value.map(toJsonReady),
  fromJsonReady: (jsonReady: JsonReadyVec): Vec =>
    jsonReady.map(fromJsonReady),
};

export const {
  toJsonReady: toJsonReadyVec,
  fromJsonReady: fromJsonReadyVec,
} = vecJsonSerializer;
