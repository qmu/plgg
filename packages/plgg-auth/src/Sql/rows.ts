import {
  SoftStr,
  Option,
  Result,
  InvalidError,
  ok,
  err,
  invalidError,
  some,
  none,
  pipe,
  cast,
  asRawObj,
  forProp,
  asSoftStr,
  asNum,
  matchOption,
  mapResult,
  chainResult,
} from "plgg";
import {
  privateJwkJson,
  asRsaPrivateJwk,
  kidString,
} from "plgg-auth/Jose/model/Jwk";
import {
  Client,
  ClientId,
  RedirectUri,
  asClientId,
  asClientSecretHash,
  asRedirectUri,
  clientIdString,
  redirectUriString,
} from "plgg-auth/Oidc/model/Client";
import {
  asCodeChallenge,
  codeChallengeString,
} from "plgg-auth/Oidc/model/Pkce";
import {
  Subject,
  SessionId,
  PendingRequestId,
  asSubject,
  asAuthCode,
  asAccessToken,
  asSessionId,
  asPendingRequestId,
  subjectString,
  authCodeString,
  accessTokenString,
} from "plgg-auth/Oidc/model/Tokens";
import {
  AuthorizationRequest,
  Scope,
  State,
  Nonce,
  asScope,
  asState,
  asNonce,
  scopeString,
  nonceString,
} from "plgg-auth/Oidc/model/AuthorizationRequest";
import { CodeChallenge } from "plgg-auth/Oidc/model/Pkce";
import {
  IssuedCode,
  AccessGrant,
} from "plgg-auth/Oidc/model/AuthStore";
import {
  RefreshRecord,
  asRefreshTokenHash,
  asFamilyId,
  refreshTokenHashString,
  familyIdString,
} from "plgg-auth/Oidc/model/RefreshToken";
import {
  SigningKeyRecord,
  KeyStatus,
} from "plgg-auth/Oidc/model/SigningKey";

// --- scope <-> space-delimited text -----------------

/** Encodes scopes as one space-delimited column value. */
export const encodeScopes = (
  scopes: ReadonlyArray<Scope>,
): SoftStr =>
  scopes.map((s) => scopeString(s)).join(" ");

const decodeScopes = (
  text: SoftStr,
): Result<ReadonlyArray<Scope>, InvalidError> =>
  text
    .split(" ")
    .filter((t) => t.length > 0)
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
                mapResult(
                  (
                    s: Scope,
                  ): ReadonlyArray<Scope> => [
                    ...xs,
                    s,
                  ],
                ),
              ),
          ),
        ),
      ok([]),
    );

// --- Option<text> column helpers --------------------

const optText = <T>(
  o: Option<T>,
  render: (v: T) => SoftStr,
): Option<SoftStr> =>
  matchOption(
    (): Option<SoftStr> => none(),
    (v: T) => some(render(v)),
  )(o);

/** A nullable nonce column value. */
export const nonceColumn = (
  nonce: Option<Nonce>,
): Option<SoftStr> => optText(nonce, nonceString);

const asOptField = <T>(
  raw: unknown,
  caster: (v: unknown) => Result<T, InvalidError>,
): Result<Option<T>, InvalidError> =>
  raw === null || raw === undefined
    ? ok(none())
    : pipe(
        caster(raw),
        mapResult((v: T): Option<T> => some(v)),
      );

// --- Client (needs its redirect_uris joined in) -----

/**
 * Assembles a {@link Client} from its base row
 * and its already-loaded redirect URIs.
 */
export const buildClient = (
  clientRow: unknown,
  redirectRows: ReadonlyArray<unknown>,
): Result<Client, InvalidError> =>
  pipe(
    cast(
      clientRow,
      asRawObj,
      forProp("id", asClientId),
    ),
    chainResult((base: { id: ClientId }) =>
      pipe(
        asOptField(
          hasField(clientRow, "secret_hash"),
          asClientSecretHash,
        ),
        chainResult((secretHash) =>
          pipe(
            decodeRedirectUris(redirectRows),
            mapResult(
              (
                uris: ReadonlyArray<RedirectUri>,
              ): Client => ({
                id: base.id,
                secretHash,
                redirectUris: uris,
              }),
            ),
          ),
        ),
      ),
    ),
  );

const hasField = (
  row: unknown,
  key: string,
): unknown =>
  // Own-property read without an `as` cast: a
  // property descriptor's `value` is typed
  // `unknown`; absent key or a NULL column both
  // collapse to `null` (which `asOptField` reads
  // as `None`).
  typeof row === "object" && row !== null
    ? (Object.getOwnPropertyDescriptor(row, key)
        ?.value ?? null)
    : null;

const decodeRedirectUris = (
  rows: ReadonlyArray<unknown>,
): Result<
  ReadonlyArray<RedirectUri>,
  InvalidError
