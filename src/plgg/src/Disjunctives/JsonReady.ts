import {
  Datum,
  JsonReadyAtomic,
  JsonReadyObj,
  JsonReadyVec,
  OptionalDatumJsonReady,
  DatumCore,
  isObj,
  isVec,
  isSome,
  toJsonReadyAtomic,
  toJsonReadyVec,
  toJsonReadyObj,
  toJsonReadyOptionalDatum,
  fromJsonReadyAtomic,
  fromJsonReadyVec,
  fromJsonReadyObj,
  isJsonReadyAtomic,
  isJsonReadyVec,
  isJsonReadyObj,
  isJsonReadyOptionalDatum,
  isOptionalDatum,
  newOk,
  newNone,
} from "plgg/index";

/**
 * Union type for all JSON-ready data types.
 */
export type JsonReady =
  | JsonReadyCore
  | OptionalDatumJsonReady<JsonReadyCore>;

export type JsonReadyCore =
  | JsonReadyAtomic
  | JsonReadyObj
  | JsonReadyVec;

export const toJsonReadyCore = (
  value: DatumCore,
): JsonReadyCore => {
  if (isObj(value)) {
    return toJsonReadyObj(value);
  }
  if (isVec(value)) {
    return toJsonReadyVec(value);
  }
  return toJsonReadyAtomic(value);
};

export const fromJsonReadyCore = (
  jsonReady: JsonReadyCore,
): DatumCore => {
  if (isJsonReadyObj(jsonReady)) {
    return fromJsonReadyObj(jsonReady);
  }
  if (isJsonReadyVec(jsonReady)) {
    return fromJsonReadyVec(jsonReady);
  }
  return fromJsonReadyAtomic(jsonReady);
};
/**
 * Runtime type guard to check if a value is JSON-ready.
 */
export const isJsonReady = (
  value: unknown,
): value is JsonReady =>
  isJsonReadyAtomic(value) ||
  isJsonReadyObj(value) ||
  isJsonReadyVec(value) ||
  isJsonReadyOptionalDatum(value);

/**
 * Converts a Datum value to its JSON-ready representation.
 */
export const toJsonReady = (
  value: Datum,
): JsonReady => {
  if (isObj(value)) {
    return toJsonReadyObj(value);
  }
  if (isVec(value)) {
    return toJsonReadyVec(value);
  }
  if (isOptionalDatum(value)) {
    return toJsonReadyOptionalDatum(value);
  }
  return toJsonReadyCore(value);
};

/**
 * Converts a JSON-ready value back to its original Datum form.
 */
export const fromJsonReady = (
  jsonReady: JsonReady,
): Datum => {
  if (isJsonReadyAtomic(jsonReady)) {
    return fromJsonReadyAtomic(jsonReady);
  }
  if (isJsonReadyVec(jsonReady)) {
    return fromJsonReadyVec(jsonReady);
  }
  if (isOptionalDatum(jsonReady)) {
    return isSome(jsonReady)
      ? newOk(fromJsonReadyCore(jsonReady))
      : newNone();
  }
  return fromJsonReadyObj(jsonReady);
};

/**
 * Serializes a Datum value to a JSON string.
 */
export const toJson = (value: Datum): string =>
  JSON.stringify(toJsonReady(value));

/**
 * Deserializes a JSON string back to a Datum value.
 */
export const fromJson = (
  jsonString: string,
): Datum => fromJsonReady(JSON.parse(jsonString));
