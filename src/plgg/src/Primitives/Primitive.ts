import {
  Str,
  BrandStr,
  Num,
  BrandNum,
  Bool,
  BrandBool,
  Time,
  isBool,
  isBrandBool,
  isNum,
  isBrandNum,
  isStr,
  isBrandStr,
  isTime,
} from "plgg/index";

/**
 * Union of all primitive types.
 */
export type Primitive =
  | Str
  | BrandStr<string>
  | Num
  | BrandNum<string>
  | Bool
  | BrandBool<string>
  | Time;

/**
 * Type guard for any primitive.
 */
export const isPrimitive = (value: unknown): value is Primitive =>
  isStr(value) ||
  isBrandStr(value) ||
  isNum(value) ||
  isBrandNum(value) ||
  isBool(value) ||
  isBrandBool(value) ||
  isTime(value);
