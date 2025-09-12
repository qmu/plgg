import {
  Obj,
  RawObj,
  Result,
  InvalidError,
  Option,
  isObj,
  isRawObj,
  chainResult,
  pipe,
  newOk,
  newErr,
  newSome,
  newNone,
} from "plgg/index";

/**
 * Union type representing all record-like types in the system.
 */
export type ObjLike = Obj | RawObj;

/**
 * Type predicate to determine if a type is record-like.
 */
export type IsObjLike<T> = [T] extends [ObjLike]
  ? true
  : false;

/**
 * Runtime type guard to check if a value is record-like.
 */
export const isObjLike = (
  value: unknown,
): value is ObjLike =>
  isObj(value) || isRawObj(value);

/**
 * Validates and transforms an record property using a predicate.
 */
export const forProp =
  <T extends string, U>(
    key: T,
    predicate: (
      a: unknown,
    ) => Result<U, InvalidError>,
  ) =>
  <V extends object>(
    rec: V,
  ): Result<V & Record<T, U>, InvalidError> =>
    hasProp(rec, key)
      ? pipe(
          rec[key],
          predicate,
          chainResult(
            (
              okValue,
            ): Result<
              V & Record<T, U>,
              InvalidError
            > =>
              newOk({ ...rec, [key]: okValue }),
          ),
        )
      : newErr(
          new InvalidError({
            message: `Property '${key}' not found`,
          }),
        );

/**
 * Validates optional record property with predicate.
 */
export const forOptionProp =
  <T extends string, U>(
    key: T,
    predicate: (
      a: unknown,
    ) => Result<U, InvalidError>,
  ) =>
  <V extends object>(
    rec: V,
  ): Result<
    V & Record<T, Option<U>>,
    InvalidError
  > =>
    hasProp(rec, key)
      ? pipe(
          rec[key],
          predicate,
          chainResult(
            (
              okValue,
            ): Result<
              V & Record<T, Option<U>>,
              InvalidError
            > =>
              newOk({
                ...rec,
                [key]: newSome(okValue),
              }),
          ),
        )
      : newOk({ ...rec, [key]: newNone() } as V &
          Record<T, Option<U>>);

/**
 * Type guard for record field existence.
 */
export const hasProp = <K extends string>(
  value: object,
  key: K,
): value is Record<K, unknown> => key in value;
