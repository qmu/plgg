import {
  Atomic,
  Obj,
  OptionalDatum,
  isAtomic,
  isObj,
  isVec,
  isOptionalDatum,
  isSome,
  isNone,
} from "plgg/index";

/**
 * Data type representing atomic values, objects, and vectors.
 */
export type Datum =
  | DatumCore
  | OptionalDatum<DatumCore>;

/**
 * Runtime type guard to check if a value is Datum.
 */
export const isDatum = (
  value: unknown,
): value is Datum =>
  isDatumCore(value) ||
  (isOptionalDatum(value) &&
    (isNone(value) ||
      (isSome(value) && isDatum(value.body))));

export type DatumCore =
  | Atomic
  | Obj
  | ReadonlyArray<Datum>; // Vec

export const isDatumCore = (
  value: unknown,
): value is DatumCore =>
  isAtomic(value) ||
  (isObj(value) &&
    Object.values(value).every(isDatum)) ||
  (isVec(value) && value.every(isDatum));

export type DatumObject = {
  [key: string]: Datum;
};
