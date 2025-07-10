/**
 * Some side of Option, representing a value that exists.
 */
export type Some<T> = {
  _tag: "Some";
  value: T;
};

/**
 * None side of Option, representing no value.
 */
export type None = {
  _tag: "None";
};

/**
 * Option type for handling optional values.
 * @template T - The value type
 */
export type Option<T> = Some<T> | None;

/**
 * Creates a Some instance.
 */
export const some = <T>(value: T): Option<T> => {
  const result = {
    _tag: "Some" as const,
    value,
  };
  return result;
};

/**
 * Creates a None instance.
 */
export const none = <T = never>(): Option<T> => {
  const result = {
    _tag: "None" as const,
  };
  return result;
};

/**
 * Type guard to check if an Option is a Some.
 */
export const isSome = <T>(e: Option<T>): e is Some<T> => e._tag === "Some";

/**
 * Type guard to check if an Option is a None.
 */
export const isNone = <T>(e: Option<T>): e is None => e._tag === "None";
