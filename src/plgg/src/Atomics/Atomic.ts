import {
  Str,
  Num,
  Bool,
  BigInt,
  isStr,
  isNum,
  isBool,
  isBigInt,
} from "plgg/index";

export type Atomic = Str | Num | Bool | BigInt;

export type IsAtomic<T> = [T] extends [Atomic]
  ? true
  : false;

export const isAtomic = (
  value: unknown,
): value is Atomic =>
  isStr(value) || isNum(value) || isBool(value) || isBigInt(value);
