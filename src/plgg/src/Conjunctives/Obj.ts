import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  JsonReady,
  Datum,
  JsonSerializable,
  newOk,
  newErr,
  toJsonReady,
  fromJsonReady,
  isJsonReady,
  isDatum,
} from "plgg/index";

/**
 * Readonly record type for functional programming operations.
 */
export type Obj<
  T extends OnlyDatumObject = OnlyDatumObject,
> = Readonly<T>;

type OnlyDatumObject = {
  [key: string]: Datum;
};

/**
 * Type guard to check if a value is an Obj.
 */
const is = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null;

/**
 * Refinable instance for record type guards.
 */
export const recRefinable: Refinable<Obj> = {
  is,
};
/**
 * Exported type guard function for record values.
 */
export const { is: isObj } = recRefinable;

/**
 * Castable instance for record safe casting.
 */
export const recCastable: Castable<Obj> = {
  as: (
    value: unknown,
  ): Result<Obj, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Not record",
          }),
        ),
};
/**
 * Exported safe casting function for record values.
 */
export const { as: asObj } = recCastable;

// --------------------------------
// JsonReady
// --------------------------------

/**
 * Object type containing JsonReady values for serialization.
 */
export type JsonReadyObj = {
  [key: string]: JsonReady;
};

/**
 * Type guard to check if a value is a JsonReadyObj.
 */
export const isJsonReadyObj = (
  value: unknown,
): value is JsonReadyObj =>
  isObj(value) &&
  Object.values(value).every(isJsonReady);

/**
 * Converts an Obj to JsonReadyObj for serialization.
 */
export const toJsonReadyObj = (
  value: Obj,
): JsonReadyObj => {
  const result: JsonReadyObj = {};
  for (const key in value) {
    const val = value[key];
    if (isDatum(val)) {
      result[key] = toJsonReady(val);
    }
    // throw LogicalException?
  }
  return result;
};

/**
 * Converts JsonReadyObj back to Obj from serialization.
 */
export const fromJsonReadyObj = (
  jsonReady: JsonReadyObj,
): Obj => {
  const entries: [string, Datum][] = [];
  for (const key in jsonReady) {
    const val = jsonReady[key];
    if (val !== undefined) {
      entries.push([key, fromJsonReady(val)]);
    }
  }
  return Object.fromEntries(entries);
};

/**
 * JsonSerializer instance for Obj values.
 */
export const objJsonSerializer: JsonSerializable<
  Obj,
  JsonReadyObj
> = {
  toJsonReady: toJsonReadyObj,
  fromJsonReady: fromJsonReadyObj,
};
