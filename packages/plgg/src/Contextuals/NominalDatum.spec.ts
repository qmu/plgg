import {
  describe,
  it,
  check,
  all,
  toBe,
  toEqual,
  not,
} from "plgg-test";
import {
  createNominalDatum,
  isNominalDatum,
  unwrapNominalDatum,
  mapNominalDatum,
  toJsonReadyNominalDatum,
  isJsonReadyNominalDatum,
  jsonEncode,
  jsonDecode,
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

      return all([
        check(nominal.__tag, toBe("UserId")),
        check(nominal.content, toBe("user-123")),
        check(
          isNominalDatum(nominal),
          toBe(true),
        ),
      ]);
    });

    it("should create a nominal datum with number value", () => {
      const nominal = createNominalDatum(
        "Price",
        42.99,
      );

      return all([
        check(nominal.__tag, toBe("Price")),
        check(nominal.content, toBe(42.99)),
        check(
          isNominalDatum(nominal),
          toBe(true),
        ),
      ]);
    });

    it("should create a nominal datum with boolean value", () => {
      const nominal = createNominalDatum(
        "IsActive",
        true,
      );

      return all([
        check(nominal.__tag, toBe("IsActive")),
        check(nominal.content, toBe(true)),
        check(
          isNominalDatum(nominal),
          toBe(true),
        ),
      ]);
    });

    it("should create a nominal datum with BigInt value", () => {
      const nominal = createNominalDatum(
        "LargeId",
        123456789012345678901234567890n,
      );

      return all([
        check(nominal.__tag, toBe("LargeId")),
        check(
          nominal.content,
          toBe(123456789012345678901234567890n),
        ),
        check(
          typeof nominal.content,
          toBe("bigint"),
        ),
        check(
          isNominalDatum(nominal),
          toBe(true),
        ),
      ]);
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

      return all([
        check(nominal.__tag, toBe("UserData")),
        check(nominal.content, toEqual(userData)),
        check(
          isNominalDatum(nominal),
          toBe(true),
        ),
      ]);
    });

    it("should create a nominal datum with array value", () => {
      const scores = [85, 92, 78, 95];
      const nominal = createNominalDatum(
        "Scores",
        scores,
      );

      return all([
        check(nominal.__tag, toBe("Scores")),
        check(nominal.content, toEqual(scores)),
        check(
          isNominalDatum(nominal),
          toBe(true),
        ),
      ]);
    });
  });

  describe("Type checking edge cases", () => {
    it("should reject non-nominal values", () => {
      const plainValue = "not-nominal";
      const plainObject = { value: 42 };
      const wrongStructure = { __tag: "Test" }; // missing content

      return all([
        check(
          isNominalDatum(plainValue),
          toBe(false),
        ),
        check(
          isNominalDatum(plainObject),
          toBe(false),
        ),
        check(
          isNominalDatum(wrongStructure),
          toBe(false),
        ),
      ]);
    });

    it("should reject nominal datum with non-datum content", () => {
      const invalidNominal = {
        __tag: "Invalid",
        content: undefined, // undefined is not a valid DatumCore
      };

      return check(
        isNominalDatum(invalidNominal),
        toBe(false),
      );
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

      return all([
        check(unwrapped, toBe("user-456")),
        check(typeof unwrapped, toBe("string")),
      ]);
    });

    it("should unwrap number value", () => {
      const nominal = createNominalDatum(
        "Amount",
        99.99,
      );
      const unwrapped =
        unwrapNominalDatum(nominal);

      return all([
        check(unwrapped, toBe(99.99)),
        check(typeof unwrapped, toBe("number")),
      ]);
    });

    it("should unwrap BigInt value", () => {
      const nominal = createNominalDatum(
        "Timestamp",
        1234567890123456789n,
      );
      const unwrapped =
        unwrapNominalDatum(nominal);

      return all([
        check(
          unwrapped,
          toBe(1234567890123456789n),
        ),
        check(typeof unwrapped, toBe("bigint")),
      ]);
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

      return check(unwrapped, toEqual(userData));
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

      return all([
        check(mapped.__tag, toBe("Name")),
        check(mapped.content, toBe("ALICE")),
        check(
          isNominalDatum(mapped),
          toBe(true),
        ),
      ]);
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

      return all([
        check(mapped.__tag, toBe("Count")),
        check(mapped.content, toBe(10)),
        check(
          isNominalDatum(mapped),
          toBe(true),
        ),
      ]);
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

      return all([
        check(mapped.__tag, toBe("IntValue")),
        check(mapped.content, toBe("42")),
        check(
          typeof mapped.content,
          toBe("string"),
        ),
      ]);
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

      return all([
        check(mapped.__tag, toBe("CustomBrand")),
        check(
          mapped.content,
          toEqual([1, 2, 3, 4]),
        ),
        check(
          isNominalDatum(mapped),
          toBe(true),
        ),
      ]);
    });
  });

  describe("Serialization/Deserialization", () => {
    it("should serialize and deserialize nominal datum with string", () => {
      const original = createNominalDatum(
        "Email",
        "test@example.com",
      );

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(restored, toEqual(original)),
        ...(isNominalDatum(restored)
          ? [
              check(
                unwrapNominalDatum(restored),
                toBe("test@example.com"),
              ),
            ]
          : []),
      ]);
    });

    it("should serialize and deserialize nominal datum with number", () => {
      const original = createNominalDatum(
        "Score",
        87.5,
      );

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(restored, toEqual(original)),
        check(
          isNominalDatum(restored),
          toBe(true),
        ),
      ]);
    });

    it("should serialize and deserialize nominal datum with BigInt", () => {
      const original = createNominalDatum(
        "Nonce",
        999888777666555444333222111n,
      );

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(restored, toEqual(original)),
        check(
          isNominalDatum(restored),
          toBe(true),
        ),
        ...(isNominalDatum(restored)
          ? [
              check(
                typeof unwrapNominalDatum(
                  restored,
                ),
                toBe("bigint"),
              ),
              check(
                unwrapNominalDatum(restored),
                toBe(
                  999888777666555444333222111n,
                ),
              ),
            ]
          : []),
      ]);
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

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(restored, toEqual(original)),
        check(
          isNominalDatum(restored),
          toBe(true),
        ),
      ]);
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

      const jsonString = jsonEncode(original);
      const restored = jsonDecode(jsonString);

      return all([
        check(restored, toEqual(original)),
        check(
          isNominalDatum(restored),
          toBe(true),
        ),
      ]);
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

      return all([
        check(restored, toEqual(original)),
        check(
          isNominalDatum(restored),
          toBe(true),
        ),
      ]);
    });

    it("should use toJsonReadyNominalDatum directly", () => {
      const original = createNominalDatum(
        "OrderId",
        "order-456",
      );

      const jsonReady =
        toJsonReadyNominalDatum(original);
      return all([
        check(jsonReady.__tag, toBe("OrderId")),
        check(
          jsonReady.content,
          toBe("order-456"),
        ),
        check(
          isJsonReadyNominalDatum(jsonReady),
          toBe(true),
        ),
      ]);
    });

    it("should convert BigInt nominal datum to JsonReady", () => {
      const original = createNominalDatum(
        "BlockNumber",
        1234567890123456789n,
      );

      const jsonReady =
        toJsonReadyNominalDatum(original);
      return all([
        check(
          jsonReady.__tag,
          toBe("BlockNumber"),
        ),
        check(
          isJsonReadyNominalDatum(jsonReady),
          toBe(true),
        ),
      ]);
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
      return all([
        check(userId.content, toBe("user-123")),
        check(
          productId.content,
          toBe("prod-456"),
        ),
        check(
          isNominalDatum(userId),
          toBe(true),
        ),
        check(
          isNominalDatum(productId),
          toBe(true),
        ),
      ]);
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

      return all([
        check(id1.content, toBe(id2.content)),
        check(id1.__tag, not(toBe(id2.__tag))),
        check(isNominalDatum(id1), toBe(true)),
        check(isNominalDatum(id2), toBe(true)),
      ]);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string brand and content", () => {
      const nominal = createNominalDatum(
        "EmptyContent",
        "",
      );

      return all([
        check(
          nominal.__tag,
          toBe("EmptyContent"),
        ),
        check(nominal.content, toBe("")),
        check(
          isNominalDatum(nominal),
          toBe(true),
        ),
      ]);
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

      return all([
        check(
          isNominalDatum(zeroNumber),
          toBe(true),
        ),
        check(
          isNominalDatum(zeroBigInt),
          toBe(true),
        ),
        check(
          isNominalDatum(falseBool),
          toBe(true),
        ),
        check(
          unwrapNominalDatum(zeroNumber),
          toBe(0),
        ),
        check(
          unwrapNominalDatum(zeroBigInt),
          toBe(0n),
        ),
        check(
          unwrapNominalDatum(falseBool),
          toBe(false),
        ),
      ]);
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

      return all([
        check(
          isNominalDatum(emptyArray),
          toBe(true),
        ),
        check(
          isNominalDatum(emptyObject),
          toBe(true),
        ),
        check(
          unwrapNominalDatum(emptyArray),
          toEqual([]),
        ),
        check(
          unwrapNominalDatum(emptyObject),
          toEqual({}),
        ),
      ]);
    });
  });
});
