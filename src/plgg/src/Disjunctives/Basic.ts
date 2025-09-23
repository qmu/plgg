import {
  I8,
  JsonReadyI8,
  isI8,
  toJsonReadyI8,
  fromJsonReadyI8,
  isJsonReadyI8,
} from "plgg/index";

/**
 * Union type representing all basic value types in the system.
 */
export type Basic = I8;

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
  isI8(value);

// --------------------------------
// JsonReady
// --------------------------------

/**
 * Union type for JSON-ready basic values.
 */
export type JsonReadyBasic = JsonReadyI8;

/**
 * Runtime type guard to check if a value is JSON-ready basic.
 */
export const isJsonReadyBasic = (
  value: unknown,
): value is JsonReadyBasic =>
  isJsonReadyI8(value);

/**
 * Converts a basic value to its JSON-ready representation.
 */
export const toJsonReadyBasic = (
  value: Basic,
): JsonReadyBasic => {
  if (isI8(value)) {
    return toJsonReadyI8(value);
  }
  return value;
};

/**
 * Converts a JSON-ready basic value back to its original form.
 */
export const fromJsonReadyBasic = (
  jsonReady: JsonReadyBasic,
): Basic => {
  if (isJsonReadyI8(jsonReady)) {
    return fromJsonReadyI8(jsonReady);
  }
  return jsonReady;
};