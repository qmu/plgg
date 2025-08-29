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

export type JsonReadyAtomic =
  | JsonReadyStr
  | JsonReadyNum
  | JsonReadyBool
  | JsonReadyBigInt
  | JsonReadyBrandStr
  | JsonReadyBrandNum
  | JsonReadyBrandBool;

export const toJsonReadyAtomic = (
  value: Atomic,
): JsonReadyAtomic => {
  if (isBigInt(value)) {
    return toJsonReadyBigInt(value);
  }
  return value;
};

/**
 * Determines if a JsonReady value is a BigInt object structure
 */
const isJsonReadyBigInt = (
  value: JsonReadyAtomic,
): value is JsonReadyBigInt =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  value.type === "bigint";

export const fromJsonReadyAtomic = (
  jsonReady: JsonReadyAtomic,
): Atomic => {
  if (isJsonReadyBigInt(jsonReady)) {
    return fromJsonReadyBigInt(jsonReady);
  }
  return jsonReady;
};
