import {
  test,
  check,
  all,
  toBe,
  toEqual,
  not,
} from "plgg-test";
import {
  textResponse,
  htmlResponse,
  jsonResponse,
  bytesResponse,
  streamResponse,
  redirectResponse,
} from "plgg-http/index";

async function* twoChunks(): AsyncIterable<Uint8Array> {
  yield new Uint8Array([1, 2]);
  yield new Uint8Array([3]);
}

test("textResponse defaults status 200 and text/plain content-type", () => {
  const r = textResponse("hi");
  return all([
    check(r.status.content, toBe(200)),
    check(
      r.headers["content-type"],
      toBe("text/plain; charset=utf-8"),
    ),
    check(r.body, toBe("hi")),
  ]);
});

test("htmlResponse sets text/html", () => {
  const r = htmlResponse("<b>x</b>", 201);
  return all([
    check(r.status.content, toBe(201)),
    check(
      r.headers["content-type"],
      toBe("text/html; charset=utf-8"),
    ),
  ]);
});

test("jsonResponse serializes and sets application/json", () => {
  const r = jsonResponse({ a: 1 }, 201);
  return all([
    check(r.status.content, toBe(201)),
    check(
      r.headers["content-type"],
      toBe("application/json; charset=utf-8"),
    ),
    check(r.body, toBe('{"a":1}')),
  ]);
});

test("a caller-supplied content-type is preserved", () => {
  const r = jsonResponse({}, 200, {
    "content-type": "application/ld+json",
  });
  return check(
    r.headers["content-type"],
    toBe("application/ld+json"),
  );
});

test("bytesResponse defaults 200 and octet-stream, wrapping a Bytes body", () => {
  const r = bytesResponse(
    new Uint8Array([1, 2, 3]),
  );
  // Narrow the body to its `Bytes` variant before reading `.content` —
  // a guard, not a cast.
  const bytes =
    typeof r.body !== "string" &&
    r.body.__tag === "Bytes"
      ? Array.from(r.body.content)
      : [];
  return all([
    check(r.status.content, toBe(200)),
    check(
      r.headers["content-type"],
      toBe("application/octet-stream"),
    ),
    check(typeof r.body, not(toBe("string"))),
    check(bytes, toEqual([1, 2, 3])),
  ]);
});

test("bytesResponse honors an explicit status and content-type", () => {
  const r = bytesResponse(
    new Uint8Array([0]),
    206,
    {
      "content-type": "image/png",
    },
  );
  return all([
    check(r.status.content, toBe(206)),
    check(
      r.headers["content-type"],
      toBe("image/png"),
    ),
  ]);
});

test("streamResponse wraps a Stream body and defaults octet-stream", () => {
  const r = streamResponse(twoChunks());
  // Narrow the body off the string arm before reading `.__tag`.
  const tag =
    typeof r.body !== "string"
      ? r.body.__tag
      : "";
  return all([
    check(
      r.headers["content-type"],
      toBe("application/octet-stream"),
    ),
    check(typeof r.body, not(toBe("string"))),
    check(tag, toBe("Stream")),
  ]);
});

test("redirectResponse defaults 302 and sets location", () => {
  const r = redirectResponse("/login");
  return all([
    check(r.status.content, toBe(302)),
    check(r.headers["location"], toBe("/login")),
    check(r.body, toBe("")),
    check(
      redirectResponse("/x", 301).status.content,
      toBe(301),
    ),
  ]);
});
