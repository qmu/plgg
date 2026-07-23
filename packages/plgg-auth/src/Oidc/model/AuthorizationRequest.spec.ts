import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { box, isSome, isNone } from "plgg";
import {
  ClientId,
  RedirectUri,
  asScope,
  asState,
  asNonce,
  scopeString,
  oidcErrorKind,
  parseAuthorizationRequest,
} from "plgg-auth/index";

const clientId: ClientId = box("ClientId")("c");
const redirectUri: RedirectUri = box(
  "RedirectUri",
)("https://rp.example/cb");

const parse = parseAuthorizationRequest(
  clientId,
  redirectUri,
);

const base: Record<string, string> = {
  response_type: "code",
  scope: "openid profile",
  code_challenge: "a".repeat(43),
  code_challenge_method: "S256",
};

test("asScope enforces the scope-token grammar", () =>
  all([
    check(
      asScope("openid"),
      okThen((s) =>
        toBe("openid")(scopeString(s)),
      ),
    ),
    check(
      asScope("has space"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asState and asNonce reject the empty string", () =>
  all([
    check(
      asState(""),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asNonce(""),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("a full request parses, state and nonce optional", () =>
  check(
    parse({
      ...base,
      state: "st",
      nonce: "n",
    }),
    okThen((r) =>
      all([
        check(
          r.scopes.map((s) => scopeString(s)),
          toEqual(["openid", "profile"]),
        ),
        check(isSome(r.state), toBe(true)),
        check(isSome(r.nonce), toBe(true)),
      ]),
    ),
  ));

test("state and nonce absent parse to None", () =>
  check(
    parse(base),
    okThen((r) =>
      all([
        check(isNone(r.state), toBe(true)),
        check(isNone(r.nonce), toBe(true)),
      ]),
    ),
  ));

test("a non-code response_type is UnsupportedResponseType", () =>
  check(
    parse({ ...base, response_type: "token" }),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("UnsupportedResponseType"),
      ),
    ),
  ));

test("a missing response_type is InvalidRequest", () =>
  check(
    parse({
      scope: "openid",
      code_challenge: "a".repeat(43),
      code_challenge_method: "S256",
    }),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidRequest"),
      ),
    ),
  ));

test("a scope without openid is InvalidScope", () =>
  check(
    parse({ ...base, scope: "profile" }),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidScope"),
      ),
    ),
  ));

test("a malformed scope token is InvalidScope", () =>
  check(
    parse({ ...base, scope: 'openid "bad"' }),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidScope"),
      ),
    ),
  ));

test("a non-S256 challenge method is InvalidRequest", () =>
  check(
    parse({
      ...base,
      code_challenge_method: "plain",
    }),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidRequest"),
      ),
    ),
  ));

test("a malformed code_challenge is InvalidRequest", () =>
  check(
    parse({
      ...base,
      code_challenge: "too-short",
    }),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidRequest"),
      ),
    ),
  ));

test("a malformed state value is InvalidRequest", () =>
  check(
    parse({ ...base, state: "" }),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidRequest"),
      ),
    ),
  ));

test("a missing scope is InvalidRequest", () =>
  check(
    parse({
      response_type: "code",
      code_challenge: "a".repeat(43),
      code_challenge_method: "S256",
    }),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidRequest"),
      ),
    ),
  ));

test("a malformed nonce value is InvalidRequest", () =>
  check(
    parse({ ...base, nonce: "" }),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidRequest"),
      ),
    ),
  ));
