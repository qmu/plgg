import { test, expect, assert } from "vitest";
import {
  FixedVariant,
  ParametricVariant,
  construct,
  pattern,
  hasTag,
  isVariant,
  match,
  ExtractContent,
} from "plgg/index";

test("FixedVariant creation and structure", () => {
  const loading =
    construct<FixedVariant<"loading">>("loading");
  const loadingVariant = loading();
  expect(loadingVariant.__tag).toBe("loading");
  expect(Object.keys(loadingVariant)).toEqual([
    "__tag",
  ]);
  expect(loadingVariant).not.toHaveProperty(
    "content",
  );
});

test("ParametricVariant creation and structure", () => {
  type Success<T> = ParametricVariant<
    "success",
    T
  >;
  const success =
    construct<Success<string>>("success");
  const successVariant = success("hello world");

  expect(successVariant.__tag).toBe("success");
  expect(successVariant.content).toBe(
    "hello world",
  );
  expect(Object.keys(successVariant)).toEqual([
    "__tag",
    "content",
  ]);
});

test("construct with different content types", () => {
  type NumberVariant = ParametricVariant<
    "number",
    number
  >;
  type ObjectVariant = ParametricVariant<
    "object",
    { id: number; name: string }
  >;

  const numberMaker =
    construct<NumberVariant>("number");
  const objectMaker =
    construct<ObjectVariant>("object");

  const numVariant = numberMaker(42);
  const objVariant = objectMaker({
    id: 1,
    name: "test",
  });

  expect(numVariant.__tag).toBe("number");
  expect(numVariant.content).toBe(42);

  expect(objVariant.__tag).toBe("object");
  expect(objVariant.content).toEqual({
    id: 1,
    name: "test",
  });
});

test("hasTag type guard function", () => {
  type User = ParametricVariant<
    "user",
    { name: string }
  >;
  type Admin = ParametricVariant<
    "admin",
    { permissions: string[] }
  >;

  const userMaker = construct<User>("user");
  const adminMaker = construct<Admin>("admin");

  const user = userMaker({ name: "John" });
  const admin = adminMaker({
    permissions: ["read", "write"],
  });

  const isUser = hasTag("user");
  const isAdmin = hasTag("admin");

  assert(isUser(user));
  assert(!isUser(admin));
  assert(isAdmin(admin));
  assert(!isAdmin(user));

  // Test with non-variant values
  assert(!isUser("not a variant"));
  assert(!isUser(null));
  assert(!isUser(undefined));
  assert(!isUser({}));
});

test("isVariant type guard function", () => {
  type TestVariant = ParametricVariant<
    "test",
    string
  >;
  const testMaker =
    construct<TestVariant>("test");
  const variant = testMaker("content");

  assert(isVariant(variant));
  assert(!isVariant("string"));
  assert(!isVariant(123));
  assert(!isVariant(null));
  assert(!isVariant(undefined));
  assert(!isVariant({}));
  assert(!isVariant({ tag: "wrong-property" }));
});

test("pattern function for matching", () => {
  type Circle = ParametricVariant<
    "circle",
    { radius: number }
  >;
  type Square = ParametricVariant<
    "square",
    { side: number }
  >;

  const circle = pattern<Circle>("circle");
  const square = pattern<Square>("square");
  const circleInstance = construct<Circle>(
    "circle",
  )({ radius: 5 });
  const squareInstance = construct<Square>(
    "square",
  )({ side: 4 });
  type Shape = Circle | Square;

  const getShapeInfo = (shape: Shape) =>
    match(
      shape,
      [circle(), () => "is circle"],
      [square(), () => "is square"],
    );

  expect(getShapeInfo(circleInstance)).toBe(
    "is circle",
  );
  expect(getShapeInfo(squareInstance)).toBe(
    "is square",
  );
});

test("variant with complex nested content", () => {
  type ComplexVariant = ParametricVariant<
    "complex",
    {
      id: number;
      metadata: {
        created: string;
        tags: string[];
      };
      data?: unknown;
    }
  >;

  const ofComplex =
    construct<ComplexVariant>("complex");
  const complex = ofComplex({
    id: 123,
    metadata: {
      created: "2023-01-01",
      tags: ["important", "test"],
    },
    data: { nested: "value" },
  });

  expect(complex.__tag).toBe("complex");
  expect(complex.content.id).toBe(123);
  expect(complex.content.metadata.tags).toEqual([
    "important",
    "test",
  ]);
  expect(complex.content.data).toEqual({
    nested: "value",
  });
});

test("mixed FixedVariant and ParametricVariant in union", () => {
  type Loading = FixedVariant<"loading">;
  type Success<T> = ParametricVariant<
    "success",
    T
  >;
  type Error = ParametricVariant<"error", string>;

  type AsyncState<T> =
    | Loading
    | Success<T>
    | Error;

  const ofLoading = construct<Loading>("loading");
  const ofSuccess =
    construct<Success<string>>("success");
  const ofError = construct<Error>("error");

  const loading = pattern<Loading>("loading");
  const success =
    pattern<Success<string>>("success");
  const error = pattern<Error>("error");

  const getStateMessage = (
    state: AsyncState<string>,
  ) =>
    match(
      state,
      [loading(), () => "Loading..."],
      [success(), () => "Success!"],
      [error(), () => "Error occurred"],
    );

  expect(getStateMessage(ofLoading())).toBe(
    "Loading...",
  );
  expect(
    getStateMessage(ofSuccess("data loaded")),
  ).toBe("Success!");
  expect(
    getStateMessage(ofError("failed to load")),
  ).toBe("Error occurred");
});

test("construct with undefined content creates FixedVariant", () => {
  type SimpleVariant = FixedVariant<"simple">;
  const simple =
    construct<SimpleVariant>("simple");

  // Calling with undefined should create FixedVariant
  const variant1 = simple(undefined as any);
  const variant2 = simple();

  expect(variant1.__tag).toBe("simple");
  expect(variant2.__tag).toBe("simple");
  expect(variant1).not.toHaveProperty("content");
  expect(variant2).not.toHaveProperty("content");
});

test("pattern with undefined content creates FixedVariant", () => {
  type SimplePattern = FixedVariant<"simple">;
  const simple = pattern<SimplePattern>("simple");

  const pattern1 = simple(undefined as any);
  const pattern2 = simple();

  expect(pattern1.__tag).toBe("simple");
  expect(pattern2.__tag).toBe("simple");
  expect(pattern1).not.toHaveProperty("content");
  expect(pattern2).not.toHaveProperty("content");
});

test("ExtractContent type utility", () => {
  type TestVariant = ParametricVariant<
    "test",
    { data: string }
  >;

  // This is a compile-time test - if it compiles, the type works correctly
  const testContent: ExtractContent<TestVariant> =
    { data: "hello" };
  expect(testContent.data).toBe("hello");
});
