import {
  SoftStr,
  Dict,
  Num,
  Option,
  Result,
  ok,
  err,
  isErr,
  pipe,
  some,
  none,
  fromNullable,
  matchOption,
} from "plgg";
import {
  Client,
  clientIdString,
} from "plgg-auth/Oidc/model/Client";
import { IssuedCode } from "plgg-auth/Oidc/model/AuthStore";
import { liftStore } from "plgg-auth/Oidc/model/AuthStore";
import {
  RefreshRecord,
  RefreshToken,
  freshRefreshToken,
  hashRefreshToken,
  asRefreshToken,
} from "plgg-auth/Oidc/model/RefreshToken";
import { ProviderConfig } from "plgg-auth/Oidc/model/ProviderConfig";
import {
  OidcError,
  invalidRequest,
  invalidGrant,
  serverError,
} from "plgg-auth/Oidc/model/OidcError";
import {
  TokenResponse,
  issueTokensFor,
} from "plgg-auth/Oidc/usecase/issueTokens";

const lookupOwn = (
  map: Dict<string, SoftStr>,
  name: SoftStr,
): Option<SoftStr> =>
  Object.prototype.hasOwnProperty.call(map, name)
    ? fromNullable(map[name])
    : none();

/**
 * The `refresh_token` grant with rotation and
 * reuse detection (OAuth 2.1):
 *
 * - a valid `active` token is rotated — the old
 *   one is marked `rotated`, a new one is issued
 *   in the same family, and fresh tokens are
 *   returned;
 * - presenting a `rotated` or `revoked` token
 *   (a reuse signal) revokes the ENTIRE family
 *   and fails — a stolen token cannot outlive its
 *   first replay.
 *
 * The client has already been authenticated by
 * the caller; the token must belong to it.
 * Async-shell style.
 */
export const refreshGrant =
  (config: ProviderConfig) =>
  (client: Client) =>
  async (
    form: Dict<string, SoftStr>,
  ): Promise<
    Result<TokenResponse, OidcError>
  > => {
    const raw = pipe(
      lookupOwn(form, "refresh_token"),
      matchOption(
        (): Result<SoftStr, OidcError> =>
          err(
            invalidRequest(
              'missing "refresh_token"',
            ),
          ),
        (v: SoftStr) => ok(v),
      ),
    );
    if (isErr(raw)) {
      return raw;
    }
    const parsed = asRefreshToken(raw.content);
    if (isErr(parsed)) {
      return err(
        invalidGrant("malformed refresh token"),
      );
    }
    const hashed = await hashRefreshToken(
      parsed.content,
    );
    if (isErr(hashed)) {
      return err(
        serverError(
          "failed to hash the refresh token",
        ),
      );
    }
    const found = await liftStore(() =>
      config.store.findRefreshToken(
        hashed.content,
      ),
    );
    if (isErr(found)) {
      return found;
    }
    return matchOption(
      (): Promise<
        Result<TokenResponse, OidcError>
      > =>
        Promise.resolve(
          err(
            invalidGrant("unknown refresh token"),
          ),
        ),
      (record: RefreshRecord) =>
        rotate(config, client, record),
    )(found.content);
  };

const rotate = async (
  config: ProviderConfig,
  client: Client,
  record: RefreshRecord,
): Promise<Result<TokenResponse, OidcError>> => {
  const now = config.clock();
  // Reuse detection: a non-active token that is
  // presented is a replay — revoke the family.
  if (record.status !== "active") {
    const revoked = await liftStore(() =>
      config.store.revokeRefreshFamily(
        record.familyId,
      ),
    );
    return isErr(revoked)
      ? revoked
      : err(
          invalidGrant(
            "refresh token reuse detected; the token family has been revoked",
          ),
        );
  }
  if (record.expiresAt <= now) {
    return err(
      invalidGrant("refresh token has expired"),
    );
  }
  if (
    clientIdString(record.clientId) !==
    clientIdString(client.id)
  ) {
    return err(
      invalidGrant(
        "refresh token was issued to a different client",
      ),
    );
  }
  // Mark the presented token rotated, then issue a
  // successor in the same family.
  const marked = await liftStore(() =>
    config.store.setRefreshStatus(
      record.tokenHash,
      "rotated",
    ),
  );
  if (isErr(marked)) {
    return marked;
  }
  const next = freshRefreshToken();
  const saved = await saveRotated(
    config,
    record,
    next,
    now,
  );
  if (isErr(saved)) {
    return saved;
  }
  return issueTokensFor(config)(
    {
      subject: record.subject,
      clientId: record.clientId,
      scopes: record.scopes,
      nonce: none(),
    },
    next,
  );
};

const saveRotated = async (
  config: ProviderConfig,
  parent: RefreshRecord,
  next: RefreshToken,
  now: Num,
): Promise<Result<void, OidcError>> => {
  const hash = await hashRefreshToken(next);
  if (isErr(hash)) {
    return err(
      serverError(
        "failed to hash the rotated refresh token",
      ),
    );
  }
  return liftStore(() =>
    config.store.saveRefreshToken({
      tokenHash: hash.content,
      familyId: parent.familyId,
      clientId: parent.clientId,
      subject: parent.subject,
      scopes: parent.scopes,
      rotatedFrom: some(parent.tokenHash),
      status: "active",
      expiresAt: now + config.refreshTtlSeconds,
    }),
  );
};

// Re-export so the token handler can name the
// grant subject shape.
export type { IssuedCode };
