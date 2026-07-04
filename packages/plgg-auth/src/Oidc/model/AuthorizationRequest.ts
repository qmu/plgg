import {
  Box,
  SoftStr,
  Dict,
  Option,
  Result,
  InvalidError,
  invalidError,
  refinedBrand,
  isSoftStr,
  ok,
  err,
  pipe,
  some,
  none,
  fromNullable,
  matchOption,
  chainResult,
  mapResult,
  mapErr,
} from "plgg";
import {
  ClientId,
  RedirectUri,
} from "plgg-auth/Oidc/model/Client";
import {
  CodeChallenge,
  asCodeChallenge,
} from "plgg-auth/Oidc/model/Pkce";
import {
  OidcError,
  invalidRequest,
  invalidScope,
  unsupportedResponseType,
} from "plgg-auth/Oidc/model/OidcError";

/**
 * A branded OAuth scope token (RFC 6749 §3.3
 * grammar: printable ASCII minus space, `"`,
 * `\`).
 */
export type Scope = Box<"Scope", string>;

const scope = refinedBrand<
  "Scope",
  string,
  InvalidError
>(
  "Scope",
  (v): v is string =>
    isSoftStr(v) &&
    /^[\x21\x23-\x5B\x5D-\x7E]+$/.test(v),
  () =>
    invalidError({
      message:
        "a scope must be a non-empty RFC 6749 scope token",
    }),
);

/** Type guard for {@link Scope}. */
export const isScope = scope.is;

/** Validates an unknown value into a {@link Scope}. */
export const asScope = scope.as;

/** The underlying string of a {@link Scope}. */
export const scopeString = scope.unwrap;

/** A branded RP-supplied `state` echo value. */
export type State = Box<"State", string>;

const state = refinedBrand<
  "State",
  string,
  InvalidError
>(
  "State",
  (v): v is string =>
    isSoftStr(v) && v.length > 0,
  () =>
    invalidError({
      message:
        "a state must be a non-empty string",
    }),
);

/** Type guard for {@link State}. */
export const isState = state.is;

/** Validates an unknown value into a {@link State}. */
export const asState = state.as;

/** The underlying string of a {@link State}. */
export const stateString = state.unwrap;

/** A branded RP-supplied replay-guard nonce. */
export type Nonce = Box<"Nonce", string>;

const nonce = refinedBrand<
  "Nonce",
  string,
  InvalidError
>(
  "Nonce",
  (v): v is string =>
    isSoftStr(v) && v.length > 0,
  () =>
    invalidError({
      message:
        "a nonce must be a non-empty string",
    }),
);

/** Type guard for {@link Nonce}. */
export const isNonce = nonce.is;

/** Validates an unknown value into a {@link Nonce}. */
export const asNonce = nonce.as;

/** The underlying string of a {@link Nonce}. */
export const nonceString = nonce.unwrap;

/**
 * A validated `/authorize` request. Only the
 * authorization-code flow with S256 PKCE is
 * representable: `response_type=code` and a
 * code challenge are structural, not optional —
 * PKCE is required for every client
 * (the OAuth 2.1 baseline).
 */
export type AuthorizationRequest = Readonly<{
  clientId: ClientId;
  redirectUri: RedirectUri;
  scopes: ReadonlyArray<Scope>;
  state: Option<State>;
  nonce: Option<Nonce>;
  codeChallenge: CodeChallenge;
}>;

const lookupOwn = (
  map: Dict<string, SoftStr>,
  name: SoftStr,
): Option<SoftStr> =>
  Object.prototype.hasOwnProperty.call(map, name)
    ? fromNullable(map[name])
    : none();

const required =
  (name: SoftStr) =>
  (
    query: Dict<string, SoftStr>,
  ): Result<SoftStr, OidcError> =>
    pipe(
      lookupOwn(query, name),
      matchOption(
        (): Result<SoftStr, OidcError> =>
          err(
            invalidRequest(
              `missing required parameter "${name}"`,
            ),
          ),
        (v: SoftStr) => ok(v),
      ),
    );

