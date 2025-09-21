import { test, expect, assert } from "vitest";
import {
  EmptyBox,
  Box,
  ExtractBoxContent,
  construct,
  pattern,
  isVariant,
  match,
} from "plgg/index";

test("FixedVariant creation and structure", () => {
  const loading =
    construct<EmptyBox<"loading">>("loading");
  const loadingVariant = loading();
  expect(loadingVariant.__tag).toBe("loading");
  expect(Object.keys(loadingVariant)).toEqual([
    "__tag",
    "content",
  ]);
});

test("ParametricVariant creation and structure", () => {
  type Success<T> = Box<"success", T>;
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
  type NumberVariant = Box<"number", number>;
  type ObjectVariant = Box<
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

test("isVariant type guard function", () => {
  type TestVariant = Box<"test", string>;
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
  type Circle = Box<"circle", { radius: number }>;
  type Square = Box<"square", { side: number }>;

  const circle = pattern("circle");
  const square = pattern("square");
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
  type ComplexVariant = Box<
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
  type Loading = EmptyBox<"loading">;
  type Success<T> = Box<"success", T>;
  type Error = Box<"error", string>;

  type AsyncState<T> =
    | Loading
    | Success<T>
    | Error;

  const ofLoading = construct<Loading>("loading");
  const ofSuccess =
    construct<Success<string>>("success");
  const ofError = construct<Error>("error");

  const loading = pattern("loading");
  const success = pattern("success");
  const error = pattern("error");

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

test("pattern with undefined content creates pattern for tag matching", () => {
  const simple = pattern("simple");

  const pattern1 = simple();
  expect(pattern1.tag).toBe("simple");
  expect(pattern1.type).toBe("tag");
  expect(pattern1.body).toBe(undefined);
});

test("Extractcontent type utility", () => {
  type TestVariant = Box<
    "test",
    { data: string }
  >;

  // This is a compile-time test - if it compiles, the type works correctly
  const testcontent: ExtractBoxContent<TestVariant> =
    {
      data: "hello",
    };
  expect(testcontent.data).toBe("hello");
});
