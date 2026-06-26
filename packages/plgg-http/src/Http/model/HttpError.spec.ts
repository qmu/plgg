import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { match } from "plgg";
import {
  HttpError,
  notFound,
  methodNotAllowed,
  badRequest,
  unsupported,
  unauthorized,
  forbidden,
  statusError,
  internalError,
  httpErrorToResponse,
  statusOf,
  notFound$,
  methodNotAllowed$,
  badRequest$,
  unsupported$,
  unauthorized$,
  forbidden$,
  statusError$,
  internalError$,
} from "plgg-http/index";

test("notFound -> 404", () => {
  const r = httpErrorToResponse(notFound("/x"));
  return all([
    check(r.status.content, toBe(404)),
    check(r.body, toBe("Not Found")),
  ]);
});

test("methodNotAllowed -> 405 with a deduped Allow header", () => {
  const r = httpErrorToResponse(
    methodNotAllowed(["GET", "GET", "PUT"]),
  );
  return all([
    check(r.status.content, toBe(405)),
    check(r.headers["allow"], toBe("GET, PUT")),
  ]);
});

test("badRequest -> 400 carrying its message", () => {
  const r = httpErrorToResponse(
    badRequest("bad input"),
  );
  return all([
    check(r.status.content, toBe(400)),
    check(r.body, toBe("bad input")),
  ]);
});

test("unsupported -> 501 carrying its message", () => {
  const r = httpErrorToResponse(
    unsupported("TRACE not supported"),
  );
  return all([
    check(r.status.content, toBe(501)),
    check(r.body, toBe("TRACE not supported")),
  ]);
});

test("unauthorized -> 401 carrying its message", () => {
  const r = httpErrorToResponse(
    unauthorized("Unauthorized"),
  );
  return all([
    check(r.status.content, toBe(401)),
    check(r.body, toBe("Unauthorized")),
  ]);
});

test("forbidden -> 403 carrying its message", () => {
  const r = httpErrorToResponse(
    forbidden("not your resource"),
  );
  return all([
    check(r.status.content, toBe(403)),
    check(r.body, toBe("not your resource")),
  ]);
});

test("statusError -> its carried status and message", () => {
  const r = httpErrorToResponse(
    statusError(statusOf(429), "slow down"),
  );
  return all([
    check(r.status.content, toBe(429)),
    check(r.body, toBe("slow down")),
  ]);
});

test("internalError -> 500 with a generic body", () => {
  const r = httpErrorToResponse(
    internalError("details hidden"),
  );
  return all([
    check(r.status.content, toBe(500)),
    check(r.body, toBe("Internal Server Error")),
  ]);
});

test("constructors tag the Box variants", () =>
  all([
    check(notFound("/").__tag, toBe("NotFound")),
    check(
      methodNotAllowed([]).__tag,
      toBe("MethodNotAllowed"),
    ),
    check(
      badRequest("").__tag,
      toBe("BadRequest"),
    ),
    check(
      unsupported("").__tag,
      toBe("Unsupported"),
    ),
    check(
      unauthorized("").__tag,
      toBe("Unauthorized"),
    ),
    check(forbidden("").__tag, toBe("Forbidden")),
    check(
      statusError(statusOf(418), "").__tag,
      toBe("StatusError"),
    ),
    check(
      internalError("").__tag,
      toBe("InternalError"),
    ),
  ]));

test("HttpError folds exhaustively through match via the $ patterns", () => {
  // Match by named ADT pattern (notFound$()), not by a bare tag string. Each
  // arm receives the variant narrowed to its structured content; omitting one
  // is a compile-time CoverageError.
  const describe = (e: HttpError): string =>
    match(e)(
      [
        notFound$(),
        (x) => `404 ${x.content.path}`,
      ],
      [
        methodNotAllowed$(),
        (x) =>
          `405 ${x.content.allowed.join(",")}`,
      ],
      [
        badRequest$(),
        (x) => `400 ${x.content.message}`,
      ],
      [
        unsupported$(),
        (x) => `501 ${x.content.message}`,
      ],
      [
        unauthorized$(),
        (x) => `401 ${x.content.message}`,
      ],
      [
        forbidden$(),
        (x) => `403 ${x.content.message}`,
      ],
      [
        statusError$(),
        (x) =>
          `${x.content.status.content} ${x.content.message}`,
      ],
      [
        internalError$(),
        (x) => `500 ${x.content.message}`,
      ],
    );

  return all([
    check(
      describe(notFound("/x")),
      toBe("404 /x"),
    ),
    check(
      describe(methodNotAllowed(["GET", "PUT"])),
      toBe("405 GET,PUT"),
    ),
    check(
      describe(badRequest("bad")),
      toBe("400 bad"),
    ),
    check(
      describe(unsupported("no")),
      toBe("501 no"),
    ),
    check(
      describe(unauthorized("auth")),
      toBe("401 auth"),
    ),
    check(
      describe(forbidden("nope")),
      toBe("403 nope"),
    ),
    check(
      describe(
        statusError(statusOf(418), "teapot"),
      ),
      toBe("418 teapot"),
    ),
    check(
      describe(internalError("boom")),
      toBe("500 boom"),
    ),
  ]);
});