> =>
  rows.reduce<
    Result<
      ReadonlyArray<RedirectUri>,
      InvalidError
    >
  >(
    (acc, row) =>
      pipe(
        acc,
        chainResult(
          (xs: ReadonlyArray<RedirectUri>) =>
            pipe(
              cast(
                row,
                asRawObj,
                forProp(
                  "redirect_uri",
                  asRedirectUri,
                ),
              ),
              mapResult(
                (r: {
                  redirect_uri: RedirectUri;
                }): ReadonlyArray<RedirectUri> => [
                  ...xs,
                  r.redirect_uri,
                ],
              ),
            ),
        ),
      ),
    ok([]),
  );

// --- Session ----------------------------------------

/** Decodes a session row. */
export const asSessionRow = (
  row: unknown,
): Result<
  {
    id: SessionId;
    subject: Subject;
    expiresAt: number;
  },
  InvalidError
> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("id", asSessionId),
      forProp("subject", asSubject),
      forProp("expires_at", asNum),
    ),
    mapResult((r) => ({
      id: r.id,
      subject: r.subject,
      expiresAt: r.expires_at,
    })),
  );

// --- PendingRequest ---------------------------------

/** Decodes a pending-request row (payload is JSON). */
export const asPendingRow = (
  row: unknown,
): Result<
  {
    id: PendingRequestId;
    request: AuthorizationRequest;
    expiresAt: number;
  },
  InvalidError
> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("id", asPendingRequestId),
      forProp("payload", asSoftStr),
      forProp("expires_at", asNum),
    ),
    chainResult((r) =>
      pipe(
        decodeAuthorizationRequest(r.payload),
        mapResult((request) => ({
          id: r.id,
          request,
          expiresAt: r.expires_at,
        })),
      ),
    ),
  );

// --- IssuedCode -------------------------------------

/** Decodes an authorization-code row. */
export const asIssuedCode = (
  row: unknown,
): Result<IssuedCode, InvalidError> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("code", asAuthCode),
      forProp("client_id", asClientId),
      forProp("redirect_uri", asRedirectUri),
      forProp("subject", asSubject),
      forProp("code_challenge", asCodeChallenge),
      forProp("expires_at", asNum),
      forProp("scopes", asSoftStr),
    ),
    chainResult((r) =>
      pipe(
        decodeScopes(r.scopes),
        chainResult(
          (scopes: ReadonlyArray<Scope>) =>
            pipe(
              asOptField(
                hasField(row, "nonce"),
                asNonce,
              ),
              mapResult(
                (
                  nonce: Option<Nonce>,
                ): IssuedCode => ({
                  code: r.code,
                  clientId: r.client_id,
                  redirectUri: r.redirect_uri,
                  subject: r.subject,
                  scopes,
                  nonce,
                  codeChallenge: r.code_challenge,
                  expiresAt: r.expires_at,
                }),
              ),
            ),
        ),
      ),
    ),
  );

// --- AccessGrant ------------------------------------

/** Decodes an access-grant row. */
export const asAccessGrant = (
  row: unknown,
): Result<AccessGrant, InvalidError> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("token", asAccessToken),
      forProp("subject", asSubject),
      forProp("client_id", asClientId),
      forProp("expires_at", asNum),
      forProp("scopes", asSoftStr),
    ),
    chainResult((r) =>
      pipe(
        decodeScopes(r.scopes),
        mapResult(
          (
            scopes: ReadonlyArray<Scope>,
          ): AccessGrant => ({
            token: r.token,
            subject: r.subject,
            clientId: r.client_id,
            scopes,
            expiresAt: r.expires_at,
          }),
        ),
      ),
    ),
  );

// --- RefreshRecord ----------------------------------

const asStatus = (
  v: unknown,
): Result<
  "active" | "rotated" | "revoked",
  InvalidError
> =>
  v === "active" ||
  v === "rotated" ||
  v === "revoked"
    ? ok(v)
    : err(
        invalidError({
          message: `invalid refresh status "${String(v)}"`,
        }),
      );

/** Decodes a refresh-token row. */
export const asRefreshRecord = (
  row: unknown,
): Result<RefreshRecord, InvalidError> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("token_hash", asRefreshTokenHash),
      forProp("family_id", asFamilyId),
      forProp("client_id", asClientId),
      forProp("subject", asSubject),
      forProp("status", asStatus),
      forProp("expires_at", asNum),
      forProp("scopes", asSoftStr),
    ),
    chainResult((r) =>
      pipe(
        decodeScopes(r.scopes),
        chainResult(
          (scopes: ReadonlyArray<Scope>) =>
            pipe(
              asOptField(
                hasField(row, "rotated_from"),
                asRefreshTokenHash,
              ),
              mapResult(
                (rotatedFrom): RefreshRecord => ({
                  tokenHash: r.token_hash,
                  familyId: r.family_id,
                  clientId: r.client_id,
                  subject: r.subject,
                  scopes,
                  rotatedFrom,
                  status: r.status,
                  expiresAt: r.expires_at,
                }),
              ),
            ),
        ),
      ),
    ),
  );

