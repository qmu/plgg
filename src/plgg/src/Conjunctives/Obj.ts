import {
  Result,
  newOk,
  newErr,
  InvalidError,
  Refinable1,
  Castable1,
  JsonReady,
  toJsonReady,
  Datum,
  fromJsonReady,
  JsonSerializer,
  isJsonReady,
  isDatum,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface MapKind1<A> {
    Obj: Obj;
  }
}

/**
 * Readonly record type for functional programming operations.
 */
export type Obj<T extends _Obj = _Obj> = T;

type _Obj = {
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
export const recRefinable: Refinable1<"Obj"> = {
  KindKey: "Obj",
  is,
};
/**
 * Exported type guard function for record values.
 */
export const { is: isObj } = recRefinable;

/**
 * Castable instance for record safe casting.
 */
export const recCastable: Castable1<"Obj"> = {
  KindKey: "Obj",
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
  const result: Obj = {};
  for (const key in jsonReady) {
    const val = jsonReady[key];
    if (val !== undefined) {
      result[key] = fromJsonReady(val);
    }
  }
  return result;
};

/**
 * JsonSerializer instance for Obj values.
 */
export const objJsonSerializer: JsonSerializer<
  Obj,
  JsonReadyObj
> = {
  toJsonReady: toJsonReadyObj,
  fromJsonReady: fromJsonReadyObj,
};
