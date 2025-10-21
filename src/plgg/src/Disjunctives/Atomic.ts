import {
  Str,
  Num,
  Bool,
  BigInt,
  Int,
  Time,
  JsonReadyStr,
  JsonReadyNum,
  JsonReadyBool,
  JsonReadyBigInt,
  JsonReadyInt,
  JsonReadyTime,
  isStr,
  isNum,
  isBool,
  isBigInt,
  isInt,
  isTime,
  toJsonReadyBigInt,
  fromJsonReadyBigInt,
  toJsonReadyTime,
  fromJsonReadyTime,
  isJsonReadyStr,
  isJsonReadyNum,
  isJsonReadyBool,
  isJsonReadyBigInt,
  isJsonReadyInt,
  isJsonReadyTime,
} from "plgg/index";

/**
 * Union type representing all atomic value types in the system.
 */
export type Atomic =
  | Bool
  | Num
  | Int
  | BigInt
  | Str
  | Time;

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
  isBool(value) ||
  isNum(value) ||
  isInt(value) ||
  isBigInt(value) ||
  isStr(value) ||
  isTime(value);

// --------------------------------
// JsonReady
// --------------------------------

/**
 * Union type for JSON-ready atomic values.
 */
export type JsonReadyAtomic =
  | JsonReadyBool
  | JsonReadyNum
  | JsonReadyInt
  | JsonReadyBigInt
  | JsonReadyStr
  | JsonReadyTime;

/**
 * Runtime type guard to check if a value is JSON-ready atomic.
 */
export const isJsonReadyAtomic = (
  value: unknown,
): value is JsonReadyAtomic =>
  isJsonReadyBool(value) ||
  isJsonReadyNum(value) ||
  isJsonReadyInt(value) ||
  isJsonReadyBigInt(value) ||
  isJsonReadyStr(value) ||
  isJsonReadyTime(value);

/**
 * Converts an atomic value to its JSON-ready representation.
 */
export const toJsonReadyAtomic = (
  value: Atomic,
): JsonReadyAtomic => {
  if (isBigInt(value)) {
    return toJsonReadyBigInt(value);
  }
  if (isTime(value)) {
    return toJsonReadyTime(value);
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
  if (isJsonReadyTime(jsonReady)) {
    return fromJsonReadyTime(jsonReady);
  }
  return jsonReady;
};
