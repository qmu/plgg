import {
  Str,
  Num,
  Bool,
  isStr,
  isNum,
  isBool,
} from "plgg/index";

export type Atomic = Str | Num | Bool;

export type IsAtomic<T> = [T] extends [Atomic]
  ? true
  : false;

export const isAtomic = (
  value: unknown,
): value is Atomic =>
  isStr(value) || isNum(value) || isBool(value);
