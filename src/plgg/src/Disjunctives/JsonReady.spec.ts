import { describe, it, expect } from "vitest";
import {
  Datum,
  jsonEncode,
  jsonDecode,
  toJsonReady,
  fromJsonReady,
  box,
  I8,
  I16,
  I32,
  I64,
  I128,
  U8,
  U16,
  U32,
  U64,
  U128,
  Float,
  isI64,
  isI128,
  isU64,
  isU128,
  isFloat,
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
      const original = new Date(
        "2023-12-25T10:30:00.000Z",
      );
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      expect(restored).toEqual(original);
      expect(restored instanceof Date).toBe(true);
      expect(
        (restored as Date).toISOString(),
      ).toBe(original.toISOString());
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
        expect(restored instanceof Date).toBe(
          true,
        );
        expect((restored as Date).getTime()).toBe(
          original.getTime(),
        );
      });
    });
  });

  describe("Basic types round-trip", () => {
    describe("Signed integer types", () => {
      it("should handle I8 values", () => {
        const testValues = [-128, -1, 0, 1, 127];
        testValues.forEach((value) => {
          const original: I8 = box("I8")(value);
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          expect(restored).toEqual(original);

          // Test full JSON string round-trip
          const json = jsonEncode(original);
          const jsonRestored = jsonDecode(json);
          expect(jsonRestored).toEqual(original);
        });
      });

      it("should handle I16 values", () => {
        const testValues = [
          -32768, -1000, 0, 1000, 32767,
        ];
        testValues.forEach((value) => {
          const original: I16 = box("I16")(value);
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          expect(restored).toEqual(original);

          const json = jsonEncode(original);
          const jsonRestored = jsonDecode(json);
          expect(jsonRestored).toEqual(original);
        });
      });

      it("should handle I32 values", () => {
        const testValues = [
          -2147483648, -100000, 0, 100000,
          2147483647,
        ];
        testValues.forEach((value) => {
          const original: I32 = box("I32")(value);
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          expect(restored).toEqual(original);

          const json = jsonEncode(original);
          const jsonRestored = jsonDecode(json);
          expect(jsonRestored).toEqual(original);
        });
      });

      it("should handle I64 values", () => {
        const testValues = [
          -9223372036854775808n,
          -1000000000000n,
          0n,
          1000000000000n,
          9223372036854775807n,
        ];
        testValues.forEach((value) => {
          const original: I64 = box("I64")(value);
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          expect(restored).toEqual(original);
          if (isI64(restored)) {
            expect(typeof restored.content).toBe(
              "bigint",
            );
          }

          const json = jsonEncode(original);
          const jsonRestored = jsonDecode(json);
          expect(jsonRestored).toEqual(original);
          if (isI64(jsonRestored)) {
            expect(
              typeof jsonRestored.content,
            ).toBe("bigint");
          }
        });
      });

      it("should handle I128 values", () => {
        const testValues = [
          -170141183460469231731687303715884105728n,
          -1000000000000000000000000000000000000n,
          0n,
          1000000000000000000000000000000000000n,
          170141183460469231731687303715884105727n,
        ];
        testValues.forEach((value) => {
          const original: I128 =
            box("I128")(value);
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          expect(restored).toEqual(original);
          if (isI128(restored)) {
            expect(typeof restored.content).toBe(
              "bigint",
            );
          }

          const json = jsonEncode(original);
          const jsonRestored = jsonDecode(json);
          expect(jsonRestored).toEqual(original);
          if (isI128(jsonRestored)) {
            expect(
              typeof jsonRestored.content,
            ).toBe("bigint");
          }
        });
      });
    });

    describe("Unsigned integer types", () => {
      it("should handle U8 values", () => {
        const testValues = [0, 1, 128, 255];
        testValues.forEach((value) => {
          const original: U8 = box("U8")(value);
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          expect(restored).toEqual(original);

          const json = jsonEncode(original);
          const jsonRestored = jsonDecode(json);
          expect(jsonRestored).toEqual(original);
        });
      });

      it("should handle U16 values", () => {
        const testValues = [
          0, 1000, 32768, 65535,
        ];
        testValues.forEach((value) => {
          const original: U16 = box("U16")(value);
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          expect(restored).toEqual(original);

          const json = jsonEncode(original);
          const jsonRestored = jsonDecode(json);
          expect(jsonRestored).toEqual(original);
        });
      });

      it("should handle U32 values", () => {
        const testValues = [
          0, 100000, 2147483648, 4294967295,
        ];
        testValues.forEach((value) => {
          const original: U32 = box("U32")(value);
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          expect(restored).toEqual(original);

          const json = jsonEncode(original);
          const jsonRestored = jsonDecode(json);
          expect(jsonRestored).toEqual(original);
        });
      });

      it("should handle U64 values", () => {
        const testValues = [
          0n,
          1000000000000n,
          9223372036854775808n,
          18446744073709551615n,
        ];
        testValues.forEach((value) => {
          const original: U64 = box("U64")(value);
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          expect(restored).toEqual(original);
          if (isU64(restored)) {
            expect(typeof restored.content).toBe(
              "bigint",
            );
          }

          const json = jsonEncode(original);
          const jsonRestored = jsonDecode(json);
          expect(jsonRestored).toEqual(original);
          if (isU64(jsonRestored)) {
            expect(
              typeof jsonRestored.content,
            ).toBe("bigint");
          }
        });
      });

      it("should handle U128 values", () => {
        const testValues = [
          0n,
          1000000000000000000000000000000000000n,
          170141183460469231731687303715884105728n,
          340282366920938463463374607431768211455n,
        ];
        testValues.forEach((value) => {
          const original: U128 =
            box("U128")(value);
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          expect(restored).toEqual(original);
          if (isU128(restored)) {
            expect(typeof restored.content).toBe(
              "bigint",
            );
          }

          const json = jsonEncode(original);
          const jsonRestored = jsonDecode(json);
          expect(jsonRestored).toEqual(original);
          if (isU128(jsonRestored)) {
            expect(
              typeof jsonRestored.content,
            ).toBe("bigint");
          }
        });
      });
    });

    describe("Floating-point types", () => {
      it("should handle Float values", () => {
        const testValues = [
          -123.456,
          -1.0,
          0.0,
          1.0,
          3.14159,
          123.456,
          Number.MAX_SAFE_INTEGER - 1,
          Number.MIN_SAFE_INTEGER + 1,
        ];
        testValues.forEach((value) => {
          const original: Float =
            box("Float")(value);
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          expect(restored).toEqual(original);
          if (isFloat(restored)) {
            expect(typeof restored.content).toBe(
              "number",
            );
          }

          const json = jsonEncode(original);
          const jsonRestored = jsonDecode(json);
          expect(jsonRestored).toEqual(original);
          if (isFloat(jsonRestored)) {
            expect(
              typeof jsonRestored.content,
            ).toBe("number");
          }
        });
      });

      it("should handle Float edge cases", () => {
        const testValues = [
          0.0,
          1e-10,
          1e10,
          Number.EPSILON,
          Number.MAX_VALUE,
          Number.MIN_VALUE,
        ];
        testValues.forEach((value) => {
          const original: Float =
            box("Float")(value);
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          expect(restored).toEqual(original);

          const json = jsonEncode(original);
          const jsonRestored = jsonDecode(json);
          expect(jsonRestored).toEqual(original);
        });
      });

      it("should handle -0 specially (loses sign through JSON)", () => {
        const original: Float = box("Float")(-0);
        const jsonReady = toJsonReady(original);
        const restored = fromJsonReady(jsonReady);
        expect(restored).toEqual(original);

        // Note: -0 becomes +0 through JSON serialization, this is expected behavior
        const json = jsonEncode(original);
        const jsonRestored = jsonDecode(json);
        const expected: Float = box("Float")(0); // -0 becomes +0
        expect(jsonRestored).toEqual(expected);
      });
    });

    describe("Mixed Basic types", () => {
      it("should handle objects containing multiple Basic types", () => {
        const original = {
          i8: box("I8")(-128),
          i16: box("I16")(-32768),
          i32: box("I32")(-2147483648),
          i64: box("I64")(-9223372036854775808n),
          i128: box("I128")(
            -170141183460469231731687303715884105728n,
          ),
          u8: box("U8")(255),
          u16: box("U16")(65535),
          u32: box("U32")(4294967295),
          u64: box("U64")(18446744073709551615n),
          u128: box("U128")(
            340282366920938463463374607431768211455n,
          ),
          float: box("Float")(3.14159),
        };

        const jsonReady = toJsonReady(original);
        const restored = fromJsonReady(jsonReady);
        expect(restored).toEqual(original);

        // Verify bigint types are preserved
        const restoredAny = restored as any;
        expect(
          typeof restoredAny.i64.content,
        ).toBe("bigint");
        expect(
          typeof restoredAny.i128.content,
        ).toBe("bigint");
        expect(
          typeof restoredAny.u64.content,
        ).toBe("bigint");
        expect(
          typeof restoredAny.u128.content,
        ).toBe("bigint");
        expect(
          typeof restoredAny.float.content,
        ).toBe("number");

        // Test full JSON string round-trip
        const json = jsonEncode(original);
        const jsonRestored = jsonDecode(json);
        expect(jsonRestored).toEqual(original);

        const jsonRestoredAny =
          jsonRestored as any;
        expect(
          typeof jsonRestoredAny.i64.content,
        ).toBe("bigint");
        expect(
          typeof jsonRestoredAny.i128.content,
        ).toBe("bigint");
        expect(
          typeof jsonRestoredAny.u64.content,
        ).toBe("bigint");
        expect(
          typeof jsonRestoredAny.u128.content,
        ).toBe("bigint");
        expect(
          typeof jsonRestoredAny.float.content,
        ).toBe("number");
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
      const json = jsonEncode(original);
      const restored = jsonDecode(json);
      expect(restored).toBe(original);
    });

    it("should serialize and deserialize numbers", () => {
      const original = 123.456;
      const json = jsonEncode(original);
      const restored = jsonDecode(json);
      expect(restored).toBe(original);
    });

    it("should serialize and deserialize booleans", () => {
      const original = true;
      const json = jsonEncode(original);
      const restored = jsonDecode(json);
      expect(restored).toBe(original);
    });

    it("should serialize and deserialize BigInt", () => {
      const original =
        987654321098765432109876543210n;
      const json = jsonEncode(original);
      const restored = jsonDecode(json);
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
      const original = new Date(
        "2023-12-25T15:30:45.123Z",
      );
      const json = jsonEncode(original);
      const restored = jsonDecode(json);
      expect(restored).toEqual(original);
      expect(restored instanceof Date).toBe(true);
      expect(
        (restored as Date).toISOString(),
      ).toBe(original.toISOString());

      // Verify the JSON structure contains the ISO string
      const parsed = JSON.parse(json);
      expect(parsed).toBe(
        "2023-12-25T15:30:45.123Z",
      );
    });

    it("should serialize and deserialize complex objects", () => {
      const original = {
        metadata: {
          version: 2,
          timestamp: 1234567890123n,
          active: true,
          createdAt: new Date(
            "2023-01-15T10:00:00.000Z",
          ),
        },
        summary: {
          total: 999999999999999999n,
          processed: true,
          lastUpdated: new Date(
            "2023-12-25T15:30:45.123Z",
          ),
        },
      };

      const json = jsonEncode(original);
      const restored = jsonDecode(json);
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
        restoredAny.metadata.createdAt instanceof
          Date,
      ).toBe(true);
      expect(
        restoredAny.summary.lastUpdated instanceof
          Date,
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
      const jsonObj = jsonEncode(emptyObj);
      const restoredObj = jsonDecode(jsonObj);
      expect(restoredObj).toEqual(emptyObj);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero values", () => {
      expect(jsonDecode(jsonEncode(0))).toBe(0);
      expect(jsonDecode(jsonEncode(0n))).toBe(0n);
      expect(jsonDecode(jsonEncode(""))).toBe("");
      expect(jsonDecode(jsonEncode(false))).toBe(
        false,
      );
    });

    it("should handle Time edge cases", () => {
      // Test Unix epoch
      const epoch = new Date(0);
      expect(
        jsonDecode(jsonEncode(epoch)),
      ).toEqual(epoch);

      // Test far future date
      const farFuture = new Date(
        "2099-12-31T23:59:59.999Z",
      );
      expect(
        jsonDecode(jsonEncode(farFuture)),
      ).toEqual(farFuture);

      // Test leap year date
      const leapYear = new Date(
        "2024-02-29T12:00:00.000Z",
      );
      expect(
        jsonDecode(jsonEncode(leapYear)),
      ).toEqual(leapYear);

      // Test current time with millisecond precision
      const now = new Date();
      const restored = jsonDecode(
        jsonEncode(now),
      );
      expect(restored).toEqual(now);
      expect((restored as Date).getTime()).toBe(
        now.getTime(),
      );
    });

    it("should handle negative numbers", () => {
      expect(jsonDecode(jsonEncode(-42))).toBe(
        -42,
      );
      expect(
        jsonDecode(jsonEncode(-123.456)),
      ).toBe(-123.456);
    });

    it("should handle negative BigInt", () => {
      const negativeBigInt = -999999999999999999n;
      expect(
        jsonDecode(jsonEncode(negativeBigInt)),
      ).toBe(negativeBigInt);
    });

    it("should preserve object property order (when possible)", () => {
      const original = {
        z: "last",
        a: "first",
        m: "middle",
      };
      const restored = jsonDecode(
        jsonEncode(original),
      );
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
            time: new Date(
              "2023-12-01T09:30:00.000Z",
            ),
          },
        },
      ];

      testCases.forEach((testCase) => {
        const restored = jsonDecode(
          jsonEncode(testCase),
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
