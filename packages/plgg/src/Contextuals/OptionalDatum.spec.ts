import {
  describe,
  it,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  OptionalDatum,
  jsonEncode,
  jsonDecode,
  toJsonReady,
  fromJsonReady,
  some,
  none,
  isSome,
  isNone,
  isOptionalDatum,
  toJsonReadyOptionalDatum,
} from "plgg/index";

describe("OptionalDatum Serialization/Deserialization", () => {
  describe("Basic round-trip tests", () => {
    it("should serialize and deserialize Some OptionalDatum with string", () => {
      const original: OptionalDatum<string> =
        some("hello world");

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        ...(isSome(restored)
          ? [
              check(
                restored.content,
                toBe("hello world"),
              ),
              // Verify type guards work on deserialized option
              check(
                isSome(restored),
                toBe(true),
              ),
              check(
                isNone(restored),
                toBe(false),
              ),
            ]
          : []),
      ]);
    });

    it("should serialize and deserialize Some OptionalDatum with number", () => {
      const original: OptionalDatum<number> =
        some(42.5);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        ...(isSome(restored)
          ? [check(restored.content, toBe(42.5))]
          : []),
      ]);
    });

    it("should serialize and deserialize Some OptionalDatum with boolean", () => {
      const original: OptionalDatum<boolean> =
        some(true);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        ...(isSome(restored)
          ? [check(restored.content, toBe(true))]
          : []),
      ]);
    });

    it("should serialize and deserialize Some OptionalDatum with BigInt", () => {
      const original: OptionalDatum<bigint> =
        some(123456789012345678901234567890n);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        ...(isSome(restored)
          ? [
              check(
                restored.content,
                toBe(
                  123456789012345678901234567890n,
                ),
              ),
              check(
                typeof restored.content,
                toBe("bigint"),
              ),
            ]
          : []),
      ]);
    });

    it("should serialize and deserialize None OptionalDatum", () => {
      const original: OptionalDatum<string> =
        none();

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(isNone(restored), toBe(true)),
        // Verify type guards work on deserialized None
        ...(isOptionalDatum(restored)
          ? [
              check(
                isSome(restored),
                toBe(false),
              ),
              check(
                isNone(restored),
                toBe(true),
              ),
            ]
          : []),
      ]);
    });
  });

  describe("Complex data type round-trip tests", () => {
    it("should serialize and deserialize Some OptionalDatum with object", () => {
      const objectData = {
        name: "Alice",
        age: 30,
      };
      const original = some(objectData);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        ...(isSome(restored)
          ? [
              check(
                restored.content,
                toEqual({
                  name: "Alice",
                  age: 30,
                }),
              ),
            ]
          : []),
      ]);
    });

    it("should serialize and deserialize Some OptionalDatum with nested object", () => {
      const nestedObjectData = {
        user: {
          name: "Bob",
          details: {
            age: 25,
            active: true,
          },
        },
      };
      const original = some(nestedObjectData);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        ...(isSome(restored)
          ? [
              check(
                restored.content,
                toEqual(nestedObjectData),
              ),
            ]
          : []),
      ]);
    });

    it("should serialize and deserialize Some OptionalDatum with array", () => {
      const arrayData = [1, 2, 3, 4, 5];
      const original = some(arrayData);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        ...(isSome(restored)
          ? [
              check(
                restored.content,
                toEqual([1, 2, 3, 4, 5]),
              ),
              check(
                Array.isArray(restored.content),
                toBe(true),
              ),
            ]
          : []),
      ]);
    });

    it("should serialize and deserialize Some OptionalDatum with mixed object containing BigInt", () => {
      const mixedObjectData = {
        id: 123n,
        name: "Charlie",
        balance: 456789012345678901234567890n,
      };
      const original = some(mixedObjectData);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        ...(isSome(restored)
          ? [
              check(
                restored.content,
                toEqual(mixedObjectData),
              ),
            ]
          : []),
      ]);
    });
  });

  describe("JsonReady intermediate conversion tests", () => {
    it("should convert Some OptionalDatum to JsonReady and back", () => {
      const original: OptionalDatum<string> =
        some("test value");

      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);

      return all([
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
      ]);
    });

    it("should convert None OptionalDatum to JsonReady and back", () => {
      const original: OptionalDatum<number> =
        none();

      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);

      return all([
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(isNone(restored), toBe(true)),
      ]);
    });

    it("should use toJsonReadyOptionalDatum for Some OptionalDatum", () => {
      const original: OptionalDatum<string> =
        some("direct test");

      const jsonReady =
        toJsonReadyOptionalDatum(original);
      return all([
        check(isSome(jsonReady), toBe(true)),
        ...(isSome(jsonReady)
          ? [
              check(
                jsonReady.content,
                toBe("direct test"),
              ),
            ]
          : []),
      ]);
    });

    it("should use toJsonReadyOptionalDatum for None OptionalDatum", () => {
      const original: OptionalDatum<string> =
        none();

      const jsonReady =
        toJsonReadyOptionalDatum(original);
      return check(isNone(jsonReady), toBe(true));
    });
  });

  describe("Edge cases and special values", () => {
    it("should handle Some OptionalDatum with zero values", () => {
      const cases = [
        some(0),
        some(""),
        some(false),
        some(0n),
      ];

      return all(
        cases.map((original) => {
          const jsonString =
            jsonEncode(original);
          const restored =
            jsonDecode(jsonString);

          return all([
            check(
              isOptionalDatum(restored),
              toBe(true),
            ),
            check(
              isOptionalDatum(restored),
              toBe(true),
            ),
            check(
              isSome(restored),
              toBe(true),
            ),
          ]);
        }),
      );
    });

    it("should handle Some OptionalDatum with special string values", () => {
      const emptyStringCase = some("");
      const specialCharsCase = some("null");

      return all(
        [emptyStringCase, specialCharsCase].map(
          (original) => {
            const jsonString =
              jsonEncode(original);
            const restored =
              jsonDecode(jsonString);

            return all([
              check(
                isOptionalDatum(restored),
                toBe(true),
              ),
              check(
                isOptionalDatum(restored),
                toBe(true),
              ),
              check(
                isSome(restored),
                toBe(true),
              ),
            ]);
          },
        ),
      );
    });

    it("should handle Some OptionalDatum with negative numbers", () => {
      const negativeNumber: OptionalDatum<number> =
        some(-42.5);
      const negativeBigInt: OptionalDatum<bigint> =
        some(-999999999999999999n);

      return all(
        [negativeNumber, negativeBigInt].map(
          (original) => {
            const jsonString =
              jsonEncode(original);
            const restored =
              jsonDecode(jsonString);

            return all([
              check(
                isOptionalDatum(restored),
                toBe(true),
              ),
              check(
                isOptionalDatum(restored),
                toBe(true),
              ),
            ]);
          },
        ),
      );
    });

    it("should handle Some OptionalDatum with empty arrays and objects", () => {
      const emptyArray = some([]);
      const emptyObject = some({});

      return all(
        [emptyArray, emptyObject].map(
          (original) => {
            const jsonString =
              jsonEncode(original);
            const restored =
              jsonDecode(jsonString);

            return all([
              check(
                isOptionalDatum(restored),
                toBe(true),
              ),
              check(
                isOptionalDatum(restored),
                toBe(true),
              ),
            ]);
          },
        ),
      );
    });
  });

  describe("Type preservation tests", () => {
    it("should maintain type information after round-trip", () => {
      const stringOptional: OptionalDatum<string> =
        some("type test");
      const numberOptional: OptionalDatum<number> =
        some(123);
      const boolOptional: OptionalDatum<boolean> =
        some(true);
      const bigintOptional: OptionalDatum<bigint> =
        some(456n);
      const noneOptional: OptionalDatum<string> =
        none();

      const testCases = [
        stringOptional,
        numberOptional,
        boolOptional,
        bigintOptional,
        noneOptional,
      ];

      return all(
        testCases.map((original) => {
          const restored = jsonDecode(
            jsonEncode(original),
          );

          return all([
            check(
              isOptionalDatum(restored),
              toBe(true),
            ),
            check(
              isOptionalDatum(restored),
              toBe(true),
            ),
            ...(isSome(original) &&
            isSome(restored)
              ? [
                  check(
                    typeof restored.content,
                    toBe(
                      typeof original.content,
                    ),
                  ),
                ]
              : []),
          ]);
        }),
      );
    });

    it("should preserve object structure and property order", () => {
      const original: OptionalDatum<{
        z: string;
        a: number;
        m: boolean;
      }> = some({
        z: "last",
        a: 42,
        m: true,
      });

      const restored = jsonDecode(
        jsonEncode(original),
      );

      return all([
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        check(
          isOptionalDatum(restored),
          toBe(true),
        ),
        ...(isSome(restored)
          ? [
              check(
                Object.keys(restored.content),
                toEqual(
                  Object.keys(original.content),
                ),
              ),
            ]
          : []),
      ]);
    });
  });

  describe("JSON structure validation", () => {
    it("should produce expected JSON structure for Some OptionalDatum", () => {
      const original: OptionalDatum<string> =
        some("json structure test");

      const jsonString = jsonEncode(original);
      const parsed = JSON.parse(jsonString);

      return all([
        check(parsed.__tag, toBe("Some")),
        check(
          parsed.content,
          toBe("json structure test"),
        ),
      ]);
    });

    it("should produce expected JSON structure for None OptionalDatum", () => {
      const original: OptionalDatum<string> =
        none();

      const jsonString = jsonEncode(original);
      const parsed = JSON.parse(jsonString);

      return all([
        check(parsed.__tag, toBe("None")),
        check(parsed.content, toBe("__none__")),
      ]);
    });

    it("should produce expected JSON structure for Some OptionalDatum with BigInt", () => {
      const original: OptionalDatum<bigint> =
        some(987654321n);

      const jsonString = jsonEncode(original);
      const parsed = JSON.parse(jsonString);

      return all([
        check(parsed.__tag, toBe("Some")),
        check(
          parsed.content,
          toEqual({
            type: "bigint",
            value: "987654321",
          }),
        ),
      ]);
    });
  });
});
