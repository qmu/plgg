import { test, expect } from "vitest";
import { isOk, isErr, isNone, isSome } from "plgg";
import {
  asTodo,
  asTodos,
  asNewTodo,
  asTodoPatch,
} from "./Todo";

test("asTodo decodes a complete row with Some completedAt", () => {
  const result = asTodo({
    id: "t1",
    title: "Wire the pipeline",
    completed: true,
    createdAt: "2026-05-26T09:00:00Z",
    completedAt: "2026-05-27T18:30:00Z",
  });
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content.id).toBe("t1");
    expect(result.content.completed).toBe(true);
    expect(isSome(result.content.completedAt)).toBe(true);
  }
});

test("asTodo decodes a row with missing completedAt as Option None", () => {
  const result = asTodo({
    id: "t2",
    title: "Ship the demo",
    completed: false,
    createdAt: "2026-05-28T09:00:00Z",
  });
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(isNone(result.content.completedAt)).toBe(true);
  }
});

test("asTodo rejects a blank title", () => {
  const result = asTodo({
    id: "t3",
    title: "   ",
    completed: false,
    createdAt: "2026-05-28T09:00:00Z",
  });
  expect(isErr(result)).toBe(true);
});

test("asTodo rejects a missing completed flag", () => {
  const result = asTodo({
    id: "t4",
    title: "Forgot the flag",
    createdAt: "2026-05-28T09:00:00Z",
  });
  expect(isErr(result)).toBe(true);
});

test("asTodos decodes the seeded shape", () => {
  const result = asTodos([
    {
      id: "t1",
      title: "Wire the pipeline",
      completed: true,
      createdAt: "2026-05-26T09:00:00Z",
      completedAt: "2026-05-27T18:30:00Z",
    },
    {
      id: "t2",
      title: "Ship the demo",
      completed: false,
      createdAt: "2026-05-28T09:00:00Z",
    },
  ]);
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content.length).toBe(2);
  }
});

test("asTodos rejects a non-array input", () => {
  expect(isErr(asTodos({ not: "an array" }))).toBe(true);
});

test("asNewTodo accepts a single title", () => {
  const result = asNewTodo({ title: "Buy milk" });
  expect(isOk(result)).toBe(true);
});

test("asNewTodo rejects extra/missing fields when title is missing", () => {
  expect(isErr(asNewTodo({}))).toBe(true);
  expect(isErr(asNewTodo({ title: "" }))).toBe(true);
});

test("asTodoPatch accepts a single completed flag", () => {
  const result = asTodoPatch({ completed: true });
  expect(isOk(result)).toBe(true);
});

test("asTodoPatch rejects a non-boolean completed field", () => {
  expect(isErr(asTodoPatch({ completed: "yes" }))).toBe(true);
  expect(isErr(asTodoPatch({}))).toBe(true);
});
