import { test, expect, assert } from "vitest";
import {
  EmptyBox,
  Box,
  pattern,
  isVariant,
  match,
  newBox,
  newEmptyBox,
} from "plgg/index";

test("FixedVariant creation and structure", () => {
  const loadingVariant = newEmptyBox("loading");
  expect(loadingVariant.__tag).toBe("loading");
  expect(Object.keys(loadingVariant)).toEqual([
    "__tag",
    "content",
  ]);
});

test("ParametricVariant creation and structure", () => {
  const successVariant = newBox("success")(
    "hello world",
  );

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
  const numVariant = newBox("number")(42);
  const objVariant = newBox("object")({
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
  const variant = newBox("test")("content");

  assert(isVariant(variant));
  assert(!isVariant("string"));
  assert(!isVariant(123));
  assert(!isVariant(null));
  assert(!isVariant(undefined));
  assert(!isVariant({}));
  assert(!isVariant({ tag: "wrong-property" }));
});

test("pattern function for matching", () => {
  const circle = pattern("circle");
  const square = pattern("square");
  const circleInstance = newBox("circle")({
    radius: 5,
  });
  const squareInstance = newBox("square")({
    side: 4,
  });

  type Circle = Box<"circle", { radius: number }>;
  type Square = Box<"square", { side: number }>;
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
  const complex = newBox("complex")({
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

  expect(
    getStateMessage(newEmptyBox("loading")),
  ).toBe("Loading...");
  expect(
    getStateMessage(
      newBox("success")("data loaded"),
    ),
  ).toBe("Success!");
  expect(
    getStateMessage(
      newBox("error")("failed to load"),
    ),
  ).toBe("Error occurred");
});

test("pattern with undefined content creates pattern for tag matching", () => {
  const simple = pattern("simple");

  const pattern1 = simple();
  expect(pattern1.__tag).toBe("simple");
  expect(pattern1.type).toBe("tag");
  expect(pattern1.body).toBe(undefined);
});
