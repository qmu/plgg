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

    it("should handle Time values", () => {
      const original = new Date("2023-12-25T10:30:00.000Z");
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      expect(restored).toEqual(original);
      expect(restored instanceof Date).toBe(true);
      expect((restored as Date).toISOString()).toBe(original.toISOString());
    });

    it("should handle Time values with different dates", () => {
      const testDates = [
        new Date("1970-01-01T00:00:00.000Z"), // Unix epoch
        new Date("2000-01-01T12:00:00.000Z"), // Y2K
        new Date("2023-02-28T23:59:59.999Z"), // Leap year edge
        new Date(), // Current time
      ];

      testDates.forEach((original) => {
        const jsonReady = toJsonReady(original);
        const restored = fromJsonReady(jsonReady);
        expect(restored).toEqual(original);
        expect(restored instanceof Date).toBe(true);
        expect((restored as Date).getTime()).toBe(original.getTime());
      });
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

    it("should serialize and deserialize Time", () => {
      const original = new Date("2023-12-25T15:30:45.123Z");
      const json = toJson(original);
      const restored = fromJson(json);
      expect(restored).toEqual(original);
      expect(restored instanceof Date).toBe(true);
      expect((restored as Date).toISOString()).toBe(original.toISOString());

      // Verify the JSON structure contains the ISO string
      const parsed = JSON.parse(json);
      expect(parsed).toBe("2023-12-25T15:30:45.123Z");
    });

    it("should serialize and deserialize complex objects", () => {
      const original = {
        metadata: {
          version: 2,
          timestamp: 1234567890123n,
          active: true,
          createdAt: new Date("2023-01-15T10:00:00.000Z"),
        },
        summary: {
          total: 999999999999999999n,
          processed: true,
          lastUpdated: new Date("2023-12-25T15:30:45.123Z"),
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

      // Verify Date types are preserved
      expect(
        restoredAny.metadata.createdAt instanceof Date,
      ).toBe(true);
      expect(
        restoredAny.summary.lastUpdated instanceof Date,
      ).toBe(true);
      expect(
        restoredAny.metadata.createdAt.toISOString(),
      ).toBe("2023-01-15T10:00:00.000Z");
      expect(
        restoredAny.summary.lastUpdated.toISOString(),
      ).toBe("2023-12-25T15:30:45.123Z");
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

    it("should handle Time edge cases", () => {
      // Test Unix epoch
      const epoch = new Date(0);
      expect(fromJson(toJson(epoch))).toEqual(epoch);

      // Test far future date
      const farFuture = new Date("2099-12-31T23:59:59.999Z");
      expect(fromJson(toJson(farFuture))).toEqual(farFuture);

      // Test leap year date
      const leapYear = new Date("2024-02-29T12:00:00.000Z");
      expect(fromJson(toJson(leapYear))).toEqual(leapYear);

      // Test current time with millisecond precision
      const now = new Date();
      const restored = fromJson(toJson(now));
      expect(restored).toEqual(now);
      expect((restored as Date).getTime()).toBe(now.getTime());
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
        new Date("2023-06-15T12:00:00.000Z"),
        { key: "value" },
        { nested: { deep: true } },
        {
          mixed: {
            str: "test",
            num: 1,
            bool: false,
            big: 456n,
            time: new Date("2023-12-01T09:30:00.000Z"),
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
