import { test, expect } from "vitest";
import { isOk, isErr } from "plgg";
import {
  asHttpStatus,
  isHttpStatus,
  statusOf,
} from "plgg-http-router/index";

test("asHttpStatus accepts codes in 100-599", () => {
  const r = asHttpStatus(404);
  expect(isOk(r)).toBe(true);
  if (isOk(r)) {
    expect(r.content.__tag).toBe("HttpStatus");
    expect(r.content.content).toBe(404);
  }
});

test("asHttpStatus rejects out-of-range and non-integers", () => {
  expect(isErr(asHttpStatus(99))).toBe(true);
  expect(isErr(asHttpStatus(600))).toBe(true);
  expect(isErr(asHttpStatus(200.5))).toBe(true);
  expect(isErr(asHttpStatus("200"))).toBe(true);
});

test("asHttpStatus is idempotent on an existing HttpStatus", () => {
  const first = asHttpStatus(201);
  if (isOk(first)) {
    const again = asHttpStatus(first.content);
    expect(isOk(again)).toBe(true);
    if (isOk(again)) {
      expect(again.content.content).toBe(201);
    }
  }
});

test("isHttpStatus guards the branded value", () => {
  const r = asHttpStatus(200);
  if (isOk(r)) {
    expect(isHttpStatus(r.content)).toBe(true);
  }
  expect(isHttpStatus(200)).toBe(false);
  expect(isHttpStatus({ __tag: "HttpStatus", content: 7 })).toBe(false);
});

test("statusOf keeps valid codes and degrades invalid ones to 500", () => {
  expect(statusOf(200).content).toBe(200);
  expect(statusOf(700).content).toBe(500);
});
