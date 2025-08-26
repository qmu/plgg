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

export type Atomic =
  | Str
  | Num
  | Bool
  | BigInt
  | BrandStr<string>
  | BrandNum<string>
  | BrandBool<string>;

export type IsAtomic<T> = [T] extends [Atomic]
  ? true
  : false;

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
