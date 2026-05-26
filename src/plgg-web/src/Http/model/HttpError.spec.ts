import { test, expect } from "vitest";
import {
  notFound,
  methodNotAllowed,
  badRequest,
  unsupported,
  internalError,
  httpErrorToResponse,
} from "plgg-web/index";

test("notFound -> 404", () => {
  const r = httpErrorToResponse(notFound("/x"));
  expect(r.status.content).toBe(404);
  expect(r.body).toBe("Not Found");
});

test("methodNotAllowed -> 405 with a deduped Allow header", () => {
  const r = httpErrorToResponse(
    methodNotAllowed(["GET", "GET", "PUT"]),
  );
  expect(r.status.content).toBe(405);
  expect(r.headers["allow"]).toBe("GET, PUT");
});

test("badRequest -> 400 carrying its message", () => {
  const r = httpErrorToResponse(
    badRequest("bad input"),
  );
  expect(r.status.content).toBe(400);
  expect(r.body).toBe("bad input");
});

test("unsupported -> 501 carrying its message", () => {
  const r = httpErrorToResponse(
    unsupported("TRACE not supported"),
  );
  expect(r.status.content).toBe(501);
  expect(r.body).toBe("TRACE not supported");
});

test("internalError -> 500 with a generic body", () => {
  const r = httpErrorToResponse(
    internalError("details hidden"),
  );
  expect(r.status.content).toBe(500);
  expect(r.body).toBe("Internal Server Error");
});

test("constructors tag the Box variants", () => {
  expect(notFound("/").__tag).toBe("NotFound");
  expect(methodNotAllowed([]).__tag).toBe(
    "MethodNotAllowed",
  );
  expect(badRequest("").__tag).toBe("BadRequest");
  expect(unsupported("").__tag).toBe("Unsupported");
  expect(internalError("").__tag).toBe(
    "InternalError",
  );
});
