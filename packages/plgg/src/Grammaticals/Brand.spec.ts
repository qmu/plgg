import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { Brand } from "plgg/index";

// Define test brand types
type UserId = Brand<string, "UserId">;
type ProductId = Brand<number, "ProductId">;
type EmailAddress = Brand<string, "EmailAddress">;

// Helper functions to create branded values
const createUserId = (id: string): UserId =>
  id as UserId;
const createProductId = (id: number): ProductId =>
  id as ProductId;
const createEmailAddress = (
  email: string,
): EmailAddress => email as EmailAddress;

test("Brand creates nominal type for strings", () => {
  const userId = createUserId("user123");
  const regularString = "user123";

  // But TypeScript treats them as different types
  const processUserId = (id: UserId): string =>
    id;
  return all([
    // Both have the same runtime value
    check(userId, toBe("user123")),
    check(userId, toBe(regularString)),
    check(
      processUserId(userId),
      toBe("user123"),
    ),
  ]);
});

test("Brand creates nominal type for numbers", () => {
  const productId = createProductId(42);
  const regularNumber = 42;

  // But TypeScript treats them as different types
  const processProductId = (
    id: ProductId,
  ): number => id;
  return all([
    // Both have the same runtime value
    check(productId, toBe(42)),
    check(productId, toBe(regularNumber)),
    check(processProductId(productId), toBe(42)),
  ]);
});

test("Different brand types are distinct", () => {
  const userId = createUserId("123");
  const emailAddress = createEmailAddress(
    "user@example.com",
  );

  // But they represent different concepts
  const processUserId = (id: UserId): string =>
    `User: ${id}`;
  const processEmail = (
    email: EmailAddress,
  ): string => `Email: ${email}`;

  return all([
    // Runtime values can be compared
    check(typeof userId, toBe("string")),
    check(typeof emailAddress, toBe("string")),
    check(
      processUserId(userId),
      toBe("User: 123"),
    ),
    check(
      processEmail(emailAddress),
      toBe("Email: user@example.com"),
    ),
  ]);
});

test("Brand preserves underlying type operations", () => {
  const userId1 = createUserId("user123");
  const userId2 = createUserId("user456");

  const productId1 = createProductId(10);
  const productId2 = createProductId(20);

  return all([
    // String operations work
    check(userId1.length, toBe(7)),
    check(
      userId1.toUpperCase() as UserId,
      toBe("USER123"),
    ),
    check(
      (userId1 + userId2) as UserId,
      toBe("user123user456"),
    ),
    // Number operations work
    check(
      (productId1 + productId2) as ProductId,
      toBe(30),
    ),
    check(
      (productId1 * 2) as ProductId,
      toBe(20),
    ),
    check(productId1.toString(), toBe("10")),
  ]);
});

test("Brand with complex underlying types", () => {
  type UserData = Brand<
    { id: string; name: string },
    "UserData"
  >;
  type ConfigData = Brand<
    { [key: string]: any },
    "ConfigData"
  >;

  const createUserData = (data: {
    id: string;
    name: string;
  }): UserData => data as UserData;
  const createConfigData = (data: {
    [key: string]: any;
  }): ConfigData => data as ConfigData;

  const userData = createUserData({
    id: "123",
    name: "John",
  });
  const configData = createConfigData({
    debug: true,
    port: 3000,
  });

  return all([
    check(userData.id, toBe("123")),
    check(userData.name, toBe("John")),
    check(configData.debug, toBe(true)),
    check(configData.port, toBe(3000)),
    // Object operations work
    check(
      Object.keys(userData),
      toEqual(["id", "name"]),
    ),
    check(
      Object.keys(configData),
      toEqual(["debug", "port"]),
    ),
  ]);
});

test("Brand with array types", () => {
  type TagList = Brand<string[], "TagList">;
  type ScoreList = Brand<number[], "ScoreList">;

  const createTagList = (
    tags: string[],
  ): TagList => tags as TagList;
  const createScoreList = (
    scores: number[],
  ): ScoreList => scores as ScoreList;

  const tags = createTagList([
    "typescript",
    "functional",
    "programming",
  ]);
  const scores = createScoreList([95, 87, 92]);

  return all([
    check(tags.length, toBe(3)),
    check(tags[0], toBe("typescript")),
    check(scores.length, toBe(3)),
    check(scores[0], toBe(95)),
    // Array methods work
    check(
      tags.join(", "),
      toBe(
        "typescript, functional, programming",
      ),
    ),
    check(
      scores.reduce((a, b) => a + b, 0),
      toBe(274),
    ),
  ]);
});

test("Brand with primitive wrapper types", () => {
  type SafeNumber = Brand<number, "SafeNumber">;
  type SafeBoolean = Brand<
    boolean,
    "SafeBoolean"
  >;

  const createSafeNumber = (
    n: number,
  ): SafeNumber => n as SafeNumber;
  const createSafeBoolean = (
    b: boolean,
  ): SafeBoolean => b as SafeBoolean;

  const safeNum = createSafeNumber(42);
  const safeBool = createSafeBoolean(true);

  return all([
    check(safeNum, toBe(42)),
    check(safeBool, toBe(true)),
    // Type checking works
    check(typeof safeNum, toBe("number")),
    check(typeof safeBool, toBe("boolean")),
  ]);
});

test("Brand type can be null or undefined", () => {
  type OptionalUserId = Brand<
    string | null | undefined,
    "OptionalUserId"
  >;

  const createOptionalUserId = (
    id: string | null | undefined,
  ): OptionalUserId => id as OptionalUserId;

  const validId = createOptionalUserId("user123");
  const nullId = createOptionalUserId(null);
  const undefinedId =
    createOptionalUserId(undefined);

  return all([
    check(validId, toBe("user123")),
    check(nullId, toBe(null)),
    check(undefinedId, toBe(undefined)),
    // Null checks work
    check(validId !== null, toBe(true)),
    check(nullId === null, toBe(true)),
    check(
      undefinedId === undefined,
      toBe(true),
    ),
  ]);
});
