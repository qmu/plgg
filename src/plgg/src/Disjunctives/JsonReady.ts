import {
  Datum,
  isObj,
  isVec,
  JsonReadyAtomic,
  JsonReadyObj,
  JsonReadyVec,
  toJsonReadyAtomic,
  toJsonReadyVec,
  toJsonReadyObj,
  fromJsonReadyAtomic,
  fromJsonReadyVec,
  fromJsonReadyObj,
  isJsonReadyAtomic,
  isJsonReadyVec,
  isJsonReadyObj,
} from "plgg/index";

/**
 * Union type for all JSON-ready data types.
 */
export type JsonReady =
  | JsonReadyAtomic
  | JsonReadyObj
  | JsonReadyVec;

/**
 * Runtime type guard to check if a value is JSON-ready.
 */
export const isJsonReady = (
  value: unknown,
): value is JsonReady =>
  isJsonReadyAtomic(value) ||
  isJsonReadyObj(value) ||
  isJsonReadyVec(value);

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
  return toJsonReadyAtomic(value);
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
