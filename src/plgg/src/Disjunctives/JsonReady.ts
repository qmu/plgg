import {
  Datum,
  JsonReadyAtomic,
  JsonReadyBasic,
  JsonReadyObj,
  JsonReadyVec,
  OptionalDatumJsonReady,
  DatumCore,
  NominalDatumJsonReady,
  isVec,
  isSome,
  toJsonReadyAtomic,
  toJsonReadyBasic,
  toJsonReadyVec,
  toJsonReadyObj,
  toJsonReadyOptionalDatum,
  fromJsonReadyAtomic,
  fromJsonReadyBasic,
  fromJsonReadyVec,
  fromJsonReadyObj,
  isJsonReadyAtomic,
  isJsonReadyBasic,
  isJsonReadyVec,
  isJsonReadyObj,
  isJsonReadyOptionalDatum,
  isOptionalDatum,
  isAtomic,
  isBasic,
  newSome,
  newNone,
} from "plgg/index";

/**
 * Union type for all JSON-ready data types.
 */
export type JsonReady =
  | JsonReadyCore
  | OptionalDatumJsonReady<JsonReadyCore>
  | NominalDatumJsonReady<string, JsonReadyCore>;

export type JsonReadyCore =
  | JsonReadyAtomic
  | JsonReadyBasic
  | JsonReadyObj
  | JsonReadyVec;

export const toJsonReadyCore = (
  value: DatumCore,
): JsonReadyCore => {
  // Check Basic types before falling back to Obj
  // to prevent Date objects from being treated as generic objects
  if (isBasic(value)) {
    return toJsonReadyBasic(value);
  }
  if (isAtomic(value)) {
    return toJsonReadyAtomic(value);
  }
  if (isVec(value)) {
    return toJsonReadyVec(value);
  }
  // Only treat as Obj if it's not Atomic, Basic, or Vec
  return toJsonReadyObj(value);
};

export const fromJsonReadyCore = (
  jsonReady: JsonReadyCore,
): DatumCore => {
  // Check Basic types before Atomic to handle Time strings correctly
  if (isJsonReadyBasic(jsonReady)) {
    return fromJsonReadyBasic(jsonReady);
  }
  if (isJsonReadyAtomic(jsonReady)) {
    return fromJsonReadyAtomic(jsonReady);
  }
  if (isJsonReadyVec(jsonReady)) {
    return fromJsonReadyVec(jsonReady);
  }
  return fromJsonReadyObj(jsonReady);
};
/**
 * Runtime type guard to check if a value is JSON-ready.
 */
export const isJsonReady = (
  value: unknown,
): value is JsonReady =>
  isJsonReadyBasic(value) ||
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
  if (isJsonReadyOptionalDatum(jsonReady)) {
    return isSome(jsonReady)
      ? newSome(
          fromJsonReadyCore(jsonReady.content),
        )
      : newNone();
  }
  // Check Basic types before Atomic to handle Time strings correctly
  if (isJsonReadyBasic(jsonReady)) {
    return fromJsonReadyBasic(jsonReady);
  }
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
