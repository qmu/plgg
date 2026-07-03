import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  asSubject,
  asAuthCode,
  asAccessToken,
  asSessionId,
  asPendingRequestId,
  subjectString,
  freshAuthCode,
  freshAccessToken,
  freshSessionId,
  freshPendingRequestId,
} from "plgg-auth/index";

test("branded id casters accept non-empty and reject empty", () =>
  all([
    check(
      asSubject("s"),
      okThen((v) => toBe("s")(subjectString(v))),
    ),
    check(
      asSubject(""),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asAuthCode(""),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asAccessToken(""),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asSessionId(""),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asPendingRequestId(""),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("fresh generators produce 43-char base64url values, distinct each call", () =>
  all([
    check(
      freshAuthCode().content.length,
      toBe(43),
    ),
    check(
      freshAccessToken().content.length,
      toBe(43),
    ),
    check(
      freshSessionId().content.length,
      toBe(43),
    ),
    check(
      freshPendingRequestId().content.length,
      toBe(43),
    ),
    check(
      freshAuthCode().content ===
        freshAuthCode().content,
      toBe(false),
    ),
  ]));
