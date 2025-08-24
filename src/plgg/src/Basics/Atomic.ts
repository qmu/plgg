import {
  Str,
  Num,
  Bool,
  Time,
  isStr,
  isNum,
  isBool,
  isTime,
} from "plgg/index";

export type Atomic = Str | Num | Bool | Time;

export const isAtomic = (
  value: unknown,
): value is Atomic =>
  isStr(value) ||
  isNum(value) ||
  isBool(value) ||
  isTime(value);
