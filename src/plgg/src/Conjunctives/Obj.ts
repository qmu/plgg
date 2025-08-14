import {
  Result,
  ok,
  err,
  InvalidError,
  Option,
  some,
  none,
  pipe,
  chainResult,
} from "plgg/index";

/**
 * Object type with primitive values.
 * Readonly record with string keys and unknown values.
 */
export type Obj<
  T extends Record<string, unknown> = Record<
    string,
    unknown
  >,
> = Readonly<T>;

/**
 * Basic type guard for object without constraints.
 */
export const isObj = (
  value: unknown,
): value is Obj =>
  typeof value === "object" && value !== null;

/**
 * Validates and casts to object with primitives.
 */
export const asObj = (
  value: unknown,
): Result<Obj, InvalidError> =>
  isObj(value)
    ? ok(value)
    : err(
        new InvalidError({
          message: "Not object",
        }),
      );

/**
 * Validates and transforms an object property using a predicate.
 */
export const forProp =
  <T extends string, U>(
    key: T,
    predicate: (
      a: unknown,
    ) => Result<U, InvalidError>,
  ) =>
  <V extends object>(
    obj: V,
  ): Result<V & Record<T, U>, InvalidError> =>
    hasProp(obj, key)
      ? pipe(
          obj[key],
          predicate,
          chainResult(
            (
              okValue,
            ): Result<
              V & Record<T, U>,
              InvalidError
            > => ok({ ...obj, [key]: okValue }),
          ),
        )
      : err(
          new InvalidError({
            message: `Property '${key}' not found`,
          }),
        );

/**
 * Validates optional object property with predicate.
 */
export const forOptionProp =
  <T extends string, U>(
    key: T,
    predicate: (
      a: unknown,
    ) => Result<U, InvalidError>,
  ) =>
  <V extends object>(
    obj: V,
  ): Result<
    V & Record<T, Option<U>>,
    InvalidError
  > =>
    hasProp(obj, key)
      ? pipe(
          obj[key],
          predicate,
          chainResult(
            (
              okValue,
            ): Result<
              V & Record<T, Option<U>>,
              InvalidError
            > =>
              ok({
                ...obj,
                [key]: some(okValue),
              }),
          ),
        )
      : ok({ ...obj, [key]: none() } as V &
          Record<T, Option<U>>);

/**
 * Type guard for object field existence.
 */
export const hasProp = <K extends string>(
  value: object,
  key: K,
): value is Record<K, unknown> => key in value;
