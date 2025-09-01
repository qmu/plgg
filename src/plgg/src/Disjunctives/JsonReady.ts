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

export type JsonReady =
  | JsonReadyAtomic
  | JsonReadyObj
  | JsonReadyVec;

export const isJsonReady = (
  value: unknown,
): value is JsonReady =>
  isJsonReadyAtomic(value) ||
  isJsonReadyObj(value) ||
  isJsonReadyVec(value);

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

export const toJson = (value: Datum): string =>
  JSON.stringify(toJsonReady(value));

export const fromJson = (
  jsonString: string,
): Datum => fromJsonReady(JSON.parse(jsonString));
