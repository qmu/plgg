import {
  Result,
  newOk,
  newErr,
  InvalidError,
  Refinable1,
  Castable1,
  JsonReady,
  toJsonReadyAtomic,
  isAtomic,
  JsonSerializable,
  fromJsonReady,
  JsonSerializer,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface KindKeytoKind1<A> {
    Obj: Obj;
  }
}

/**
 * Readonly record type for functional programming operations.
 */
export type Obj<
  T extends
    JsonSerializableObj = JsonSerializableObj,
> = T;

export type JsonSerializableObj = {
  [key: string]: JsonSerializable;
};

export type JsonReadyObj = {
  [key: string]: JsonReady;
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

export const toJsonReadyObj = (
  value: Obj,
): JsonReadyObj => {
  const result: JsonReadyObj = {};
  for (const key in value) {
    const val = value[key];
    if (isObj(val)) {
      result[key] = toJsonReadyObj(val);
    }
    if (isAtomic(val)) {
      result[key] = toJsonReadyAtomic(val);
    }
    // throw LogicalException?
  }
  return result;
};

export const fromJsonReadyObj = (
  jsonReady: JsonReadyObj,
): Obj => {
  const result: Obj = {};
  for (const key in jsonReady) {
    if (jsonReady.hasOwnProperty(key)) {
      const val = jsonReady[key];
      if (val !== undefined) {
        result[key] = fromJsonReady(val);
      }
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
