import {
  Result,
  ok,
  err,
  ValidationError,
  Option,
  some,
  none,
  pipe,
  mapResult,
} from "plgg/index";

/**
 * Object type with primitive values.
 */
export type t = Readonly<Record<string, unknown>>;

/**
 * Type guard for object.
 */
export const is = (value: unknown): value is t =>
  typeof value === "object" && value !== null;

/**
 * Validates and casts to object with primitives.
 */
export const cast = (value: unknown): Result<t, ValidationError> =>
  is(value) ? ok(value) : err(new ValidationError({ message: "Not object" }));

/**
 * Validates object property with predicate.
 */
export const prop =
  <T extends string, U>(
    key: T,
    predicate: (a: unknown) => Result<U, ValidationError>,
  ) =>
  <V extends object>(obj: V): Result<V & Record<T, U>, ValidationError> =>
    hasField(obj, key)
      ? pipe(
          obj[key],
          predicate,
          mapResult(
            (okValue) => ok({ ...obj, [key]: okValue }),
            (errValue) => err(errValue),
          ),
        )
      : err(
          new ValidationError({
            message: `Property '${key}' not found`,
          }),
        );

/**
 * Validates optional object property with predicate.
 */
export const optional =
  <T extends string, U>(
    key: T,
    predicate: (a: unknown) => Result<U, ValidationError>,
  ) =>
  <V extends object>(
    obj: V,
  ): Result<V & Record<T, Option<U>>, ValidationError> =>
    hasField(obj, key)
      ? pipe(
          obj[key],
          predicate,
          mapResult(
            (okValue) => ok({ ...obj, [key]: some(okValue) }),
            (errValue) => err(errValue),
          ),
        )
      : ok({ ...obj, [key]: none<U>() } as V & Record<T, Option<U>>);

/**
 * Type guard for object field existence.
 */
const hasField = <K extends string>(
  value: object,
  key: K,
): value is Record<K, unknown> => key in value;