// --- SigningKeyRecord -------------------------------

const asKeyStatus = (
  v: unknown,
): Result<KeyStatus, InvalidError> =>
  v === "active" ||
  v === "retiring" ||
  v === "retired"
    ? ok(v)
    : err(
        invalidError({
          message: `invalid key status "${String(v)}"`,
        }),
      );

/** The JSON stored for a signing key's private JWK (incl. kid). */
export const encodePrivateJwk = (
  record: SigningKeyRecord,
): SoftStr =>
  JSON.stringify({
    ...privateJwkJson(record.privateKey),
    kid: kidString(record.privateKey.kid),
  });

/** Decodes a signing-key row. */
export const asSigningKeyRecord = (
  row: unknown,
): Result<SigningKeyRecord, InvalidError> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("private_jwk", asSoftStr),
      forProp("status", asKeyStatus),
      forProp("created_at", asNum),
    ),
    chainResult((r) =>
      pipe(
        parseJson(r.private_jwk),
        chainResult(asRsaPrivateJwk),
        mapResult(
          (privateKey): SigningKeyRecord => ({
            privateKey,
            status: r.status,
            createdAt: r.created_at,
          }),
        ),
      ),
    ),
  );

const parseJson = (
  text: SoftStr,
): Result<unknown, InvalidError> => {
  try {
    return ok(JSON.parse(text));
  } catch {
    return err(
      invalidError({
        message: "stored JSON is malformed",
      }),
    );
  }
};

// --- AuthorizationRequest JSON (pending payload) ----

/** Serializes an AuthorizationRequest for the pending payload column. */
export const encodeAuthorizationRequest = (
  req: AuthorizationRequest,
): SoftStr =>
  JSON.stringify({
    client_id: clientIdString(req.clientId),
    redirect_uri: redirectUriString(
      req.redirectUri,
    ),
    scopes: req.scopes.map((s) => scopeString(s)),
    state: matchOption(
      () => null,
      (s: { content: string }) => s.content,
    )(req.state),
    nonce: matchOption(
      () => null,
      (n: Nonce) => nonceString(n),
    )(req.nonce),
    code_challenge: codeChallengeString(
      req.codeChallenge,
    ),
  });

type ReqBase = {
  client_id: ClientId;
  redirect_uri: RedirectUri;
  code_challenge: CodeChallenge;
};

/** Parses the pending payload column back into an AuthorizationRequest. */
export const decodeAuthorizationRequest = (
  text: SoftStr,
): Result<AuthorizationRequest, InvalidError> =>
  pipe(
    parseJson(text),
    chainResult((v: unknown) =>
      pipe(
        cast(
          v,
          asRawObj,
          forProp("client_id", asClientId),
          forProp("redirect_uri", asRedirectUri),
          forProp(
            "code_challenge",
            asCodeChallenge,
          ),
        ),
        chainResult((base: ReqBase) =>
          decodeReqTail(v, base),
        ),
      ),
    ),
  );

const decodeReqTail = (
  obj: unknown,
  base: ReqBase,
): Result<AuthorizationRequest, InvalidError> =>
  pipe(
    decodeScopeList(hasField(obj, "scopes")),
    chainResult((scopes: ReadonlyArray<Scope>) =>
      pipe(
        asOptField(
          hasField(obj, "state"),
          asState,
        ),
        chainResult((state: Option<State>) =>
          pipe(
            asOptField(
              hasField(obj, "nonce"),
              asNonce,
            ),
            mapResult(
              (
                nonce: Option<Nonce>,
              ): AuthorizationRequest => ({
                clientId: base.client_id,
                redirectUri: base.redirect_uri,
                scopes,
                state,
                nonce,
                codeChallenge:
                  base.code_challenge,
              }),
            ),
          ),
        ),
      ),
    ),
  );

const decodeScopeList = (
  v: unknown,
): Result<ReadonlyArray<Scope>, InvalidError> =>
  Array.isArray(v)
    ? v.reduce<
        Result<ReadonlyArray<Scope>, InvalidError>
      >(
        (acc, token) =>
          pipe(
            acc,
            chainResult(
              (xs: ReadonlyArray<Scope>) =>
                pipe(
                  asScope(token),
                  mapResult(
                    (
                      s: Scope,
                    ): ReadonlyArray<Scope> => [
                      ...xs,
                      s,
                    ],
                  ),
                ),
            ),
          ),
        ok([]),
      )
    : err(
        invalidError({
          message: "scopes must be an array",
        }),
      );

// Re-export the string readers the sqlStore uses
// to build bind values.
export {
  clientIdString,
  redirectUriString,
  subjectString,
  authCodeString,
  accessTokenString,
  codeChallengeString,
  scopeString,
  refreshTokenHashString,
  familyIdString,
  kidString,
};
