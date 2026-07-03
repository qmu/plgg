import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  OidcError,
  invalidRequest,
  invalidClient,
  invalidGrant,
  unsupportedGrantType,
  unsupportedResponseType,
  invalidScope,
  unknownPendingRequest,
  unauthenticated,
  storeFailure,
  serverError,
  oidcErrorKind,
  oauthErrorCode,
  oauthErrorStatus,
  toStoreFailure,
  oidcError$,
} from "plgg-auth/index";

const cases: ReadonlyArray<
  readonly [OidcError, string, number]
> = [
  [invalidRequest("x"), "invalid_request", 400],
  [invalidClient("x"), "invalid_client", 401],
  [invalidGrant("x"), "invalid_grant", 400],
  [
    unsupportedGrantType("x"),
    "unsupported_grant_type",
    400,
  ],
  [
    unsupportedResponseType("x"),
    "unsupported_response_type",
    400,
  ],
  [invalidScope("x"), "invalid_scope", 400],
  [
    unknownPendingRequest("x"),
    "invalid_request",
    400,
  ],
  [unauthenticated("x"), "invalid_token", 401],
  [storeFailure("x"), "server_error", 500],
  [serverError("x"), "server_error", 500],
];

test("every error kind maps to its OAuth code and status", () =>
  all(
    cases.map(([error, code, status]) =>
      all([
        check(oauthErrorCode(error), toBe(code)),
        check(
          oauthErrorStatus(error),
          toBe(status),
        ),
      ]),
    ),
  ));

test("oidcErrorKind reads the discriminating kind", () =>
  check(
    oidcErrorKind(invalidGrant("x")),
    toBe("InvalidGrant"),
  ));

test("toStoreFailure lifts an Error cause", () =>
  all([
    check(
      oidcErrorKind(
        toStoreFailure(new Error("db down")),
      ),
      toBe("StoreFailure"),
    ),
    check(
      toStoreFailure(new Error("db down")).content
        .message,
      toBe("db down"),
    ),
  ]));

test("toStoreFailure folds a non-Error cause to the generic message", () =>
  check(
    toStoreFailure("raw").content.message,
    toBe("store operation failed"),
  ));

test("oidcError$ is a usable pattern matcher", () =>
  check(typeof oidcError$, toBe("function")));
