import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  JsonSerializable,
  ok,
  err,
  isObj,
  hasProp,
} from "plgg/index";

/**
 * Represents binary data as Uint8Array.
 */
export type Bin = Uint8Array;

/**
 * Type predicate to determine if a type is Bin.
 */
export type IsBin<T> = T extends Bin
  ? true
  : false;

/**
 * Type guard to check if a value is a Bin.
 */
const is = (value: unknown): value is Bin =>
  value instanceof Uint8Array;

/**
 * Refinable instance for Bin type guards.
 */
export const binRefinable: Refinable<Bin> = {
  is,
};
/**
 * Exported type guard function for Bin values.
 */
export const { is: isBin } = binRefinable;

export const asBin = (
  value: unknown,
): Result<Bin, InvalidError> => {
  if (is(value)) {
    return ok(value);
  }

  if (value instanceof ArrayBuffer) {
    return ok(new Uint8Array(value));
  }

  if (ArrayBuffer.isView(value)) {
    return ok(
      new Uint8Array(
        value.buffer,
        value.byteOffset,
        value.byteLength,
      ),
    );
  }

  if (typeof value === "string") {
    const encoder = new TextEncoder();
    return ok(encoder.encode(value));
  }

  return err(
    new InvalidError({
      message: "Value is not a Bin",
    }),
  );
};

/**
 * Castable instance for Bin safe casting.
 */
export const binCastable: Castable<Bin> = {
  as: asBin,
};

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of Bin values as base64 string.
 */
export type JsonReadyBin = {
  type: "bin";
  value: string;
};

/**
 * Type guard for JSON-ready Bin values.
 */
export const isJsonReadyBin = (
  value: unknown,
): value is JsonReadyBin =>
  isObj(value) &&
  hasProp(value, "type") &&
  value.type === "bin" &&
  hasProp(value, "value") &&
  typeof value.value === "string";

/**
 * Datum instance for Bin values.
 */
export const binJsonSerializable: JsonSerializable<
  Bin,
  JsonReadyBin
> = {
  toJsonReady: (value: Bin): JsonReadyBin => {
    const base64 = btoa(
      String.fromCharCode(...value),
    );
    return {
      type: "bin",
      value: base64,
    };
  },
  fromJsonReady: (
    jsonReady: JsonReadyBin,
  ): Bin => {
    const binaryString = atob(jsonReady.value);
    const bytes = new Uint8Array(
      binaryString.length,
    );
    for (
      let i = 0;
      i < binaryString.length;
      i++
    ) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  },
};
/**
 * Exported JSON serialization functions for Bin values.
 */
export const {
  toJsonReady: toJsonReadyBin,
  fromJsonReady: fromJsonReadyBin,
} = binJsonSerializable;
