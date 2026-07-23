import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
  toBeInstanceOf,
  toBeGreaterThan,
} from "plgg-test";
import {
  Bin,
  isBin,
  asBin,
  pipe,
  cast,
  chainResult,
  refine,
} from "plgg/index";

test("isBin correctly identifies Bin values", () =>
  all([
    // Valid Bin values
    check(
      isBin(new Uint8Array([1, 2, 3])),
      toBe(true),
    ),
    check(isBin(new Uint8Array(0)), toBe(true)),
    check(
      isBin(new Uint8Array([255, 0, 128])),
      toBe(true),
    ),
    check(
      isBin(
        new Uint8Array([72, 101, 108, 108, 111]),
      ),
      toBe(true),
    ),
    // Invalid types
    check(isBin(123), toBe(false)),
    check(isBin("hello"), toBe(false)),
    check(isBin(true), toBe(false)),
    check(isBin(null), toBe(false)),
    check(isBin(undefined), toBe(false)),
    check(isBin({}), toBe(false)),
    check(isBin([]), toBe(false)),
    check(isBin([1, 2, 3]), toBe(false)),
    check(
      isBin(new ArrayBuffer(10)),
      toBe(false),
    ),
    check(
      isBin(new Int32Array([1, 2, 3])),
      toBe(false),
    ),
  ]));

test("asBin validates and converts Bin values", () => {
  // ArrayBuffer conversion
  const buffer = new ArrayBuffer(3);
  const view = new Uint8Array(buffer);
  view[0] = 10;
  view[1] = 20;
  view[2] = 30;

  // ArrayBufferView conversion
  const int32Array = new Int32Array([1, 2, 3]);

  return all([
    // Direct Uint8Array values
    check(
      asBin(new Uint8Array([1, 2, 3])),
      okThen(toEqual(new Uint8Array([1, 2, 3]))),
    ),
    check(
      asBin(new Uint8Array(0)),
      okThen(toEqual(new Uint8Array(0))),
    ),
    check(
      asBin(
        new Uint8Array([
          255, 128, 64, 32, 16, 8, 4, 2, 1,
        ]),
      ),
      okThen(
        toEqual(
          new Uint8Array([
            255, 128, 64, 32, 16, 8, 4, 2, 1,
          ]),
        ),
      ),
    ),
    check(
      asBin(buffer),
      okThen(
        toEqual(new Uint8Array([10, 20, 30])),
      ),
    ),
    check(
      asBin(int32Array),
      okThen(toBeInstanceOf(Uint8Array)),
    ),
    // String conversion
    check(
      asBin("Hello"),
      okThen(
        toEqual(
          new Uint8Array([
            72, 101, 108, 108, 111,
          ]),
        ),
      ),
    ),
    check(
      asBin(""),
      okThen(toEqual(new Uint8Array(0))),
    ),
    // Invalid conversions
    check(
      asBin(123),
      errThen((e) =>
        toBe("Value is not a Bin")(
          e.content.message,
        ),
      ),
    ),
    check(
      asBin(true),
      errThen((e) =>
        toBe("Value is not a Bin")(
          e.content.message,
        ),
      ),
    ),
    check(
      asBin(null),
      errThen((e) =>
        toBe("Value is not a Bin")(
          e.content.message,
        ),
      ),
    ),
    check(
      asBin([1, 2, 3]),
      errThen((e) =>
        toBe("Value is not a Bin")(
          e.content.message,
        ),
      ),
    ),
  ]);
});

test("asBin works in validation pipelines", () => {
  // Example: Binary data validation with
  // size constraints
  const validateBinaryData = (input: unknown) =>
    pipe(
      asBin(input),
      chainResult((data: Bin) =>
        cast(
          data,
          refine(
            (x: Bin) => x.length > 0,
            "Binary data cannot be empty",
          ),
          refine(
            (x: Bin) => x.length <= 1024,
            "Binary data too large (max 1KB)",
          ),
        ),
      ),
    );

  return all([
    check(
      validateBinaryData(
        new Uint8Array([1, 2, 3, 4, 5]),
      ),
      okThen(
        toEqual(new Uint8Array([1, 2, 3, 4, 5])),
      ),
    ),
    check(
      validateBinaryData("test"),
      okThen(
        toEqual(
          new Uint8Array([116, 101, 115, 116]),
        ),
      ),
    ),
    check(
      validateBinaryData(123),
      errThen((e) =>
        toBe("Value is not a Bin")(
          e.content.message,
        ),
      ),
    ),
    check(
      validateBinaryData(new Uint8Array(0)),
      errThen((e) =>
        toBe("Binary data cannot be empty")(
          e.content.message,
        ),
      ),
    ),
    check(
      validateBinaryData(new Uint8Array(2000)),
      errThen((e) =>
        toBe("Binary data too large (max 1KB)")(
          e.content.message,
        ),
      ),
    ),
  ]);
});

test("asBin handles various binary data formats", () => {
  // Buffer with typed array views
  const buffer = new ArrayBuffer(8);
  const float64View = new Float64Array(buffer);
  float64View[0] = Math.PI;

  // Int8Array (another ArrayBufferView)
  const int8Array = new Int8Array([-1, -2, -3]);

  return all([
    // Converting different binary formats
    check(
      asBin("Hello, World!"),
      okThen((b) => toBe(13)(b.length)),
    ),
    // Unicode handling via TextEncoder
    check(
      asBin("こんにちは"),
      okThen((b) => toBeGreaterThan(5)(b.length)),
    ),
    check(
      asBin(buffer),
      okThen((b) => toBe(8)(b.length)),
    ),
    check(
      asBin(int8Array),
      okThen(toBeInstanceOf(Uint8Array)),
    ),
    check(
      asBin(int8Array),
      okThen((b) => toBe(3)(b.length)),
    ),
  ]);
});
