import {
  SoftStr,
  Num,
  Bool,
  BigInt,
  Bin,
  Int,
  Time,
  JsonReadySoftStr,
  JsonReadyNum,
  JsonReadyBool,
  JsonReadyBigInt,
  JsonReadyBin,
  JsonReadyInt,
  JsonReadyTime,
  isSoftStr,
  isNum,
  isBool,
  isBigInt,
  isBin,
  isInt,
  isTime,
  toJsonReadyBigInt,
  fromJsonReadyBigInt,
  toJsonReadyBin,
  fromJsonReadyBin,
  toJsonReadyTime,
  fromJsonReadyTime,
  isJsonReadySoftStr,
  isJsonReadyNum,
  isJsonReadyBool,
  isJsonReadyBigInt,
  isJsonReadyBin,
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
  | Bin
  | SoftStr
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
  isBin(value) ||
  isSoftStr(value) ||
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
  | JsonReadyBin
  | JsonReadySoftStr
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
  isJsonReadyBin(value) ||
  isJsonReadySoftStr(value) ||
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
  if (isBin(value)) {
    return toJsonReadyBin(value);
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
  if (isJsonReadyBin(jsonReady)) {
    return fromJsonReadyBin(jsonReady);
  }
  if (isJsonReadyTime(jsonReady)) {
    return fromJsonReadyTime(jsonReady);
  }
  return jsonReady;
};
