import {
  Atomic,
  Obj,
  isAtomic,
  isObj,
  isVec,
} from "plgg/index";

/**
 * Data type representing atomic values, objects, and vectors.
 */
export type Datum =
  | Atomic
  | Obj
  | ReadonlyArray<Datum>; // Vec

/**
 * Runtime type guard to check if a value is Datum.
 */
export const isDatum = (
  value: unknown,
): value is Datum =>
  isAtomic(value) ||
  isObj(value) || // FIXME : should check that all props are Datum as Obj
  (isVec(value) && value.every(isDatum));

export type DatumObject = {
  [key: string]: Datum;
};
