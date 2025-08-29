import {
  Atomic,
  Obj,
  isAtomic,
  JsonReadyAtomic,
  JsonReadyObj,
  toJsonReadyAtomic,
  toJsonReadyObj,
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
