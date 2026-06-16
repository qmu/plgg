import { test, expect } from "vitest";
import { match } from "plgg";
import {
  notFound,
  notFound$,
  methodNotAllowed$,
  badRequest$,
  unsupported$,
  unauthorized$,
  forbidden$,
  statusError$,
  internalError$,
} from "plgg-http";
import {
  ClientError,
  networkError,
  networkError$,
  redirectError,
  redirectError$,
  isNetworkError,
} from "plgg-fetch/index";

test("networkError carries its message under the NetworkError tag", () => {
  const error = networkError("connection refused");
  expect(error.__tag).toBe("NetworkError");
  expect(error.content.message).toBe(
    "connection refused",
  );
});

test("isNetworkError is true for a NetworkError", () => {
  expect(isNetworkError(networkError("down"))).toBe(true);
});

test("isNetworkError is false for a reused HttpError variant", () => {
  expect(isNetworkError(notFound("/missing"))).toBe(false);
});

test("ClientError folds exhaustively via the $ patterns (no tag strings)", () => {
  // Match by named ADT pattern: networkError$ from the client, the rest from
  // the reused router vocabulary. Exhaustive over all variants — omitting one
  // is a compile-time CoverageError.
  const describe = (e: ClientError): string =>
    match(e)(
      [
        networkError$(),
        (x) => `network: ${x.content.message}`,
      ],
      [
        redirectError$(),
        (x) => `redirect: ${x.content.message}`,
      ],
      [
        notFound$(),
        (x) => `not found: ${x.content.path}`,
      ],
      [
        methodNotAllowed$(),
        (x) => `405 ${x.content.allowed.length}`,
      ],
      [badRequest$(), (x) => `400 ${x.content.message}`],
      [
        unsupported$(),
        (x) => `501 ${x.content.message}`,
      ],
      [
        unauthorized$(),
        (x) => `401 ${x.content.message}`,
      ],
      [forbidden$(), (x) => `403 ${x.content.message}`],
      [
        statusError$(),
        (x) => `${x.content.status.content}`,
      ],
      [
        internalError$(),
        (x) => `500 ${x.content.message}`,
      ],
    );

  expect(describe(networkError("down"))).toBe(
    "network: down",
  );
  expect(describe(redirectError("moved"))).toBe(
    "redirect: moved",
  );
  expect(describe(notFound("/x"))).toBe(
    "not found: /x",
  );
});
