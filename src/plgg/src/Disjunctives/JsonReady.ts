import {
  Datum,
  JsonReadyAtomic,
  JsonReadyObj,
  JsonReadyVec,
  OptionalDatumJsonReady,
  DatumCore,
  NominalDatumJsonReady,
  isVec,
  isSome,
  toJsonReadyAtomic,
  toJsonReadyVec,
  toJsonReadyObj,
  toJsonReadyOptionalDatum,
  toJsonReadyNominalDatum,
  fromJsonReadyAtomic,
  fromJsonReadyVec,
  fromJsonReadyObj,
  isJsonReadyAtomic,
  isJsonReadyVec,
  isJsonReadyObj,
  isJsonReadyOptionalDatum,
  isJsonReadyNominalDatum,
  isOptionalDatum,
  isNominalDatum,
  isAtomic,
  newSome,
  newNone,
  box,
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
  | JsonReadyObj
  | JsonReadyVec;

export const toJsonReadyCore = (
  value: DatumCore,
): JsonReadyCore => {
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
  isJsonReadyAtomic(value) ||
  isJsonReadyObj(value) ||
  isJsonReadyVec(value) ||
  isJsonReadyOptionalDatum(value) ||
  isJsonReadyNominalDatum(value);

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
  if (isNominalDatum(value)) {
    return toJsonReadyNominalDatum(value);
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
  if (isJsonReadyNominalDatum(jsonReady)) {
    return box(jsonReady.__tag)(
      fromJsonReadyCore(jsonReady.content),
    );
  }
  // Check Basic types before Atomic to handle Time strings correctly
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
export const jsonEncode = (
  value: Datum,
): string => JSON.stringify(toJsonReady(value));

/**
 * Deserializes a JSON string back to a Datum value.
 */
export const jsonDecode = (
  jsonString: string,
): Datum => fromJsonReady(JSON.parse(jsonString));
