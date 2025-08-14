import { test, expect, assert } from "vitest";
import {
  FixedVariant,
  ParametricVariant,
  variantMaker,
  pattern,
  hasTag,
  isVariant,
  pipe,
  match,
  ExtractContent,
} from "plgg/index";

test("FixedVariant creation and structure", () => {
  const loading =
    variantMaker("loading")<
      FixedVariant<"loading">
    >();
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
    variantMaker("success")<Success<string>>();
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

test("variantMaker with different content types", () => {
  type NumberVariant = ParametricVariant<
    "number",
    number
  >;
  type ObjectVariant = ParametricVariant<
    "object",
    { id: number; name: string }
  >;

  const numberMaker =
    variantMaker("number")<NumberVariant>();
  const objectMaker =
    variantMaker("object")<ObjectVariant>();

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

  const userMaker = variantMaker("user")<User>();
  const adminMaker =
    variantMaker("admin")<Admin>();

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
    variantMaker("test")<TestVariant>();
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

  const circle = pattern("circle")<Circle>();
  const square = pattern("square")<Square>();
  const circleInstance = variantMaker(
    "circle",
  )<Circle>()({ radius: 5 });
  const squareInstance = variantMaker(
    "square",
  )<Square>()({ side: 4 });

  type Shape = Circle | Square;

  const getShapeInfo = (shape: Shape) =>
    pipe(
      shape,
      match(
        [circle(), () => "is circle"],
        [square(), () => "is square"],
      ),
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
    variantMaker("complex")<ComplexVariant>();
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

  const ofLoading =
    variantMaker("loading")<Loading>();
  const ofSuccess =
    variantMaker("success")<Success<string>>();
  const ofError = variantMaker("error")<Error>();

  const loading = pattern("loading")<Loading>();
  const success =
    pattern("success")<Success<string>>();
  const error = pattern("error")<Error>();

  const getStateMessage = (
    state: AsyncState<string>,
  ) =>
    pipe(
      state,
      match(
        [loading(), () => "Loading..."],
        [success(), () => "Success!"],
        [error(), () => "Error occurred"],
      ),
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

test("variantMaker with undefined content creates FixedVariant", () => {
  type SimpleVariant = FixedVariant<"simple">;
  const simple =
    variantMaker("simple")<SimpleVariant>();

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
  const simple =
    pattern("simple")<SimplePattern>();

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
