import {
  describe,
  it,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
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
  isObjLike,
  hasProp,
  atProp,
  matchResult,
} from "plgg/index";

// Reads a dynamic property off an unknown value as `unknown`, or
// `undefined` if the value is not an object or lacks the key. Uses the
// idiomatic `atProp` accessor (which returns a `Result`) so the dynamic
// index stays type-safe — no string-keyed indexing of the `Datum`
// union, no cast.
const readProp = (
  value: unknown,
  key: string,
): unknown =>
  matchResult<unknown, unknown, unknown>(
    () => undefined,
    (v) => v,
  )(atProp(key)(value));

describe("JsonReady", () => {
  describe("Atomic types round-trip", () => {
    it("should handle string values", () => {
      const original = "hello world";
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      return check(restored, toBe(original));
    });

    it("should handle number values", () => {
      const original = 42.5;
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      return check(restored, toBe(original));
    });

    it("should handle boolean values", () => {
      const original = true;
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);

      const originalFalse = false;
      const jsonReadyFalse = toJsonReady(
        originalFalse,
      );
      const restoredFalse = fromJsonReady(
        jsonReadyFalse,
      );
      return all([
        check(restored, toBe(original)),
        check(restoredFalse, toBe(originalFalse)),
      ]);
    });

    it("should handle BigInt values", () => {
      const original =
        123456789012345678901234567890n;
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      return all([
        check(restored, toBe(original)),
        check(typeof restored, toBe("bigint")),
      ]);
    });

    it("should handle Time values", () => {
      const original = new Date(
        "2023-12-25T10:30:00.000Z",
      );
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      return all([
        check(restored, toEqual(original)),
        check(
          restored instanceof Date,
          toBe(true),
        ),
        check(
          restored instanceof Date
            ? restored.toISOString()
            : undefined,
          toBe(original.toISOString()),
        ),
      ]);
    });

    it("should handle Time values with different dates", () => {
      const testDates = [
        new Date("1970-01-01T00:00:00.000Z"),
        new Date("2000-01-01T12:00:00.000Z"),
        new Date("2023-02-28T23:59:59.999Z"),
        new Date(),
      ];

      return all(
        testDates.map((original) => {
          const jsonReady = toJsonReady(original);
          const restored =
            fromJsonReady(jsonReady);
          return all([
            check(restored, toEqual(original)),
            check(
              restored instanceof Date,
              toBe(true),
            ),
            check(
              restored instanceof Date
                ? restored.getTime()
                : undefined,
              toBe(original.getTime()),
            ),
          ]);
        }),
      );
    });
  });

  describe("Basic types round-trip", () => {
    describe("Signed integer types", () => {
      it("should handle I8 values", () => {
        const testValues = [-128, -1, 0, 1, 127];
        return all(
          testValues.map((value) => {
            const original: I8 = box("I8")(value);
            const jsonReady =
              toJsonReady(original);
            const restored =
              fromJsonReady(jsonReady);

            const json = jsonEncode(original);
            const jsonRestored = jsonDecode(json);
            return all([
              check(restored, toEqual(original)),
              check(
                jsonRestored,
                toEqual(original),
              ),
            ]);
          }),
        );
      });

      it("should handle I16 values", () => {
        const testValues = [
          -32768, -1000, 0, 1000, 32767,
        ];
        return all(
          testValues.map((value) => {
            const original: I16 =
              box("I16")(value);
            const jsonReady =
              toJsonReady(original);
            const restored =
              fromJsonReady(jsonReady);

            const json = jsonEncode(original);
            const jsonRestored = jsonDecode(json);
            return all([
              check(restored, toEqual(original)),
              check(
                jsonRestored,
                toEqual(original),
              ),
            ]);
          }),
        );
      });

      it("should handle I32 values", () => {
        const testValues = [
          -2147483648, -100000, 0, 100000,
          2147483647,
        ];
        return all(
          testValues.map((value) => {
            const original: I32 =
              box("I32")(value);
            const jsonReady =
              toJsonReady(original);
            const restored =
              fromJsonReady(jsonReady);

            const json = jsonEncode(original);
            const jsonRestored = jsonDecode(json);
            return all([
              check(restored, toEqual(original)),
              check(
                jsonRestored,
                toEqual(original),
              ),
            ]);
          }),
        );
      });

      it("should handle I64 values", () => {
        const testValues = [
          -9223372036854775808n,
          -1000000000000n,
          0n,
          1000000000000n,
          9223372036854775807n,
        ];
        return all(
          testValues.map((value) => {
            const original: I64 =
              box("I64")(value);
            const jsonReady =
              toJsonReady(original);
            const restored =
              fromJsonReady(jsonReady);

            const json = jsonEncode(original);
            const jsonRestored = jsonDecode(json);
            return all([
              check(restored, toEqual(original)),
              check(
                isI64(restored)
                  ? typeof restored.content
                  : undefined,
                toBe("bigint"),
              ),
              check(
                jsonRestored,
                toEqual(original),
              ),
              check(
                isI64(jsonRestored)
                  ? typeof jsonRestored.content
                  : undefined,
                toBe("bigint"),
              ),
            ]);
          }),
        );
      });

      it("should handle I128 values", () => {
        const testValues = [
          -170141183460469231731687303715884105728n,
          -1000000000000000000000000000000000000n,
          0n,
          1000000000000000000000000000000000000n,
          170141183460469231731687303715884105727n,
        ];
        return all(
          testValues.map((value) => {
            const original: I128 =
              box("I128")(value);
            const jsonReady =
              toJsonReady(original);
            const restored =
              fromJsonReady(jsonReady);

            const json = jsonEncode(original);
            const jsonRestored = jsonDecode(json);
            return all([
              check(restored, toEqual(original)),
              check(
                isI128(restored)
                  ? typeof restored.content
                  : undefined,
                toBe("bigint"),
              ),
              check(
                jsonRestored,
                toEqual(original),
              ),
              check(
                isI128(jsonRestored)
                  ? typeof jsonRestored.content
                  : undefined,
                toBe("bigint"),
              ),
            ]);
          }),
        );
      });
    });

    describe("Unsigned integer types", () => {
      it("should handle U8 values", () => {
        const testValues = [0, 1, 128, 255];
        return all(
          testValues.map((value) => {
            const original: U8 = box("U8")(value);
            const jsonReady =
              toJsonReady(original);
            const restored =
              fromJsonReady(jsonReady);

            const json = jsonEncode(original);
            const jsonRestored = jsonDecode(json);
            return all([
              check(restored, toEqual(original)),
              check(
                jsonRestored,
                toEqual(original),
              ),
            ]);
          }),
        );
      });

      it("should handle U16 values", () => {
        const testValues = [
          0, 1000, 32768, 65535,
        ];
        return all(
          testValues.map((value) => {
            const original: U16 =
              box("U16")(value);
            const jsonReady =
              toJsonReady(original);
            const restored =
              fromJsonReady(jsonReady);

            const json = jsonEncode(original);
            const jsonRestored = jsonDecode(json);
            return all([
              check(restored, toEqual(original)),
              check(
                jsonRestored,
                toEqual(original),
              ),
            ]);
          }),
        );
      });

      it("should handle U32 values", () => {
        const testValues = [
          0, 100000, 2147483648, 4294967295,
        ];
        return all(
          testValues.map((value) => {
            const original: U32 =
              box("U32")(value);
            const jsonReady =
              toJsonReady(original);
            const restored =
              fromJsonReady(jsonReady);

            const json = jsonEncode(original);
            const jsonRestored = jsonDecode(json);
            return all([
              check(restored, toEqual(original)),
              check(
                jsonRestored,
                toEqual(original),
              ),
            ]);
          }),
        );
      });

      it("should handle U64 values", () => {
        const testValues = [
          0n,
          1000000000000n,
          9223372036854775808n,
          18446744073709551615n,
        ];
        return all(
          testValues.map((value) => {
            const original: U64 =
              box("U64")(value);
            const jsonReady =
              toJsonReady(original);
            const restored =
              fromJsonReady(jsonReady);

            const json = jsonEncode(original);
            const jsonRestored = jsonDecode(json);
            return all([
              check(restored, toEqual(original)),
              check(
                isU64(restored)
                  ? typeof restored.content
                  : undefined,
                toBe("bigint"),
              ),
              check(
                jsonRestored,
                toEqual(original),
              ),
              check(
                isU64(jsonRestored)
                  ? typeof jsonRestored.content
                  : undefined,
                toBe("bigint"),
              ),
            ]);
          }),
        );
      });

      it("should handle U128 values", () => {
        const testValues = [
          0n,
          1000000000000000000000000000000000000n,
          170141183460469231731687303715884105728n,
          340282366920938463463374607431768211455n,
        ];
        return all(
          testValues.map((value) => {
            const original: U128 =
              box("U128")(value);
            const jsonReady =
              toJsonReady(original);
            const restored =
              fromJsonReady(jsonReady);

            const json = jsonEncode(original);
            const jsonRestored = jsonDecode(json);
            return all([
              check(restored, toEqual(original)),
              check(
                isU128(restored)
                  ? typeof restored.content
                  : undefined,
                toBe("bigint"),
              ),
              check(
                jsonRestored,
                toEqual(original),
              ),
              check(
                isU128(jsonRestored)
                  ? typeof jsonRestored.content
                  : undefined,
                toBe("bigint"),
              ),
            ]);
          }),
        );
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
        return all(
          testValues.map((value) => {
            const original: Float =
              box("Float")(value);
            const jsonReady =
              toJsonReady(original);
            const restored =
              fromJsonReady(jsonReady);

            const json = jsonEncode(original);
            const jsonRestored = jsonDecode(json);
            return all([
              check(restored, toEqual(original)),
              check(
                isFloat(restored)
                  ? typeof restored.content
                  : undefined,
                toBe("number"),
              ),
              check(
                jsonRestored,
                toEqual(original),
              ),
              check(
                isFloat(jsonRestored)
                  ? typeof jsonRestored.content
                  : undefined,
                toBe("number"),
              ),
            ]);
          }),
        );
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
        return all(
          testValues.map((value) => {
            const original: Float =
              box("Float")(value);
            const jsonReady =
              toJsonReady(original);
            const restored =
              fromJsonReady(jsonReady);

            const json = jsonEncode(original);
            const jsonRestored = jsonDecode(json);
            return all([
              check(restored, toEqual(original)),
              check(
                jsonRestored,
                toEqual(original),
              ),
            ]);
          }),
        );
      });

      it("should handle -0 specially (loses sign through JSON)", () => {
        const original: Float = box("Float")(-0);
        const jsonReady = toJsonReady(original);
        const restored = fromJsonReady(jsonReady);

        const json = jsonEncode(original);
        const jsonRestored = jsonDecode(json);
        const expected: Float = box("Float")(0);
        return all([
          check(restored, toEqual(original)),
          check(jsonRestored, toEqual(expected)),
        ]);
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

        const json = jsonEncode(original);
        const jsonRestored = jsonDecode(json);

        const contentType = (
          value: Datum,
          key: string,
        ): string | undefined => {
          const field = readProp(value, key);
          return isObjLike(field) &&
            hasProp(field, "content")
            ? typeof field.content
            : undefined;
        };

        return all([
          check(restored, toEqual(original)),
          check(
            contentType(restored, "i64"),
            toBe("bigint"),
          ),
          check(
            contentType(restored, "i128"),
            toBe("bigint"),
          ),
          check(
            contentType(restored, "u64"),
            toBe("bigint"),
          ),
          check(
            contentType(restored, "u128"),
            toBe("bigint"),
          ),
          check(
            contentType(restored, "float"),
            toBe("number"),
          ),
          check(jsonRestored, toEqual(original)),
          check(
            contentType(jsonRestored, "i64"),
            toBe("bigint"),
          ),
          check(
            contentType(jsonRestored, "i128"),
            toBe("bigint"),
          ),
          check(
            contentType(jsonRestored, "u64"),
            toBe("bigint"),
          ),
          check(
            contentType(jsonRestored, "u128"),
            toBe("bigint"),
          ),
          check(
            contentType(jsonRestored, "float"),
            toBe("number"),
          ),
        ]);
      });
    });
  });

  describe("Object types round-trip", () => {
    it("should handle simple objects", () => {
      const original = {
        name: "Alice",
        age: 30,
      };
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);
      return check(restored, toEqual(original));
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
      return check(restored, toEqual(original));
    });

    it("should handle objects with BigInt values", () => {
      const original = {
        id: 123n,
        balance: 456789012345678901234567890n,
        name: "Charlie",
      };
      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);

      const typeOfProp = (
        value: Datum,
        key: string,
      ): string | undefined =>
        isObjLike(value) && hasProp(value, key)
          ? typeof readProp(value, key)
          : undefined;

      return all([
        check(restored, toEqual(original)),
        check(
          typeOfProp(restored, "id"),
          toBe("bigint"),
        ),
        check(
          typeOfProp(restored, "balance"),
          toBe("bigint"),
        ),
      ]);
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

      const deepBigintType = (
        value: Datum,
      ): string | undefined => {
        if (
          !isObjLike(value) ||
          !hasProp(value, "level1")
        ) {
          return undefined;
        }
        const l1 = value.level1;
        if (
          !isObjLike(l1) ||
          !hasProp(l1, "level2")
        ) {
          return undefined;
        }
        const l2 = l1.level2;
        if (
          !isObjLike(l2) ||
          !hasProp(l2, "level3")
        ) {
          return undefined;
        }
        const l3 = l2.level3;
        return isObjLike(l3) &&
          hasProp(l3, "bigint")
          ? typeof l3.bigint
          : undefined;
      };

      return all([
        check(restored, toEqual(original)),
        check(
          deepBigintType(restored),
          toBe("bigint"),
        ),
      ]);
    });
  });

  describe("JSON string serialization", () => {
    it("should serialize and deserialize strings", () => {
      const original = "test string";
      const json = jsonEncode(original);
      const restored = jsonDecode(json);
      return check(restored, toBe(original));
    });

    it("should serialize and deserialize numbers", () => {
      const original = 123.456;
      const json = jsonEncode(original);
      const restored = jsonDecode(json);
      return check(restored, toBe(original));
    });

    it("should serialize and deserialize booleans", () => {
      const original = true;
      const json = jsonEncode(original);
      const restored = jsonDecode(json);
      return check(restored, toBe(original));
    });

    it("should serialize and deserialize BigInt", () => {
      const original =
        987654321098765432109876543210n;
      const json = jsonEncode(original);
      const restored = jsonDecode(json);

      const parsed: unknown = JSON.parse(json);
      return all([
        check(restored, toBe(original)),
        check(typeof restored, toBe("bigint")),
        check(
          {
            type: "bigint",
            value:
              "987654321098765432109876543210",
          },
          toEqual(parsed),
        ),
      ]);
    });

    it("should serialize and deserialize Time", () => {
      const original = new Date(
        "2023-12-25T15:30:45.123Z",
      );
      const json = jsonEncode(original);
      const restored = jsonDecode(json);

      const parsed: unknown = JSON.parse(json);
      return all([
        check(restored, toEqual(original)),
        check(
          restored instanceof Date,
          toBe(true),
        ),
        check(
          restored instanceof Date
            ? restored.toISOString()
            : undefined,
          toBe(original.toISOString()),
        ),
        check(
          "2023-12-25T15:30:45.123Z",
          toBe(parsed),
        ),
      ]);
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

      const sectionProp = (
        value: Datum,
        section: string,
        key: string,
      ): unknown =>
        readProp(readProp(value, section), key);

      const timestamp = sectionProp(
        restored,
        "metadata",
        "timestamp",
      );
      const total = sectionProp(
        restored,
        "summary",
        "total",
      );
      const createdAt = sectionProp(
        restored,
        "metadata",
        "createdAt",
      );
      const lastUpdated = sectionProp(
        restored,
        "summary",
        "lastUpdated",
      );

      return all([
        check(restored, toEqual(original)),
        check(typeof timestamp, toBe("bigint")),
        check(typeof total, toBe("bigint")),
        check(
          createdAt instanceof Date,
          toBe(true),
        ),
        check(
          lastUpdated instanceof Date,
          toBe(true),
        ),
        check(
          createdAt instanceof Date
            ? createdAt.toISOString()
            : undefined,
          toBe("2023-01-15T10:00:00.000Z"),
        ),
        check(
          lastUpdated instanceof Date
            ? lastUpdated.toISOString()
            : undefined,
          toBe("2023-12-25T15:30:45.123Z"),
        ),
      ]);
    });

    it("should handle empty objects", () => {
      const emptyObj = {};
      const jsonObj = jsonEncode(emptyObj);
      const restoredObj = jsonDecode(jsonObj);
      return check(
        restoredObj,
        toEqual(emptyObj),
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle zero values", () =>
      all([
        check(jsonDecode(jsonEncode(0)), toBe(0)),
        check(
          jsonDecode(jsonEncode(0n)),
          toBe(0n),
        ),
        check(
          jsonDecode(jsonEncode("")),
          toBe(""),
        ),
        check(
          jsonDecode(jsonEncode(false)),
          toBe(false),
        ),
      ]));

    it("should handle Time edge cases", () => {
      const epoch = new Date(0);
      const farFuture = new Date(
        "2099-12-31T23:59:59.999Z",
      );
      const leapYear = new Date(
        "2024-02-29T12:00:00.000Z",
      );
      const now = new Date();
      const restored = jsonDecode(
        jsonEncode(now),
      );
      return all([
        check(
          jsonDecode(jsonEncode(epoch)),
          toEqual(epoch),
        ),
        check(
          jsonDecode(jsonEncode(farFuture)),
          toEqual(farFuture),
        ),
        check(
          jsonDecode(jsonEncode(leapYear)),
          toEqual(leapYear),
        ),
        check(restored, toEqual(now)),
        check(
          restored instanceof Date
            ? restored.getTime()
            : undefined,
          toBe(now.getTime()),
        ),
      ]);
    });

    it("should handle negative numbers", () =>
      all([
        check(
          jsonDecode(jsonEncode(-42)),
          toBe(-42),
        ),
        check(
          jsonDecode(jsonEncode(-123.456)),
          toBe(-123.456),
        ),
      ]));

    it("should handle negative BigInt", () => {
      const negativeBigInt = -999999999999999999n;
      return check(
        jsonDecode(jsonEncode(negativeBigInt)),
        toBe(negativeBigInt),
      );
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
      return all([
        check(restored, toEqual(original)),
        check(
          isObjLike(restored)
            ? Object.keys(restored)
            : undefined,
          toEqual(Object.keys(original)),
        ),
      ]);
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

      return all(
        testCases.map((testCase) => {
          const restored = jsonDecode(
            jsonEncode(testCase),
          );
          const keyCheck =
            typeof testCase === "object" &&
            testCase !== null &&
            isObjLike(restored)
              ? check(
                  Object.keys(restored),
                  toEqual(Object.keys(testCase)),
                )
              : check(true, toBe(true));
          return all([
            check(restored, toEqual(testCase)),
            check(
              typeof restored,
              toBe(typeof testCase),
            ),
            keyCheck,
          ]);
        }),
      );
    });
  });
});
