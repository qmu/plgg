import {
  Atomic,
  Obj,
  isAtomic,
  isObj,
  isVec,
} from "plgg/index";

/**
 * Json-Serializable data type representing atomic values, objects, and vectors.
 */
export type Datum =
  | Atomic
  | Obj
  | ReadonlyArray<Datum>; // Vec

export const isDatum = (
  value: unknown,
): value is Datum =>
  isAtomic(value) ||
  isObj(value) ||
  (isVec(value) && value.every(isDatum));
