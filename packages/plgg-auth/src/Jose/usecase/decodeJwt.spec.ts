import {
  test,
  check,
  toBe,
  errThen,
} from "plgg-test";
import { box } from "plgg";
import {
  decodeJwt,
  joseErrorKind,
} from "plgg-auth/index";
import { rfc7515A2 } from "plgg-auth/Jose/testkit/rfcVectors";
import { compactOf } from "plgg-auth/Jose/testkit/fixtures";

test("decodeJwt rejects a payload that is JSON but not claims", () =>
  // The A.2 payload parses as JSON but has no
  // sub/aud, so the claims caster refuses it.
  check(
    decodeJwt(
      compactOf(
        rfc7515A2.headerB64,
        rfc7515A2.payloadB64,
        rfc7515A2.sigB64,
      ),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("DecodeFailure"),
      ),
    ),
  ));

test("decodeJwt guards a box built outside the caster", () =>
  check(
    decodeJwt(box("CompactJws")("also bad")),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("DecodeFailure"),
      ),
    ),
  ));
