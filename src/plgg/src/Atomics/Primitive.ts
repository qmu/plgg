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
 * Union of all primitive types including branded variants.
 * Represents all basic data types supported by the system.
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
 * Type guard for any primitive type.
 * Checks if a value is any of the supported primitive types.
 * 
 * @param value - Value to check
 * @returns True if value is a primitive, false otherwise
 * @example
 * if (isPrimitive(value)) {
 *   // TypeScript knows value is a Primitive
 * }
 */
export const isPrimitive = (value: unknown): value is Primitive =>
  isStr(value) ||
  isBrandStr(value) ||
  isNum(value) ||
  isBrandNum(value) ||
  isBool(value) ||
  isBrandBool(value) ||
  isTime(value);
