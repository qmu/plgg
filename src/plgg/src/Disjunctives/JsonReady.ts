import {
  Atomic,
  Obj,
  isAtomic,
  JsonReadyAtomic,
  JsonReadyObj,
  toJsonReadyAtomic,
  toJsonReadyObj,
  fromJsonReadyAtomic,
  fromJsonReadyObj,
} from "plgg/index";

export type JsonSerializable = Atomic | Obj;

export type JsonReady =
  | JsonReadyAtomic
  | JsonReadyObj;

export const toJsonReady = (
  value: JsonSerializable,
): JsonReady => {
  if (isAtomic(value)) {
    return toJsonReadyAtomic(value);
  }
  return toJsonReadyObj(value);
};

export const toJson = (
  value: JsonSerializable,
): string => JSON.stringify(toJsonReady(value));

/**
 * Determines if a JsonReady value is an object (not atomic)
 */
const isJsonReadyObj = (
  value: JsonReady,
): value is JsonReadyObj =>
  typeof value === "object" &&
  value !== null &&
  !("type" in value);

export const fromJsonReady = (
  jsonReady: JsonReady,
): JsonSerializable => {
  if (isJsonReadyObj(jsonReady)) {
    return fromJsonReadyObj(jsonReady);
  }
  return fromJsonReadyAtomic(jsonReady);
};

export const fromJson = (
  jsonString: string,
): JsonSerializable => {
  const parsed = JSON.parse(jsonString);
  return fromJsonReady(parsed);
};
