import { describe, it, expect } from "vitest";
import {
  OptionalDatum,
  jsonEncode,
  jsonDecode,
  toJsonReady,
  fromJsonReady,
  newSome,
  newNone,
  isSome,
  isNone,
  isOptionalDatum,
  toJsonReadyOptionalDatum,
} from "plgg/index";

describe("OptionalDatum Serialization/Deserialization", () => {
  describe("Basic round-trip tests", () => {
    it("should serialize and deserialize Some OptionalDatum with string", () => {
      const original: OptionalDatum<string> =
        newSome("hello world");

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      if (isSome(restored)) {
        expect(restored.content).toBe(
          "hello world",
        );
        // Verify methods exist on deserialized option
        expect(typeof restored.isSome).toBe(
          "function",
        );
        expect(typeof restored.isNone).toBe(
          "function",
        );
        expect(restored.isSome()).toBe(true);
        expect(restored.isNone()).toBe(false);
      }
    });

    it("should serialize and deserialize Some OptionalDatum with number", () => {
      const original: OptionalDatum<number> =
        newSome(42.5);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      if (isSome(restored)) {
        expect(restored.content).toBe(42.5);
      }
    });

    it("should serialize and deserialize Some OptionalDatum with boolean", () => {
      const original: OptionalDatum<boolean> =
        newSome(true);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      if (isSome(restored)) {
        expect(restored.content).toBe(true);
      }
    });

    it("should serialize and deserialize Some OptionalDatum with BigInt", () => {
      const original: OptionalDatum<bigint> =
        newSome(123456789012345678901234567890n);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      if (isSome(restored)) {
        expect(restored.content).toBe(
          123456789012345678901234567890n,
        );
        expect(typeof restored.content).toBe(
          "bigint",
        );
      }
    });

    it("should serialize and deserialize None OptionalDatum", () => {
      const original: OptionalDatum<string> =
        newNone();

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isNone(restored)).toBe(true);
      // Verify methods exist on deserialized None
      if (isOptionalDatum(restored)) {
        expect(typeof restored.isSome).toBe(
          "function",
        );
        expect(typeof restored.isNone).toBe(
          "function",
        );
        expect(restored.isSome()).toBe(false);
        expect(restored.isNone()).toBe(true);
      }
    });
  });

  describe("Complex data type round-trip tests", () => {
    it("should serialize and deserialize Some OptionalDatum with object", () => {
      const objectData = {
        name: "Alice",
        age: 30,
      };
      const original = newSome(objectData);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      if (isSome(restored)) {
        expect(restored.content).toEqual({
          name: "Alice",
          age: 30,
        });
      }
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
      const original = newSome(nestedObjectData);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      if (isSome(restored)) {
        const content = restored.content as any;
        expect(content.user.name).toBe("Bob");
        expect(content.user.details.age).toBe(25);
        expect(content.user.details.active).toBe(
          true,
        );
      }
    });

    it("should serialize and deserialize Some OptionalDatum with array", () => {
      const arrayData = [1, 2, 3, 4, 5];
      const original = newSome(arrayData);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      if (isSome(restored)) {
        const content = restored.content as any;
        expect(content).toEqual([1, 2, 3, 4, 5]);
        expect(Array.isArray(content)).toBe(true);
        expect(content.length).toBe(5);
      }
    });

    it("should serialize and deserialize Some OptionalDatum with mixed object containing BigInt", () => {
      const mixedObjectData = {
        id: 123n,
        name: "Charlie",
        balance: 456789012345678901234567890n,
      };
      const original = newSome(mixedObjectData);

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      if (isSome(restored)) {
        const content = restored.content as any;
        expect(content.id).toBe(123n);
        expect(typeof content.id).toBe("bigint");
        expect(content.name).toBe("Charlie");
        expect(content.balance).toBe(
          456789012345678901234567890n,
        );
        expect(typeof content.balance).toBe(
          "bigint",
        );
      }
    });
  });

  describe("JsonReady intermediate conversion tests", () => {
    it("should convert Some OptionalDatum to JsonReady and back", () => {
      const original: OptionalDatum<string> =
        newSome("test value");

      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);

      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isOptionalDatum(restored)).toBe(
        true,
      );
    });

    it("should convert None OptionalDatum to JsonReady and back", () => {
      const original: OptionalDatum<number> =
        newNone();

      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);

      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isNone(restored)).toBe(true);
    });

    it("should use toJsonReadyOptionalDatum for Some OptionalDatum", () => {
      const original: OptionalDatum<string> =
        newSome("direct test");

      const jsonReady =
        toJsonReadyOptionalDatum(original);
      expect(isSome(jsonReady)).toBe(true);
      if (isSome(jsonReady)) {
        expect(jsonReady.content).toBe(
          "direct test",
        );
      }
    });

    it("should use toJsonReadyOptionalDatum for None OptionalDatum", () => {
      const original: OptionalDatum<string> =
        newNone();

      const jsonReady =
        toJsonReadyOptionalDatum(original);
      expect(isNone(jsonReady)).toBe(true);
    });
  });

  describe("Edge cases and special values", () => {
    it("should handle Some OptionalDatum with zero values", () => {
      const cases = [
        newSome(0),
        newSome(""),
        newSome(false),
        newSome(0n),
      ];

      cases.forEach((original) => {
        const jsonString = jsonEncode(original);
        const restored = jsonDecode(jsonString);

        expect(isOptionalDatum(restored)).toBe(
          true,
        );
        expect(isOptionalDatum(restored)).toBe(
          true,
        );
        expect(isSome(restored)).toBe(true);
      });
    });

    it("should handle Some OptionalDatum with special string values", () => {
      const emptyStringCase = newSome("");
      const specialCharsCase = newSome("null");

      [emptyStringCase, specialCharsCase].forEach(
        (original) => {
          const jsonString = jsonEncode(original);
          const restored = jsonDecode(jsonString);

          expect(isOptionalDatum(restored)).toBe(
            true,
          );
          expect(isOptionalDatum(restored)).toBe(
            true,
          );
          expect(isSome(restored)).toBe(true);
        },
      );
    });

    it("should handle Some OptionalDatum with negative numbers", () => {
      const negativeNumber: OptionalDatum<number> =
        newSome(-42.5);
      const negativeBigInt: OptionalDatum<bigint> =
        newSome(-999999999999999999n);

      [negativeNumber, negativeBigInt].forEach(
        (original) => {
          const jsonString = jsonEncode(original);
          const restored = jsonDecode(jsonString);

          expect(isOptionalDatum(restored)).toBe(
            true,
          );
          expect(isOptionalDatum(restored)).toBe(
            true,
          );
        },
      );
    });

    it("should handle Some OptionalDatum with empty arrays and objects", () => {
      const emptyArray = newSome([]);
      const emptyObject = newSome({});

      [emptyArray, emptyObject].forEach(
        (original) => {
          const jsonString = jsonEncode(original);
          const restored = jsonDecode(jsonString);

          expect(isOptionalDatum(restored)).toBe(
            true,
          );
          expect(isOptionalDatum(restored)).toBe(
            true,
          );
        },
      );
    });
  });

  describe("Type preservation tests", () => {
    it("should maintain type information after round-trip", () => {
      const stringOptional: OptionalDatum<string> =
        newSome("type test");
      const numberOptional: OptionalDatum<number> =
        newSome(123);
      const boolOptional: OptionalDatum<boolean> =
        newSome(true);
      const bigintOptional: OptionalDatum<bigint> =
        newSome(456n);
      const noneOptional: OptionalDatum<string> =
        newNone();

      const testCases = [
        stringOptional,
        numberOptional,
        boolOptional,
        bigintOptional,
        noneOptional,
      ];

      testCases.forEach((original) => {
        const restored = jsonDecode(
          jsonEncode(original),
        );

        expect(isOptionalDatum(restored)).toBe(
          true,
        );
        expect(isOptionalDatum(restored)).toBe(
          true,
        );

        if (
          isSome(original) &&
          isSome(restored)
        ) {
          expect(typeof restored.content).toBe(
            typeof original.content,
          );
        }
      });
    });

    it("should preserve object structure and property order", () => {
      const original: OptionalDatum<{
        z: string;
        a: number;
        m: boolean;
      }> = newSome({
        z: "last",
        a: 42,
        m: true,
      });

      const restored = jsonDecode(
        jsonEncode(original),
      );

      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      expect(isOptionalDatum(restored)).toBe(
        true,
      );
      if (isSome(restored)) {
        expect(
          Object.keys(restored.content),
        ).toEqual(Object.keys(original.content));
      }
    });
  });

  describe("JSON structure validation", () => {
    it("should produce expected JSON structure for Some OptionalDatum", () => {
      const original: OptionalDatum<string> =
        newSome("json structure test");

      const jsonString = jsonEncode(original);
      const parsed = JSON.parse(jsonString);

      expect(parsed).toHaveProperty(
        "__tag",
        "Some",
      );
      expect(parsed).toHaveProperty(
        "content",
        "json structure test",
      );
    });

    it("should produce expected JSON structure for None OptionalDatum", () => {
      const original: OptionalDatum<string> =
        newNone();

      const jsonString = jsonEncode(original);
      const parsed = JSON.parse(jsonString);

      expect(parsed).toHaveProperty(
        "__tag",
        "None",
      );
      expect(parsed).toHaveProperty(
        "content",
        "__none__",
      );
    });

    it("should produce expected JSON structure for Some OptionalDatum with BigInt", () => {
      const original: OptionalDatum<bigint> =
        newSome(987654321n);

      const jsonString = jsonEncode(original);
      const parsed = JSON.parse(jsonString);

      expect(parsed).toHaveProperty(
        "__tag",
        "Some",
      );
      expect(parsed.content).toEqual({
        type: "bigint",
        value: "987654321",
      });
    });
  });
});
