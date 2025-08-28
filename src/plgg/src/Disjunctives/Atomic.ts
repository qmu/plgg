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