const asScopes = (
  raw: SoftStr,
): Result<ReadonlyArray<Scope>, OidcError> =>
  pipe(
    raw
      .split(" ")
      .filter((s) => s.length > 0)
      .reduce<
        Result<ReadonlyArray<Scope>, InvalidError>
      >(
        (acc, token) =>
          pipe(
            acc,
            chainResult(
              (xs: ReadonlyArray<Scope>) =>
                pipe(
                  asScope(token),
                  chainResult(
                    (
                      s: Scope,
                    ): Result<
                      ReadonlyArray<Scope>,
                      InvalidError
                    > => ok([...xs, s]),
                  ),
                ),
            ),
          ),
        ok([]),
      ),
    mapErr((e: InvalidError) =>
      invalidScope(e.content.message, e),
    ),
    chainResult((scopes: ReadonlyArray<Scope>) =>
      scopes.some(
        (s) => scopeString(s) === "openid",
      )
        ? ok(scopes)
        : err(
            invalidScope(
              'the scope must include "openid"',
            ),
          ),
    ),
  );

const optionalBranded =
  <T>(
    name: SoftStr,
    caster: (
      v: unknown,
    ) => Result<T, InvalidError>,
  ) =>
  (
    query: Dict<string, SoftStr>,
  ): Result<Option<T>, OidcError> =>
    pipe(
      lookupOwn(query, name),
      matchOption(
        (): Result<Option<T>, OidcError> =>
          ok(none()),
        (raw: SoftStr) =>
          pipe(
            caster(raw),
            mapErr((e: InvalidError) =>
              invalidRequest(
                e.content.message,
                e,
              ),
            ),
            chainResult(
              (
                v: T,
              ): Result<Option<T>, OidcError> =>
                ok(some(v)),
            ),
          ),
      ),
    );

const responseTypeOf = (
  query: Dict<string, SoftStr>,
): Result<SoftStr, OidcError> =>
  pipe(
    required("response_type")(query),
    chainResult((responseType: SoftStr) =>
      responseType === "code"
        ? ok(responseType)
        : err(
            unsupportedResponseType(
              `unsupported response_type "${responseType}" (only "code")`,
            ),
          ),
    ),
  );

const challengeOf = (
  query: Dict<string, SoftStr>,
): Result<CodeChallenge, OidcError> =>
  pipe(
    required("code_challenge_method")(query),
    chainResult((method: SoftStr) =>
      method === "S256"
        ? ok(method)
        : err(
            invalidRequest(
              `unsupported code_challenge_method "${method}" (only "S256")`,
            ),
          ),
    ),
    chainResult(() =>
      required("code_challenge")(query),
    ),
    chainResult((raw: SoftStr) =>
      pipe(
        asCodeChallenge(raw),
        mapErr((e: InvalidError) =>
          invalidRequest(e.content.message, e),
        ),
      ),
    ),
  );

/**
 * Parses the redirectable part of an
 * `/authorize` query — everything AFTER the
 * client and redirect uri have been resolved
 * (see `resolveRedirect`), so a failure here may
 * be reported to the RP as an error redirect.
 */
export const parseAuthorizationRequest =
  (
    clientId: ClientId,
    redirectUri: RedirectUri,
  ) =>
  (
    query: Dict<string, SoftStr>,
  ): Result<AuthorizationRequest, OidcError> =>
    pipe(
      responseTypeOf(query),
      chainResult(() =>
        pipe(
          required("scope")(query),
          chainResult(asScopes),
        ),
      ),
      chainResult(
        (scopes: ReadonlyArray<Scope>) =>
          pipe(
            challengeOf(query),
            mapResult(
              (challenge: CodeChallenge) => ({
                scopes,
                challenge,
              }),
            ),
          ),
      ),
      chainResult(
        (acc: {
          scopes: ReadonlyArray<Scope>;
          challenge: CodeChallenge;
        }) =>
          pipe(
            optionalBranded(
              "state",
              asState,
            )(query),
            mapResult((st: Option<State>) => ({
              ...acc,
              st,
            })),
          ),
      ),
      chainResult(
        (acc: {
          scopes: ReadonlyArray<Scope>;
          challenge: CodeChallenge;
          st: Option<State>;
        }) =>
          pipe(
            optionalBranded(
              "nonce",
              asNonce,
            )(query),
            mapResult(
              (
                nc: Option<Nonce>,
              ): AuthorizationRequest => ({
                clientId,
                redirectUri,
                scopes: acc.scopes,
                state: acc.st,
                nonce: nc,
                codeChallenge: acc.challenge,
              }),
            ),
          ),
      ),
    );
