import { test, expect } from "vitest";
import { notFound } from "plgg-http-router";
import {
  networkError,
  isNetworkError,
} from "plgg-http-client/index";

test("networkError carries its message under the NetworkError tag", () => {
  const error = networkError("connection refused");
  expect(error.__tag).toBe("NetworkError");
  expect(error.content).toBe("connection refused");
});

test("isNetworkError is true for a NetworkError", () => {
  expect(isNetworkError(networkError("down"))).toBe(true);
});

test("isNetworkError is false for a reused HttpError variant", () => {
  expect(isNetworkError(notFound("/missing"))).toBe(false);
});
