import {
  Procedural,
  fail,
  isErr,
  isResult,
  ok,
  err,
  ValidationError,
  Option,
  some,
  none,
  Primitive,
  success,
} from "plgg/lib/index";

/**
 * Object type with primitive values.
 */
export type t = Record<string, Primitive.t | Option<Primitive.t>>;

/**
 * Validates and casts to object with primitives.
 */
export const cast = (value: unknown): Procedural<t> =>
  typeof value === "object" && value !== null
    ? (() => {
        const result: Record<string, Primitive.t> = {};
        for (const [key, val] of Object.entries(value)) {
          if (Primitive.is(val)) {
            result[key] = val;
          } else {
            return fail(
              new ValidationError(`Value at key '${key}' is not a primitive`),
            );
          }
        }
        return success(result);
      })()
    : fail(new ValidationError("Value is not an object"));

/**
 * Validates object property with predicate.
 */
export const prop =
  <T extends string, U>(key: T, predicate: (a: unknown) => Procedural<U>) =>
  async <V extends object>(value: V): Procedural<V & Record<T, U>> => {
    if (!hasField(value, key)) {
      return err(new ValidationError(`Value does not have property '${key}'`));
    }

    const validatedProperty = await predicate(value[key]);

    if (isResult(validatedProperty)) {
      if (isErr(validatedProperty)) {
        return validatedProperty;
      }
      return ok({ ...value, [key]: validatedProperty.ok });
    }

    return ok({ ...value, [key]: validatedProperty });
  };

/**
 * Validates optional object property with predicate.
 */
export const optional =
  <T extends string, U>(key: T, predicate: (a: unknown) => Procedural<U>) =>
  async <V extends object>(value: V): Procedural<V & Record<T, Option<U>>> => {
    if (!hasField(value, key)) {
      return ok({ ...value, [key]: none<U>() } as V & Record<T, Option<U>>);
    }

    const validatedProperty = await predicate(value[key]);

    if (isResult(validatedProperty)) {
      if (isErr(validatedProperty)) {
        return validatedProperty;
      }
      return ok({ ...value, [key]: some(validatedProperty.ok) } as V &
        Record<T, Option<U>>);
    }

    return ok({ ...value, [key]: some(validatedProperty) } as V &
      Record<T, Option<U>>);
  };

/**
 * Type guard for object field existence.
 */
const hasField = <K extends string>(
  value: object,
  key: K,
): value is Record<K, unknown> => key in value;
