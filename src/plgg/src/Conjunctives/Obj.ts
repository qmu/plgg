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
export type Obj = Readonly<Record<string, unknown>>;

/**
 * Type guard for object.
 * Checks if value is an object (not null or array).
 * 
 * @param value - Value to check
 * @returns True if value is an object, false otherwise
 */
export const isObj = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null;

/**
 * Validates and casts to object with primitives.
 * 
 * @param value - Value to validate and cast
 * @returns Result with object if valid, InvalidError if not
 * @example
 * const result = asObj({ name: "John" }); // Ok({ name: "John" })
 * const invalid = asObj(null); // Err(InvalidError)
 */
export const asObj = (value: unknown): Result<Obj, InvalidError> =>
  isObj(value) ? ok(value) : err(new InvalidError({ message: "Not object" }));

/**
 * Validates and transforms an object property using a predicate.
 * Returns a new object with the validated and transformed property.
 * 
 * @param key - The property key to validate
 * @param predicate - Function to validate and transform the property value
 * @returns Function that takes an object and returns validated result with typed property
 * @example
 * const validateAge = forProp("age", asNum);
 * const result = validateAge({ age: "25" }); // Ok({ age: 25 })
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
          chainResult(
            (okValue): Result<V & Record<T, U>, InvalidError> =>
              ok({ ...obj, [key]: okValue }),
          ),
        )
      : err(
          new InvalidError({
            message: `Property '${key}' not found`,
          }),
        );

/**
 * Validates optional object property with predicate.
 * If property exists, validates it. If not, wraps result in None.
 * 
 * @param key - The property key to validate (optional)
 * @param predicate - Function to validate and transform the property value
 * @returns Function that returns object with Option-wrapped property
 * @example
 * const validateOptionalAge = forOptionProp("age", asNum);
 * const withAge = validateOptionalAge({ age: "25" }); // Ok({ age: Some(25) })
 * const withoutAge = validateOptionalAge({}); // Ok({ age: None })
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
          chainResult(
            (okValue): Result<V & Record<T, Option<U>>, InvalidError> =>
              ok({ ...obj, [key]: some(okValue) }),
          ),
        )
      : ok({ ...obj, [key]: none() } as V & Record<T, Option<U>>);

/**
 * Type guard for object field existence.
 * Checks if an object has a specific property and narrows the type.
 * 
 * @param value - Object to check
 * @param key - Property key to look for
 * @returns True if object has the property, false otherwise
 * @example
 * if (hasProp(obj, "name")) {
 *   // TypeScript knows obj has property "name"
 *   console.log(obj.name);
 * }
 */
export const hasProp = <K extends string>(
  value: object,
  key: K,
): value is Record<K, unknown> => key in value;
