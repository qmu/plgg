import { describe, it, expect } from "vitest";
import {
  Datum,
  toJson,
  fromJson,
  toJsonReady,
  fromJsonReady,
} from "plgg/index";

describe("JsonReady", () => {
  describe("Atomic types round-trip", () => {
    it("should handle string values", () => {
      const original = "hello world";
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      expect(restored).toBe(original);
    });

    it("should handle number values", () => {
      const original = 42.5;
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      expect(restored).toBe(original);
    });

    it("should handle boolean values", () => {
      const original = true;
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      expect(restored).toBe(original);

      const originalFalse = false;
      const jsonReadyFalse = toJsonReady(
        originalFalse,
      );
      const restoredFalse = fromJsonReady(
        jsonReadyFalse,
      );
      expect(restoredFalse).toBe(originalFalse);
    });

    it("should handle BigInt values", () => {
      const original =
        123456789012345678901234567890n;
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      expect(restored).toBe(original);
      expect(typeof restored).toBe("bigint");
    });
  });

  describe("Object types round-trip", () => {
    it("should handle simple objects", () => {
      const original = { name: "Alice", age: 30 };
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      expect(restored).toEqual(original);
    });

    it("should handle nested objects", () => {
      const original = {
        user: {
          name: "Bob",
          details: {
            age: 25,
            active: true,
          },
        },
        count: 42,
      };
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      expect(restored).toEqual(original);
    });

    it("should handle objects with BigInt values", () => {
      const original = {
        id: 123n,
        balance: 456789012345678901234567890n,
        name: "Charlie",
      };
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      expect(restored).toEqual(original);
      expect(typeof (restored as any).id).toBe(
        "bigint",
      );
      expect(
        typeof (restored as any).balance,
      ).toBe("bigint");
    });

    it("should handle deeply nested objects with mixed types", () => {
      const original = {
        level1: {
          level2: {
            level3: {
              str: "deep",
              num: 3.14,
              bool: false,
              bigint: 999n,
            },
          },
          count: 42,
        },
      };
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      expect(restored).toEqual(original);
      expect(
        typeof (restored as any).level1.level2
          .level3.bigint,
      ).toBe("bigint");
    });
  });

  describe("JSON string serialization", () => {
    it("should serialize and deserialize strings", () => {
      const original = "test string";
      const json = toJson(original);
      const restored = fromJson(json);
      expect(restored).toBe(original);
    });

    it("should serialize and deserialize numbers", () => {
      const original = 123.456;
      const json = toJson(original);
      const restored = fromJson(json);
      expect(restored).toBe(original);
    });

    it("should serialize and deserialize booleans", () => {
      const original = true;
      const json = toJson(original);
      const restored = fromJson(json);
      expect(restored).toBe(original);
    });

    it("should serialize and deserialize BigInt", () => {
      const original =
        987654321098765432109876543210n;
      const json = toJson(original);
      const restored = fromJson(json);
      expect(restored).toBe(original);
      expect(typeof restored).toBe("bigint");

      // Verify the JSON structure contains the BigInt wrapper
      const parsed = JSON.parse(json);
      expect(parsed).toEqual({
        type: "bigint",
        value: "987654321098765432109876543210",
      });
    });

    it("should serialize and deserialize complex objects", () => {
      const original = {
        metadata: {
          version: 2,
          timestamp: 1234567890123n,
          active: true,
        },
        summary: {
          total: 999999999999999999n,
          processed: true,
        },
      };

      const json = toJson(original);
      const restored = fromJson(json);
      expect(restored).toEqual(original);

      // Verify BigInt types are preserved
      const restoredAny = restored as any;
      expect(
        typeof restoredAny.metadata.timestamp,
      ).toBe("bigint");
      expect(
        typeof restoredAny.summary.total,
      ).toBe("bigint");
    });

    it("should handle empty objects", () => {
      const emptyObj = {};
      const jsonObj = toJson(emptyObj);
      const restoredObj = fromJson(jsonObj);
      expect(restoredObj).toEqual(emptyObj);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero values", () => {
      expect(fromJson(toJson(0))).toBe(0);
      expect(fromJson(toJson(0n))).toBe(0n);
      expect(fromJson(toJson(""))).toBe("");
      expect(fromJson(toJson(false))).toBe(false);
    });

    it("should handle negative numbers", () => {
      expect(fromJson(toJson(-42))).toBe(-42);
      expect(fromJson(toJson(-123.456))).toBe(
        -123.456,
      );
    });

    it("should handle negative BigInt", () => {
      const negativeBigInt = -999999999999999999n;
      expect(
        fromJson(toJson(negativeBigInt)),
      ).toBe(negativeBigInt);
    });

    it("should preserve object property order (when possible)", () => {
      const original = {
        z: "last",
        a: "first",
        m: "middle",
      };
      const restored = fromJson(toJson(original));
      expect(restored).toEqual(original);
      expect(Object.keys(restored)).toEqual(
        Object.keys(original),
      );
    });
  });

  describe("Type assertions", () => {
    it("should maintain proper types after round-trip", () => {
      const testCases: Datum[] = [
        "string",
        42,
        true,
        false,
        123n,
        { key: "value" },
        { nested: { deep: true } },
        {
          mixed: {
            str: "test",
            num: 1,
            bool: false,
            big: 456n,
          },
        },
      ];

      testCases.forEach((testCase) => {
        const restored = fromJson(
          toJson(testCase),
        );
        expect(restored).toEqual(testCase);
        expect(typeof restored).toBe(
          typeof testCase,
        );

        // Special check for objects
        if (
          typeof testCase === "object" &&
          testCase !== null
        ) {
          expect(Object.keys(restored)).toEqual(
            Object.keys(testCase),
          );
        }
      });
    });
  });
});
