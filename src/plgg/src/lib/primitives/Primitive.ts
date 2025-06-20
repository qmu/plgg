import {
  Str,
  BrandStr,
  Num,
  BrandNum,
  Bool,
  BrandBool,
  Time,
} from "plgg/lib/index";

/**
 * Union of all primitive types.
 */
export type t =
  | Str.t
  | BrandStr.t<string>
  | Num.t
  | BrandNum.t<string>
  | Bool.t
  | BrandBool.t<string>
  | Time.t;

/**
 * Type guard for any primitive.
 */
export const is = (value: unknown): value is t =>
  Str.is(value) ||
  BrandStr.is(value) ||
  Num.is(value) ||
  BrandNum.is(value) ||
  Bool.is(value) ||
  BrandBool.is(value) ||
  Time.is(value);
