import { describe, it, expect } from "vitest";
import {
  createNominalDatum,
  isNominalDatum,
  unwrapNominalDatum,
  mapNominalDatum,
  toJsonReadyNominalDatum,
  isJsonReadyNominalDatum,
  toJson,
  fromJson,
  toJsonReady,
  fromJsonReady,
} from "plgg/index";

describe("NominalDatum", () => {
  describe("Basic creation and type checking", () => {
    it("should create a nominal datum with string brand and string value", () => {
      const nominal = createNominalDatum(
        "UserId",
        "user-123",
      );

      expect(nominal.__tag).toBe("UserId");
      expect(nominal.content).toBe("user-123");
      expect(
        isNominalDatum("UserId")(nominal),
      ).toBe(true);
      expect(
        isNominalDatum("ProductId")(nominal),
      ).toBe(false);
    });

    it("should create a nominal datum with number value", () => {
      const nominal = createNominalDatum(
        "Price",
        42.99,
      );

      expect(nominal.__tag).toBe("Price");
      expect(nominal.content).toBe(42.99);
      expect(
        isNominalDatum("Price")(nominal),
      ).toBe(true);
    });

    it("should create a nominal datum with boolean value", () => {
      const nominal = createNominalDatum(
        "IsActive",
        true,
      );

      expect(nominal.__tag).toBe("IsActive");
      expect(nominal.content).toBe(true);
      expect(
        isNominalDatum("IsActive")(nominal),
      ).toBe(true);
    });

    it("should create a nominal datum with BigInt value", () => {
      const nominal = createNominalDatum(
        "LargeId",
        123456789012345678901234567890n,
      );

      expect(nominal.__tag).toBe("LargeId");
      expect(nominal.content).toBe(
        123456789012345678901234567890n,
      );
      expect(typeof nominal.content).toBe(
        "bigint",
      );
      expect(
        isNominalDatum("LargeId")(nominal),
      ).toBe(true);
    });

    it("should create a nominal datum with object value", () => {
      const userData = {
        name: "Alice",
        age: 30,
      };
      const nominal = createNominalDatum(
        "UserData",
        userData,
      );

      expect(nominal.__tag).toBe("UserData");
      expect(nominal.content).toEqual(userData);
      expect(
        isNominalDatum("UserData")(nominal),
      ).toBe(true);
    });

    it("should create a nominal datum with array value", () => {
      const scores = [85, 92, 78, 95];
      const nominal = createNominalDatum(
        "Scores",
        scores,
      );

      expect(nominal.__tag).toBe("Scores");
      expect(nominal.content).toEqual(scores);
      expect(
        isNominalDatum("Scores")(nominal),
      ).toBe(true);
    });
  });

  describe("Type checking edge cases", () => {
    it("should reject non-nominal values", () => {
      const plainValue = "not-nominal";
      const plainObject = { value: 42 };
      const wrongStructure = { __tag: "Test" }; // missing content

      expect(
        isNominalDatum("Test")(plainValue),
      ).toBe(false);
      expect(
        isNominalDatum("Test")(plainObject),
      ).toBe(false);
      expect(
        isNominalDatum("Test")(wrongStructure),
      ).toBe(false);
    });

    it("should reject nominal datum with wrong brand", () => {
      const nominal = createNominalDatum(
        "UserId",
        "user-123",
      );

      expect(
        isNominalDatum("ProductId")(nominal),
      ).toBe(false);
      expect(
        isNominalDatum("OrderId")(nominal),
      ).toBe(false);
    });

    it("should reject nominal datum with non-datum content", () => {
      const invalidNominal = {
        __tag: "Invalid",
        content: undefined, // undefined is not a valid DatumCore
      };

      expect(
        isNominalDatum("Invalid")(invalidNominal),
      ).toBe(false);
    });
  });

  describe("Value unwrapping", () => {
    it("should unwrap string value", () => {
      const nominal = createNominalDatum(
        "UserId",
        "user-456",
      );
      const unwrapped =
        unwrapNominalDatum(nominal);

      expect(unwrapped).toBe("user-456");
      expect(typeof unwrapped).toBe("string");
    });

    it("should unwrap number value", () => {
      const nominal = createNominalDatum(
        "Amount",
        99.99,
      );
      const unwrapped =
        unwrapNominalDatum(nominal);

      expect(unwrapped).toBe(99.99);
      expect(typeof unwrapped).toBe("number");
    });

    it("should unwrap BigInt value", () => {
      const nominal = createNominalDatum(
        "Timestamp",
        1234567890123456789n,
      );
      const unwrapped =
        unwrapNominalDatum(nominal);

      expect(unwrapped).toBe(
        1234567890123456789n,
      );
      expect(typeof unwrapped).toBe("bigint");
    });

    it("should unwrap object value", () => {
      const userData = {
        id: "123",
        name: "Bob",
        active: true,
      };
      const nominal = createNominalDatum(
        "User",
        userData,
      );
      const unwrapped =
        unwrapNominalDatum(nominal);

      expect(unwrapped).toEqual(userData);
    });
  });

  describe("Mapping operations", () => {
    it("should map over string content", () => {
      const nominal = createNominalDatum(
        "Name",
        "alice",
      );
      const mapper = mapNominalDatum(
        (s: string) => s.toUpperCase(),
      );
      const mapped = mapper(nominal);

      expect(mapped.__tag).toBe("Name");
      expect(mapped.content).toBe("ALICE");
      expect(isNominalDatum("Name")(mapped)).toBe(
        true,
      );
    });

    it("should map over number content", () => {
      const nominal = createNominalDatum(
        "Count",
        5,
      );
      const mapper = mapNominalDatum(
        (n: number) => n * 2,
      );
      const mapped = mapper(nominal);

      expect(mapped.__tag).toBe("Count");
      expect(mapped.content).toBe(10);
      expect(
        isNominalDatum("Count")(mapped),
      ).toBe(true);
    });

    it("should map from one type to another", () => {
      const nominal = createNominalDatum(
        "IntValue",
        42,
      );
      const mapper = mapNominalDatum(
        (n: number) => n.toString(),
      );
      const mapped = mapper(nominal);

      expect(mapped.__tag).toBe("IntValue");
      expect(mapped.content).toBe("42");
      expect(typeof mapped.content).toBe(
        "string",
      );
    });

    it("should preserve brand when mapping", () => {
      const nominal = createNominalDatum(
        "CustomBrand",
        [1, 2, 3],
      );
      const mapper = mapNominalDatum(
        (arr: number[]) => [...arr, 4],
      );
      const mapped = mapper(nominal);

      expect(mapped.__tag).toBe("CustomBrand");
      expect(mapped.content).toEqual([
        1, 2, 3, 4,
      ]);
      expect(
        isNominalDatum("CustomBrand")(mapped),
      ).toBe(true);
    });
  });

  describe("Serialization/Deserialization", () => {
    it("should serialize and deserialize nominal datum with string", () => {
      const original = createNominalDatum(
        "Email",
        "test@example.com",
      );

      const jsonString = toJson(original);
      const restored = fromJson(jsonString);

      expect(restored).toEqual(original);
      if (isNominalDatum("Email")(restored)) {
        expect(unwrapNominalDatum(restored)).toBe(
          "test@example.com",
        );
      }
    });

    it("should serialize and deserialize nominal datum with number", () => {
      const original = createNominalDatum(
        "Score",
        87.5,
      );

      const jsonString = toJson(original);
      const restored = fromJson(jsonString);

      expect(restored).toEqual(original);
      expect(
        isNominalDatum("Score")(restored),
      ).toBe(true);
    });

    it("should serialize and deserialize nominal datum with BigInt", () => {
      const original = createNominalDatum(
        "Nonce",
        999888777666555444333222111n,
      );

      const jsonString = toJson(original);
      const restored = fromJson(jsonString);

      expect(restored).toEqual(original);
      expect(
        isNominalDatum("Nonce")(restored),
      ).toBe(true);
      if (isNominalDatum("Nonce")(restored)) {
        expect(
          typeof unwrapNominalDatum(restored),
        ).toBe("bigint");
        expect(unwrapNominalDatum(restored)).toBe(
          999888777666555444333222111n,
        );
      }
    });

    it("should serialize and deserialize nominal datum with object", () => {
      const addressData = {
        street: "123 Main St",
        city: "Anytown",
        zip: "12345",
      };
      const original = createNominalDatum(
        "Address",
        addressData,
      );

      const jsonString = toJson(original);
      const restored = fromJson(jsonString);

      expect(restored).toEqual(original);
      expect(
        isNominalDatum("Address")(restored),
      ).toBe(true);
    });

    it("should serialize and deserialize nominal datum with array", () => {
      const tags = [
        "urgent",
        "customer",
        "billing",
      ];
      const original = createNominalDatum(
        "Tags",
        tags,
      );

      const jsonString = toJson(original);
      const restored = fromJson(jsonString);

      expect(restored).toEqual(original);
      expect(
        isNominalDatum("Tags")(restored),
      ).toBe(true);
    });
  });

  describe("JsonReady conversion", () => {
    it("should convert nominal datum to JsonReady and back", () => {
      const original = createNominalDatum(
        "ProductId",
        "prod-789",
      );

      const jsonReady = toJsonReady(original);
      const restored = fromJsonReady(jsonReady);

      expect(restored).toEqual(original);
      expect(
        isNominalDatum("ProductId")(restored),
      ).toBe(true);
    });

    it("should use toJsonReadyNominalDatum directly", () => {
      const original = createNominalDatum(
        "OrderId",
        "order-456",
      );

      const jsonReady =
        toJsonReadyNominalDatum(original);
      expect(jsonReady.__tag).toBe("OrderId");
      expect(jsonReady.content).toBe("order-456");
      expect(
        isJsonReadyNominalDatum("OrderId")(
          jsonReady,
        ),
      ).toBe(true);
    });

    it("should convert BigInt nominal datum to JsonReady", () => {
      const original = createNominalDatum(
        "BlockNumber",
        1234567890123456789n,
      );

      const jsonReady =
        toJsonReadyNominalDatum(original);
      expect(jsonReady.__tag).toBe("BlockNumber");
      expect(
        isJsonReadyNominalDatum("BlockNumber")(
          jsonReady,
        ),
      ).toBe(true);
    });
  });

  describe("Brand separation", () => {
    it("should maintain type safety between different brands", () => {
      const userId = createNominalDatum(
        "UserId",
        "user-123",
      );
      const productId = createNominalDatum(
        "ProductId",
        "prod-456",
      );

      // Both have string content but different brands
      expect(userId.content).toBe("user-123");
      expect(productId.content).toBe("prod-456");
      expect(
        isNominalDatum("UserId")(userId),
      ).toBe(true);
      expect(
        isNominalDatum("ProductId")(productId),
      ).toBe(true);

      // Cross-brand checks should fail
      expect(
        isNominalDatum("UserId")(productId),
      ).toBe(false);
      expect(
        isNominalDatum("ProductId")(userId),
      ).toBe(false);
    });

    it("should allow same content with different brands", () => {
      const id1 = createNominalDatum(
        "Type1",
        "same-value",
      );
      const id2 = createNominalDatum(
        "Type2",
        "same-value",
      );

      expect(id1.content).toBe(id2.content);
      expect(id1.__tag).not.toBe(id2.__tag);
      expect(isNominalDatum("Type1")(id1)).toBe(
        true,
      );
      expect(isNominalDatum("Type2")(id2)).toBe(
        true,
      );
      expect(isNominalDatum("Type1")(id2)).toBe(
        false,
      );
      expect(isNominalDatum("Type2")(id1)).toBe(
        false,
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string brand and content", () => {
      const nominal = createNominalDatum(
        "EmptyContent",
        "",
      );

      expect(nominal.__tag).toBe("EmptyContent");
      expect(nominal.content).toBe("");
      expect(
        isNominalDatum("EmptyContent")(nominal),
      ).toBe(true);
    });

    it("should handle zero values", () => {
      const zeroNumber = createNominalDatum(
        "Zero",
        0,
      );
      const zeroBigInt = createNominalDatum(
        "ZeroBigInt",
        0n,
      );
      const falseBool = createNominalDatum(
        "False",
        false,
      );

      expect(
        isNominalDatum("Zero")(zeroNumber),
      ).toBe(true);
      expect(
        isNominalDatum("ZeroBigInt")(zeroBigInt),
      ).toBe(true);
      expect(
        isNominalDatum("False")(falseBool),
      ).toBe(true);

      expect(unwrapNominalDatum(zeroNumber)).toBe(
        0,
      );
      expect(unwrapNominalDatum(zeroBigInt)).toBe(
        0n,
      );
      expect(unwrapNominalDatum(falseBool)).toBe(
        false,
      );
    });

    it("should handle empty arrays and objects", () => {
      const emptyArray = createNominalDatum(
        "EmptyList",
        [],
      );
      const emptyObject = createNominalDatum(
        "EmptyObj",
        {},
      );

      expect(
        isNominalDatum("EmptyList")(emptyArray),
      ).toBe(true);
      expect(
        isNominalDatum("EmptyObj")(emptyObject),
      ).toBe(true);
      expect(
        unwrapNominalDatum(emptyArray),
      ).toEqual([]);
      expect(
        unwrapNominalDatum(emptyObject),
      ).toEqual({});
    });
  });
});

