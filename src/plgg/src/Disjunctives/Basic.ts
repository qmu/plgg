import {
  Time,
  JsonReadyTime,
  isTime,
  toJsonReadyTime,
  fromJsonReadyTime,
  isJsonReadyTime,
} from "plgg/index";

/**
 * Union type representing all basic value types in the system.
 */
export type Basic = Time;

/**
 * Type predicate to determine if a type is basic.
 */
export type IsBasic<T> = [T] extends [Basic]
  ? true
  : false;

/**
 * Runtime type guard to check if a value is basic.
 */
export const isBasic = (
  value: unknown,
): value is Basic =>
  isTime(value);

// --------------------------------
// JsonReady
// --------------------------------

/**
 * Union type for JSON-ready basic values.
 */
export type JsonReadyBasic = JsonReadyTime;

/**
 * Runtime type guard to check if a value is JSON-ready basic.
 */
export const isJsonReadyBasic = (
  value: unknown,
): value is JsonReadyBasic =>
  isJsonReadyTime(value);

/**
 * Converts a basic value to its JSON-ready representation.
 */
export const toJsonReadyBasic = (
  value: Basic,
): JsonReadyBasic => {
  if (isTime(value)) {
    return toJsonReadyTime(value);
  }
  return value;
};

/**
 * Converts a JSON-ready basic value back to its original form.
 */
export const fromJsonReadyBasic = (
  jsonReady: JsonReadyBasic,
): Basic => {
  if (isJsonReadyTime(jsonReady)) {
    return fromJsonReadyTime(jsonReady);
  }
  return jsonReady;
};