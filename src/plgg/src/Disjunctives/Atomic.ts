import {
  Str,
  Num,
  Bool,
  BigInt,
  BrandStr,
  BrandNum,
  BrandBool,
  isStr,
  isNum,
  isBool,
  isBigInt,
  isBrandStr,
  isBrandNum,
  isBrandBool,
  JsonReadyStr,
  JsonReadyNum,
  JsonReadyBool,
  JsonReadyBigInt,
  JsonReadyBrandStr,
  JsonReadyBrandNum,
  JsonReadyBrandBool,
  toJsonReadyBigInt,
  fromJsonReadyBigInt,
  isJsonReadyStr,
  isJsonReadyNum,
  isJsonReadyBool,
  isJsonReadyBigInt,
} from "plgg/index";

/**
 * Union type representing all atomic value types in the system.
 */
export type Atomic =
  | Str
  | Num
  | Bool
  | BigInt
  | BrandStr<string>
  | BrandNum<string>
  | BrandBool<string>;

/**
 * Type predicate to determine if a type is atomic.
 */
export type IsAtomic<T> = [T] extends [Atomic]
  ? true
  : false;

/**
 * Runtime type guard to check if a value is atomic.
 */
export const isAtomic = (
  value: unknown,
): value is Atomic =>
  isStr(value) ||
  isNum(value) ||
  isBool(value) ||
  isBigInt(value) ||
  isBrandStr(value) ||
  isBrandNum(value) ||
  isBrandBool(value);

// --------------------------------
// JsonReady
// --------------------------------

/**
 * Union type for JSON-ready atomic values.
 */
export type JsonReadyAtomic =
  | JsonReadyStr
  | JsonReadyNum
  | JsonReadyBool
  | JsonReadyBigInt
  | JsonReadyBrandStr
  | JsonReadyBrandNum
  | JsonReadyBrandBool;

/**
 * Runtime type guard to check if a value is JSON-ready atomic.
 */
export const isJsonReadyAtomic = (
  value: unknown,
): value is JsonReadyAtomic =>
  isJsonReadyStr(value) ||
  isJsonReadyNum(value) ||
  isJsonReadyBool(value) ||
  isJsonReadyBigInt(value) ||
  isBrandStr(value) ||
  isBrandNum(value) ||
  isBrandBool(value);

/**
 * Converts an atomic value to its JSON-ready representation.
 */
export const toJsonReadyAtomic = (
  value: Atomic,
): JsonReadyAtomic => {
  if (isBigInt(value)) {
    return toJsonReadyBigInt(value);
  }
  return value;
};

/**
 * Converts a JSON-ready atomic value back to its original form.
 */
export const fromJsonReadyAtomic = (
  jsonReady: JsonReadyAtomic,
): Atomic => {
  if (isJsonReadyBigInt(jsonReady)) {
    return fromJsonReadyBigInt(jsonReady);
  }
  return jsonReady;
};
