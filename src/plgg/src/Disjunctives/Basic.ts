import {
  I8,
  I16,
  I32,
  I64,
  I128,
  JsonReadyI8,
  JsonReadyI16,
  JsonReadyI32,
  JsonReadyI64,
  JsonReadyI128,
  isI8,
  isI16,
  isI32,
  isI64,
  isI128,
  toJsonReadyI8,
  toJsonReadyI16,
  toJsonReadyI32,
  toJsonReadyI64,
  toJsonReadyI128,
  fromJsonReadyI8,
  fromJsonReadyI16,
  fromJsonReadyI32,
  fromJsonReadyI64,
  fromJsonReadyI128,
  isJsonReadyI8,
  isJsonReadyI16,
  isJsonReadyI32,
  isJsonReadyI64,
  isJsonReadyI128,
} from "plgg/index";

/**
 * Union type representing all basic value types in the system.
 */
export type Basic = I8 | I16 | I32 | I64 | I128;

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
  isI8(value) ||
  isI16(value) ||
  isI32(value) ||
  isI64(value) ||
  isI128(value);

// --------------------------------
// JsonReady
// --------------------------------

/**
 * Union type for JSON-ready basic values.
 */
export type JsonReadyBasic =
  | JsonReadyI8
  | JsonReadyI16
  | JsonReadyI32
  | JsonReadyI64
  | JsonReadyI128;

/**
 * Runtime type guard to check if a value is JSON-ready basic.
 */
export const isJsonReadyBasic = (
  value: unknown,
): value is JsonReadyBasic =>
  isJsonReadyI8(value) ||
  isJsonReadyI16(value) ||
  isJsonReadyI32(value) ||
  isJsonReadyI64(value) ||
  isJsonReadyI128(value);

/**
 * Converts a basic value to its JSON-ready representation.
 */
export const toJsonReadyBasic = (
  value: Basic,
): JsonReadyBasic => {
  if (isI8(value)) {
    return toJsonReadyI8(value);
  }
  if (isI16(value)) {
    return toJsonReadyI16(value);
  }
  if (isI32(value)) {
    return toJsonReadyI32(value);
  }
  if (isI64(value)) {
    return toJsonReadyI64(value);
  }
  if (isI128(value)) {
    return toJsonReadyI128(value);
  }
  throw new Error("Unsupported Basic type");
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
  if (isJsonReadyI16(jsonReady)) {
    return fromJsonReadyI16(jsonReady);
  }
  if (isJsonReadyI32(jsonReady)) {
    return fromJsonReadyI32(jsonReady);
  }
  if (isJsonReadyI64(jsonReady)) {
    return fromJsonReadyI64(jsonReady);
  }
  if (isJsonReadyI128(jsonReady)) {
    return fromJsonReadyI128(jsonReady);
  }
  throw new Error(
    "Unsupported JsonReadyBasic type",
  );
};

