import { test, expect, assert } from "vitest";
import {
  isBin,
  asBin,
  isOk,
  isErr,
} from "plgg/index";

test("isBin correctly identifies Bin values", () => {
  // Valid Bin values
  expect(isBin(new Uint8Array([1, 2, 3]))).toBe(
    true,
  );
  expect(isBin(new Uint8Array(0))).toBe(true);
  expect(isBin(new Uint8Array([255, 0, 128]))).toBe(
    true,
  );
  expect(
    isBin(
      new Uint8Array([
        72, 101, 108, 108, 111,
      ]),
    ),
  ).toBe(true);

  // Invalid types
  expect(isBin(123)).toBe(false);
  expect(isBin("hello")).toBe(false);
  expect(isBin(true)).toBe(false);
  expect(isBin(null)).toBe(false);
  expect(isBin(undefined)).toBe(false);
  expect(isBin({})).toBe(false);
  expect(isBin([])).toBe(false);
  expect(isBin([1, 2, 3])).toBe(false);
  expect(isBin(new ArrayBuffer(10))).toBe(false);
  expect(isBin(new Int32Array([1, 2, 3]))).toBe(
    false,
  );
});

test("asBin validates and converts Bin values", () => {
  // Direct Uint8Array values
  const validBin = asBin(
    new Uint8Array([1, 2, 3]),
  );
  assert(isOk(validBin));
  expect(validBin.content).toEqual(
    new Uint8Array([1, 2, 3]),
  );

  const emptyBin = asBin(new Uint8Array(0));
  assert(isOk(emptyBin));
  expect(emptyBin.content).toEqual(new Uint8Array(0));

  const largeBin = asBin(
    new Uint8Array([255, 128, 64, 32, 16, 8, 4, 2, 1]),
  );
  assert(isOk(largeBin));
  expect(largeBin.content).toEqual(
    new Uint8Array([255, 128, 64, 32, 16, 8, 4, 2, 1]),
  );

  // ArrayBuffer conversion
  const buffer = new ArrayBuffer(3);
  const view = new Uint8Array(buffer);
  view[0] = 10;
  view[1] = 20;
  view[2] = 30;
  const bufferValue = asBin(buffer);
  assert(isOk(bufferValue));
  expect(bufferValue.content).toEqual(
    new Uint8Array([10, 20, 30]),
  );

  // ArrayBufferView conversion
  const int32Array = new Int32Array([1, 2, 3]);
  const viewValue = asBin(int32Array);
  assert(isOk(viewValue));
  expect(viewValue.content).toBeInstanceOf(
    Uint8Array,
  );

  // String conversion
  const stringValue = asBin("Hello");
  assert(isOk(stringValue));
  expect(stringValue.content).toEqual(
    new Uint8Array([72, 101, 108, 108, 111]),
  );

  const emptyString = asBin("");
  assert(isOk(emptyString));
  expect(emptyString.content).toEqual(new Uint8Array(0));

  // Invalid conversions
  const numberValue = asBin(123);
  assert(isErr(numberValue));
  expect(numberValue.content.message).toBe(
    "Value is not a Bin",
  );

  const booleanInput = asBin(true);
  assert(isErr(booleanInput));
  expect(booleanInput.content.message).toBe(
    "Value is not a Bin",
  );

  const nullInput = asBin(null);
  assert(isErr(nullInput));
  expect(nullInput.content.message).toBe(
    "Value is not a Bin",
  );

  const arrayInput = asBin([1, 2, 3]);
  assert(isErr(arrayInput));
  expect(arrayInput.content.message).toBe(
    "Value is not a Bin",
  );
});

test("asBin works in validation pipelines", () => {
  // Example: Binary data validation with size constraints
  const validateBinaryData = (input: unknown) => {
    const binResult = asBin(input);
    if (isErr(binResult)) return binResult;

    const data = binResult.content;
    if (data.length === 0) {
      return {
        __tag: "Err" as const,
        content: new Error(
          "Binary data cannot be empty",
        ),
      };
    }
    if (data.length > 1024) {
      return {
        __tag: "Err" as const,
        content: new Error(
          "Binary data too large (max 1KB)",
        ),
      };
    }
    return {
      __tag: "Ok" as const,
      content: data,
    };
  };

  const validData = validateBinaryData(
    new Uint8Array([1, 2, 3, 4, 5]),
  );
  assert(isOk(validData));
  expect(validData.content).toEqual(
    new Uint8Array([1, 2, 3, 4, 5]),
  );

  const stringData = validateBinaryData("test");
  assert(isOk(stringData));
  expect(stringData.content).toEqual(
    new Uint8Array([116, 101, 115, 116]),
  );

  const invalidType = validateBinaryData(123);
  assert(isErr(invalidType));
  expect(invalidType.content.message).toBe(
    "Value is not a Bin",
  );

  const emptyData = validateBinaryData(
    new Uint8Array(0),
  );
  assert(isErr(emptyData));
  expect(emptyData.content.message).toBe(
    "Binary data cannot be empty",
  );

  const largeData = validateBinaryData(
    new Uint8Array(2000),
  );
  assert(isErr(largeData));
  expect(largeData.content.message).toBe(
    "Binary data too large (max 1KB)",
  );
});

test("asBin handles various binary data formats", () => {
  // Example: Converting different binary formats
  const textData = asBin("Hello, World!");
  assert(isOk(textData));
  expect(textData.content.length).toBe(13);

  // Unicode handling via TextEncoder
  const unicodeData = asBin("こんにちは");
  assert(isOk(unicodeData));
  expect(unicodeData.content.length).toBeGreaterThan(
    5,
  ); // UTF-8 encoded

  // Buffer with typed array views
  const buffer = new ArrayBuffer(8);
  const float64View = new Float64Array(buffer);
  float64View[0] = Math.PI;
  const bufferData = asBin(buffer);
  assert(isOk(bufferData));
  expect(bufferData.content.length).toBe(8);

  // Int8Array (another ArrayBufferView)
  const int8Array = new Int8Array([-1, -2, -3]);
  const int8Data = asBin(int8Array);
  assert(isOk(int8Data));
  expect(int8Data.content).toBeInstanceOf(
    Uint8Array,
  );
  expect(int8Data.content.length).toBe(3);
});
