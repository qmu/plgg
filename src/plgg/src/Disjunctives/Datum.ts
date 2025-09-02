import {
  Atomic,
  Obj,
  OptionalDatum,
  isAtomic,
  isObj,
  isVec,
} from "plgg/index";

/**
 * Data type representing atomic values, objects, and vectors.
 */
export type Datum =
  | DatumCore
  | OptionalDatum<DatumCore>;

export type DatumCore =
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
  (isObj(value) &&
    Object.values(value).every(isDatum)) ||
  (isVec(value) && value.every(isDatum));

export type DatumObject = {
  [key: string]: Datum;
};
