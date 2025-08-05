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
} from "plgg/index";

test("FixedVariant creation and structure", () => {
  const loading = variantMaker("loading")<FixedVariant<"loading">>();
  const loadingVariant = loading();

  expect(loadingVariant.__tag).toBe("loading");
  expect(Object.keys(loadingVariant)).toEqual(["__tag"]);
  expect(loadingVariant).not.toHaveProperty("content");
});

test("ParametricVariant creation and structure", () => {
  type Success<T> = ParametricVariant<"success", T>;
  const success = variantMaker("success")<Success<string>>();
  const successVariant = success("hello world");

  expect(successVariant.__tag).toBe("success");
  expect(successVariant.content).toBe("hello world");
  expect(Object.keys(successVariant)).toEqual(["__tag", "content"]);
});

test("variantMaker with different content types", () => {
  type NumberVariant = ParametricVariant<"number", number>;
  type ObjectVariant = ParametricVariant<
    "object",
    { id: number; name: string }
  >;

  const numberMaker = variantMaker("number")<NumberVariant>();
  const objectMaker = variantMaker("object")<ObjectVariant>();

  const numVariant = numberMaker(42);
  const objVariant = objectMaker({ id: 1, name: "test" });

  expect(numVariant.__tag).toBe("number");
  expect(numVariant.content).toBe(42);

  expect(objVariant.__tag).toBe("object");
  expect(objVariant.content).toEqual({ id: 1, name: "test" });
});

test("hasTag type guard function", () => {
  type User = ParametricVariant<"user", { name: string }>;
  type Admin = ParametricVariant<"admin", { permissions: string[] }>;

  const userMaker = variantMaker("user")<User>();
  const adminMaker = variantMaker("admin")<Admin>();

  const user = userMaker({ name: "John" });
  const admin = adminMaker({ permissions: ["read", "write"] });

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
  type TestVariant = ParametricVariant<"test", string>;
  const testMaker = variantMaker("test")<TestVariant>();
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
  type Circle = ParametricVariant<"circle", { radius: number }>;
  type Square = ParametricVariant<"square", { side: number }>;

  const circle = pattern("circle")<Circle>();
  const square = pattern("square")<Square>();
  const circleInstance = variantMaker("circle")<Circle>()({ radius: 5 });
  const squareInstance = variantMaker("square")<Square>()({ side: 4 });

  type Shape = Circle | Square;

  const getShapeInfo = (shape: Shape) =>
    pipe(
      shape,
      match([circle(), () => "is circle"], [square(), () => "is square"]),
    );

  expect(getShapeInfo(circleInstance)).toBe("is circle");
  expect(getShapeInfo(squareInstance)).toBe("is square");
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

  const complexMaker = variantMaker("complex")<ComplexVariant>();
  const complex = complexMaker({
    id: 123,
    metadata: {
      created: "2023-01-01",
      tags: ["important", "test"],
    },
    data: { nested: "value" },
  });

  expect(complex.__tag).toBe("complex");
  expect(complex.content.id).toBe(123);
  expect(complex.content.metadata.tags).toEqual(["important", "test"]);
  expect(complex.content.data).toEqual({ nested: "value" });
});

test("mixed FixedVariant and ParametricVariant in union", () => {
  type Loading = FixedVariant<"loading">;
  type Success<T> = ParametricVariant<"success", T>;
  type Error = ParametricVariant<"error", string>;

  type AsyncState<T> = Loading | Success<T> | Error;

  const loading = variantMaker("loading")<Loading>();
  const success = variantMaker("success")<Success<string>>();
  const error = variantMaker("error")<Error>();

  const loadingState: AsyncState<string> = loading();
  const successState: AsyncState<string> = success("data loaded");
  const errorState: AsyncState<string> = error("failed to load");

  const getStateMessage = (state: AsyncState<string>) =>
    pipe(
      state,
      match(
        [pattern("loading")<Loading>()(), () => "Loading..."],
        [pattern("success")<Success<string>>()(), () => "Success!"],
        [pattern("error")<Error>()(), () => "Error occurred"],
      ),
    );

  expect(getStateMessage(loadingState)).toBe("Loading...");
  expect(getStateMessage(successState)).toBe("Success!");
  expect(getStateMessage(errorState)).toBe("Error occurred");
});
