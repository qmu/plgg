import {
  Atomic,
  Obj,
  Vec,
  isAtomic,
  isVec,
  JsonReadyAtomic,
  JsonReadyObj,
  JsonReadyVec,
  toJsonReadyAtomic,
  toJsonReadyObj,
  fromJsonReadyAtomic,
  fromJsonReadyObj,
} from "plgg/index";

export type JsonSerializable = Atomic | Obj | Vec<JsonSerializable>;

export type JsonReady =
  | JsonReadyAtomic
  | JsonReadyObj
  | JsonReadyVec;

export const toJsonReady = (
  value: JsonSerializable,
): JsonReady => {
  if (isAtomic(value)) {
    return toJsonReadyAtomic(value);
  }
  if (isVec(value)) {
    return toJsonReadyVec(value);
  }
  return toJsonReadyObj(value);
};

const toJsonReadyVec = (
  value: Vec<JsonSerializable>,
): JsonReadyVec => {
  return value.map((item: JsonSerializable) =>
    toJsonReady(item),
  );
};

export const toJson = (
  value: JsonSerializable,
): string => JSON.stringify(toJsonReady(value));

/**
 * Determines if a JsonReady value is a Vec (array)
 */
const isJsonReadyVec = (
  value: JsonReady,
): value is JsonReadyVec => Array.isArray(value);

/**
 * Determines if a JsonReady value is an object (not atomic, not array)
 */
const isJsonReadyObj = (
  value: JsonReady,
): value is JsonReadyObj =>
  typeof value === "object" &&
  value !== null &&
  !("type" in value) &&
  !Array.isArray(value);

const fromJsonReadyVec = (
  jsonReady: JsonReadyVec,
): Vec<JsonSerializable> => {
  return jsonReady.map((item: JsonReady) =>
    fromJsonReady(item),
  );
};

export const fromJsonReady = (
  jsonReady: JsonReady,
): JsonSerializable => {
  if (isJsonReadyVec(jsonReady)) {
    return fromJsonReadyVec(jsonReady);
  }
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
