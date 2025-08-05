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
 */
export type Obj = Readonly<Record<string, unknown>>;

/**
 * Type guard for object.
 */
export const isObj = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null;

/**
 * Validates and casts to object with primitives.
 */
export const asObj = (value: unknown): Result<Obj, InvalidError> =>
  isObj(value) ? ok(value) : err(new InvalidError({ message: "Not object" }));

/**
 * Validates object property with predicate.
 */
export const forProp =
  <T extends string, U>(
    key: T,
    predicate: (a: unknown) => Result<U, InvalidError>,
  ) =>
  <V extends object>(obj: V): Result<V & Record<T, U>, InvalidError> =>
    hasProp(obj, key)
      ? pipe(
          obj[key],
          predicate,
          chainResult((okValue) => ok({ ...obj, [key]: okValue })),
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
    predicate: (a: unknown) => Result<U, InvalidError>,
  ) =>
  <V extends object>(obj: V): Result<V & Record<T, Option<U>>, InvalidError> =>
    hasProp(obj, key)
      ? pipe(
          obj[key],
          predicate,
          chainResult((okValue) => ok({ ...obj, [key]: some(okValue) })),
        )
      : ok({ ...obj, [key]: none<U>() } as V & Record<T, Option<U>>);

/**
 * Type guard for object field existence.
 */
export const hasProp = <K extends string>(
  value: object,
  key: K,
): value is Record<K, unknown> => key in value;
