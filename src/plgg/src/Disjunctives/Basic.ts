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
