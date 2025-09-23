import {
  I8,
  I16,
  I32,
  I64,
  I128,
  U8,
  U16,
  U32,
  U64,
  U128,
  Float,
  JsonReadyI8,
  JsonReadyI16,
  JsonReadyI32,
  JsonReadyI64,
  JsonReadyI128,
  JsonReadyU8,
  JsonReadyU16,
  JsonReadyU32,
  JsonReadyU64,
  JsonReadyU128,
  JsonReadyFloat,
  isI8,
  isI16,
  isI32,
  isI64,
  isI128,
  isU8,
  isU16,
  isU32,
  isU64,
  isU128,
  isFloat,
  toJsonReadyI8,
  toJsonReadyI16,
  toJsonReadyI32,
  toJsonReadyI64,
  toJsonReadyI128,
  toJsonReadyU8,
  toJsonReadyU16,
  toJsonReadyU32,
  toJsonReadyU64,
  toJsonReadyU128,
  toJsonReadyFloat,
  fromJsonReadyI8,
  fromJsonReadyI16,
  fromJsonReadyI32,
  fromJsonReadyI64,
  fromJsonReadyI128,
  fromJsonReadyU8,
  fromJsonReadyU16,
  fromJsonReadyU32,
  fromJsonReadyU64,
  fromJsonReadyU128,
  fromJsonReadyFloat,
  isJsonReadyI8,
  isJsonReadyI16,
  isJsonReadyI32,
  isJsonReadyI64,
  isJsonReadyI128,
  isJsonReadyU8,
  isJsonReadyU16,
  isJsonReadyU32,
  isJsonReadyU64,
  isJsonReadyU128,
  isJsonReadyFloat,
} from "plgg/index";

/**
 * Union type representing all basic value types in the system.
 */
export type Basic =
  | I8
  | I16
  | I32
  | I64
  | I128
  | U8
  | U16
  | U32
  | U64
  | U128
  | Float;

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
  isI128(value) ||
  isU8(value) ||
  isU16(value) ||
  isU32(value) ||
  isU64(value) ||
  isU128(value) ||
  isFloat(value);

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
  | JsonReadyI128
  | JsonReadyU8
  | JsonReadyU16
  | JsonReadyU32
  | JsonReadyU64
  | JsonReadyU128
  | JsonReadyFloat;

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
  isJsonReadyI128(value) ||
  isJsonReadyU8(value) ||
  isJsonReadyU16(value) ||
  isJsonReadyU32(value) ||
  isJsonReadyU64(value) ||
  isJsonReadyU128(value) ||
  isJsonReadyFloat(value);

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
  if (isU8(value)) {
    return toJsonReadyU8(value);
  }
  if (isU16(value)) {
    return toJsonReadyU16(value);
  }
  if (isU32(value)) {
    return toJsonReadyU32(value);
  }
  if (isU64(value)) {
    return toJsonReadyU64(value);
  }
  if (isU128(value)) {
    return toJsonReadyU128(value);
  }
  if (isFloat(value)) {
    return toJsonReadyFloat(value);
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
  if (isJsonReadyU8(jsonReady)) {
    return fromJsonReadyU8(jsonReady);
  }
  if (isJsonReadyU16(jsonReady)) {
    return fromJsonReadyU16(jsonReady);
  }
  if (isJsonReadyU32(jsonReady)) {
    return fromJsonReadyU32(jsonReady);
  }
  if (isJsonReadyU64(jsonReady)) {
    return fromJsonReadyU64(jsonReady);
  }
  if (isJsonReadyU128(jsonReady)) {
    return fromJsonReadyU128(jsonReady);
  }
  if (isJsonReadyFloat(jsonReady)) {
    return fromJsonReadyFloat(jsonReady);
  }
  throw new Error(
    "Unsupported JsonReadyBasic type",
  );
};
