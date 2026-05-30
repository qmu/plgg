import {
  Atomic,
  Basic,
  Obj,
  OptionalDatum,
  NominalDatum,
  isAtomic,
  isBasic,
  isObj,
  isVec,
  isOptionalDatum,
  isNominalDatum,
  isSome,
  isNone,
} from "plgg/index";

/**
 * Data type representing atomic values, objects, and vectors.
 */
export type Datum =
  | DatumCore
  | OptionalDatum<DatumCore>
  | NominalDatum<string, DatumCore>; // Box

export type DatumCore =
  | Atomic
  | Basic
  | Obj
  | ReadonlyArray<Datum>; // Vec

/**
 * Runtime type guard to check if a value is Datum.
 */
export const isDatum = (
  value: unknown,
): value is Datum =>
  isDatumCore(value) ||
  (isOptionalDatum(value) &&
    (isNone(value) ||
      (isSome(value) &&
        isDatum(value.content)))) ||
  (isNominalDatum<DatumCore>(value) &&
    isDatumCore(value.content));

export const isDatumCore = (
  value: unknown,
): value is DatumCore =>
  isAtomic(value) ||
  isBasic(value) ||
  (isObj(value) &&
    Object.values(value).every(isDatum)) ||
  (isVec(value) && value.every(isDatum));
