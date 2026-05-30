import { test, expect, assert } from "vitest";
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

  // Both have the same runtime value
  expect(userId).toBe("user123");
  expect(userId).toBe(regularString);

  // But TypeScript treats them as different types
  const processUserId = (id: UserId): string =>
    id;
  expect(processUserId(userId)).toBe("user123");
});

test("Brand creates nominal type for numbers", () => {
  const productId = createProductId(42);
  const regularNumber = 42;

  // Both have the same runtime value
  expect(productId).toBe(42);
  expect(productId).toBe(regularNumber);

  // But TypeScript treats them as different types
  const processProductId = (
    id: ProductId,
  ): number => id;
  expect(processProductId(productId)).toBe(42);
});

test("Different brand types are distinct", () => {
  const userId = createUserId("123");
  const emailAddress = createEmailAddress(
    "user@example.com",
  );

  // Runtime values can be compared
  expect(typeof userId).toBe("string");
  expect(typeof emailAddress).toBe("string");

  // But they represent different concepts
  const processUserId = (id: UserId): string =>
    `User: ${id}`;
  const processEmail = (
    email: EmailAddress,
  ): string => `Email: ${email}`;

  expect(processUserId(userId)).toBe("User: 123");
  expect(processEmail(emailAddress)).toBe(
    "Email: user@example.com",
  );
});

test("Brand preserves underlying type operations", () => {
  const userId1 = createUserId("user123");
  const userId2 = createUserId("user456");

  // String operations work
  expect(userId1.length).toBe(7);
  expect(userId1.toUpperCase() as UserId).toBe(
    "USER123",
  );
  expect((userId1 + userId2) as UserId).toBe(
    "user123user456",
  );

  const productId1 = createProductId(10);
  const productId2 = createProductId(20);

  // Number operations work
  expect(
    (productId1 + productId2) as ProductId,
  ).toBe(30);
  expect((productId1 * 2) as ProductId).toBe(20);
  expect(productId1.toString()).toBe("10");
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

  expect(userData.id).toBe("123");
  expect(userData.name).toBe("John");
  expect(configData.debug).toBe(true);
  expect(configData.port).toBe(3000);

  // Object operations work
  expect(Object.keys(userData)).toEqual([
    "id",
    "name",
  ]);
  expect(Object.keys(configData)).toEqual([
    "debug",
    "port",
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

  expect(tags.length).toBe(3);
  expect(tags[0]).toBe("typescript");
  expect(scores.length).toBe(3);
  expect(scores[0]).toBe(95);

  // Array methods work
  expect(tags.join(", ")).toBe(
    "typescript, functional, programming",
  );
  expect(scores.reduce((a, b) => a + b, 0)).toBe(
    274,
  );
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

  expect(safeNum).toBe(42);
  expect(safeBool).toBe(true);

  // Type checking works
  expect(typeof safeNum).toBe("number");
  expect(typeof safeBool).toBe("boolean");
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

  expect(validId).toBe("user123");
  expect(nullId).toBe(null);
  expect(undefinedId).toBe(undefined);

  // Null checks work
  assert(validId !== null);
  assert(nullId === null);
  assert(undefinedId === undefined);
});
