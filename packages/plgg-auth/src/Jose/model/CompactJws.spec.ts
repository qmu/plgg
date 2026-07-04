import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  box,
  isSome,
  isNone,
  matchOption,
} from "plgg";
import {
  asCompactJws,
  compactJwsString,
  parseCompactJws,
  decodeJwsHeader,
  base64UrlString,
  joseErrorKind,
} from "plgg-auth/index";
import { rfc7515A2 } from "plgg-auth/Jose/testkit/rfcVectors";
import {
  a2Compact,
  compactOf,
  b64OfJson,
} from "plgg-auth/Jose/testkit/fixtures";

test("asCompactJws accepts three dot-separated segments", () =>
  check(
    asCompactJws("aa.bb.cc"),
    okThen((jws) =>
      toBe("aa.bb.cc")(compactJwsString(jws)),
    ),
  ));

test("asCompactJws rejects a two-segment string", () =>
  check(
    asCompactJws("aa.bb"),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asCompactJws rejects padded base64", () =>
  check(
    asCompactJws("aa==.bb.cc"),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("parseCompactJws splits the A.2 vector into its segments", () =>
  check(
    parseCompactJws(a2Compact()),
    okThen((parts) =>
      all([
        check(
          base64UrlString(parts.header),
          toBe(rfc7515A2.headerB64),
        ),
        check(
          base64UrlString(parts.payload),
          toBe(rfc7515A2.payloadB64),
        ),
        check(
          base64UrlString(parts.signature),
          toBe(rfc7515A2.sigB64),
        ),
      ]),
    ),
  ));

test("parseCompactJws guards a box built outside the caster", () =>
  check(
    parseCompactJws(box("CompactJws")("bad")),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("DecodeFailure"),
      ),
    ),
  ));

test("decodeJwsHeader reads the A.2 header: RS256, no kid", () =>
  check(
    decodeJwsHeader(a2Compact()),
    okThen((header) =>
      all([
        check(header.alg.content, toBe("RS256")),
        check(isNone(header.kid), toBe(true)),
      ]),
    ),
  ));

test("decodeJwsHeader surfaces a kid when present", () =>
  check(
    decodeJwsHeader(
      compactOf(
        b64OfJson({ alg: "RS256", kid: "k1" }),
        rfc7515A2.payloadB64,
        "AA",
      ),
    ),
    okThen((header) =>
      all([
        check(isSome(header.kid), toBe(true)),
        check(
          matchOption(
            () => "",
            (k: { content: string }) => k.content,
          )(header.kid),
          toBe("k1"),
        ),
      ]),
    ),
  ));

test("decodeJwsHeader fails on a non-JSON header segment", () =>
  check(
    decodeJwsHeader(
      compactOf(
        b64OfJson("notanobject").slice(0, 4),
        rfc7515A2.payloadB64,
        "AA",
      ),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("DecodeFailure"),
      ),
    ),
  ));

test("decodeJwsHeader fails on a header without alg", () =>
  check(
    decodeJwsHeader(
      compactOf(
        b64OfJson({ typ: "JWT" }),
        rfc7515A2.payloadB64,
        "AA",
      ),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("DecodeFailure"),
      ),
    ),
  ));
