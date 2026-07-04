import {
  SoftStr,
  Option,
  Result,
  some,
  none,
  isOk,
  matchOption,
} from "plgg";
import {
  Db,
  Sql,
  sql,
  query,
  exec,
} from "plgg-sql";
import { RsaPrivateJwk } from "plgg-auth/Jose/model/Jwk";
import {
  Kid,
  kidString,
} from "plgg-auth/Jose/model/Jwk";
import {
  Jwks,
  jwks,
} from "plgg-auth/Jose/model/Jwks";
import {
  AuthStore,
  AccessGrant,
  IssuedCode,
  PendingRequest,
  Session,
} from "plgg-auth/Oidc/model/AuthStore";
import {
  Client,
  ClientId,
  clientIdString,
  redirectUriString,
} from "plgg-auth/Oidc/model/Client";
import {
  AuthCode,
  AccessToken,
  SessionId,
  PendingRequestId,
  subjectString,
  authCodeString,
  accessTokenString,
  sessionIdString,
  pendingRequestIdString,
} from "plgg-auth/Oidc/model/Tokens";
import { codeChallengeString } from "plgg-auth/Oidc/model/Pkce";
import {
  RefreshRecord,
  RefreshTokenHash,
  RefreshStatus,
  FamilyId,
  refreshTokenHashString,
  familyIdString,
} from "plgg-auth/Oidc/model/RefreshToken";
import {
  SigningKeyRecord,
  KeyStatus,
} from "plgg-auth/Oidc/model/SigningKey";
import {
  encodeScopes,
  nonceColumn,
  encodePrivateJwk,
  encodeAuthorizationRequest,
  buildClient,
  asIssuedCode,
  asAccessGrant,
  asRefreshRecord,
  asSigningKeyRecord,
  asSessionRow,
  asPendingRow,
} from "plgg-auth/Sql/rows";

/** The tables the {@link sqlStore} reads and writes. */
export const AUTH_TABLES = {
  clients: "oidc_clients",
  redirectUris: "oidc_client_redirect_uris",
  pending: "oidc_pending_requests",
  sessions: "oidc_sessions",
  codes: "oidc_authorization_codes",
  grants: "oidc_access_grants",
  refresh: "oidc_refresh_tokens",
  keys: "oidc_signing_keys",
};

const run = async (
  db: Db,
  statement: Sql,
): Promise<void> => {
  const result = await exec(db)(statement);
  if (!isOk(result)) {
    throw new Error(
      result.content.content.message,
    );
  }
};

const rows = async (
  db: Db,
  statement: Sql,
): Promise<ReadonlyArray<unknown>> => {
  const result = await query(db)(statement);
  if (!isOk(result)) {
    throw new Error(
      result.content.content.message,
    );
  }
  return result.content;
};

const firstOf = <T>(
  list: ReadonlyArray<unknown>,
  decode: (row: unknown) => Result<T, unknown>,
): Option<T> => {
  const head = list[0];
  if (head === undefined) {
    return none();
  }
  const decoded = decode(head);
  return decoded.__tag === "Ok"
    ? some(decoded.content)
    : none();
};

const signingKeys =
  (db: Db) =>
  async (
    status: KeyStatus,
  ): Promise<ReadonlyArray<SigningKeyRecord>> =>
    (
      await rows(
        db,
        sql`SELECT kid, private_jwk, status, created_at FROM oidc_signing_keys WHERE status = ${status} ORDER BY created_at DESC`,
      )
    ).flatMap((row) => {
      const decoded = asSigningKeyRecord(row);
      return decoded.__tag === "Ok"
        ? [decoded.content]
        : [];
    });

const refreshFromColumn = (
  record: RefreshRecord,
): Option<SoftStr> =>
  matchOption(
    (): Option<SoftStr> => none(),
    (h: RefreshTokenHash) =>
      some(refreshTokenHashString(h)),
  )(record.rotatedFrom);

/**
 * A plgg-sql-backed {@link AuthStore} over the
 * driver-agnostic {@link Db} seam. Every value is
 * bound through the injection-safe `sql` template;
 * rows are decoded with the casters in
 * `Sql/rows.ts` (a shape mismatch reads as absent,
 * not a throw). `take*` operations run their
 * SELECT+DELETE inside one `Db` transaction so
 * single-use codes/pending requests are atomic —
 * the property the in-memory `Map.delete` gives
 * for free, made explicit for SQL.
 *
 * **At-rest note:** signing-key private JWKs are
 * stored as JSON in `oidc_signing_keys.private_jwk`.
 * Encrypting that column (a KMS-wrapped value, an
 * env-provided key) is an operator decision; this
 * driver stores the plaintext JWK and documents
 * the boundary here rather than pretending to
 * solve key custody.
 */
export const sqlStore = (db: Db): AuthStore => {
  const takeFrom = async <T>(
    select: Sql,
    del: Sql,
    decode: (row: unknown) => Result<T, unknown>,
  ): Promise<Option<T>> => {
    await db.begin();
    try {
      const found = await db.all(select);
      await db.run(del);
      await db.commit();
      return firstOf(found, decode);
    } catch (cause) {
      await db.rollback();
      throw cause;
    }
  };

  return {
    findClient: async (
      id: ClientId,
    ): Promise<Option<Client>> => {
      const idStr = clientIdString(id);
      const base = await rows(
        db,
        sql`SELECT id, secret_hash FROM oidc_clients WHERE id = ${idStr}`,
      );
      const head = base[0];
      if (head === undefined) {
        return none();
      }
      const uris = await rows(
        db,
        sql`SELECT redirect_uri FROM oidc_client_redirect_uris WHERE client_id = ${idStr}`,
      );
      const built = buildClient(head, uris);
      return built.__tag === "Ok"
        ? some(built.content)
        : none();
    },

    savePendingRequest: async (
      pending: PendingRequest,
    ): Promise<void> => {
      await run(
        db,
        sql`INSERT INTO oidc_pending_requests (id, payload, expires_at) VALUES (${pendingRequestIdString(
          pending.id,
        )}, ${encodeAuthorizationRequest(
          pending.request,
        )}, ${pending.expiresAt})`,
      );
    },
    takePendingRequest: (
      id: PendingRequestId,
    ): Promise<Option<PendingRequest>> => {
      const idStr = pendingRequestIdString(id);
      return takeFrom(
        sql`SELECT id, payload, expires_at FROM oidc_pending_requests WHERE id = ${idStr}`,
        sql`DELETE FROM oidc_pending_requests WHERE id = ${idStr}`,
        asPendingRow,
      );
    },

    saveSession: async (
      session: Session,
    ): Promise<void> => {
      await run(
        db,
        sql`INSERT INTO oidc_sessions (id, subject, expires_at) VALUES (${sessionIdString(
          session.id,
        )}, ${subjectString(
          session.subject,
        )}, ${session.expiresAt})`,
      );
    },
    findSession: async (
      id: SessionId,
    ): Promise<Option<Session>> =>
      firstOf(
        await rows(
          db,
          sql`SELECT id, subject, expires_at FROM oidc_sessions WHERE id = ${sessionIdString(
            id,
          )}`,
        ),
        asSessionRow,
      ),

    saveCode: async (
      code: IssuedCode,
    ): Promise<void> => {
      await run(
        db,
        sql`INSERT INTO oidc_authorization_codes (code, client_id, redirect_uri, subject, scopes, nonce, code_challenge, expires_at) VALUES (${authCodeString(
          code.code,
        )}, ${clientIdString(
          code.clientId,
        )}, ${redirectUriString(
          code.redirectUri,
        )}, ${subjectString(
          code.subject,
        )}, ${encodeScopes(
          code.scopes,
        )}, ${nonceColumn(
          code.nonce,
        )}, ${codeChallengeString(
          code.codeChallenge,
        )}, ${code.expiresAt})`,
      );
    },
    takeCode: (
      code: AuthCode,
    ): Promise<Option<IssuedCode>> => {
      const codeStr = authCodeString(code);
      return takeFrom(
        sql`SELECT code, client_id, redirect_uri, subject, scopes, nonce, code_challenge, expires_at FROM oidc_authorization_codes WHERE code = ${codeStr}`,
        sql`DELETE FROM oidc_authorization_codes WHERE code = ${codeStr}`,
        asIssuedCode,
      );
    },

    saveAccessGrant: async (
      grant: AccessGrant,
    ): Promise<void> => {
      await run(
        db,
        sql`INSERT INTO oidc_access_grants (token, subject, client_id, scopes, expires_at) VALUES (${accessTokenString(
          grant.token,
        )}, ${subjectString(
          grant.subject,
        )}, ${clientIdString(
          grant.clientId,
        )}, ${encodeScopes(
          grant.scopes,
        )}, ${grant.expiresAt})`,
      );
    },
    findAccessGrant: async (
      token: AccessToken,
    ): Promise<Option<AccessGrant>> =>
      firstOf(
        await rows(
          db,
          sql`SELECT token, subject, client_id, scopes, expires_at FROM oidc_access_grants WHERE token = ${accessTokenString(
            token,
          )}`,
        ),
        asAccessGrant,
      ),

    activeSigningKey: async (): Promise<
      Option<RsaPrivateJwk>
    > => {
      const keys =
        await signingKeys(db)("active");
      const head = keys[0];
      return head === undefined
        ? none()
        : some(head.privateKey);
    },
    verificationJwks: async (): Promise<Jwks> => {
      const active =
        await signingKeys(db)("active");
      const retiring =
        await signingKeys(db)("retiring");
      return jwks(
        [...active, ...retiring].map((k) => ({
          kty: "RSA",
          n: k.privateKey.n,
          e: k.privateKey.e,
          kid: k.privateKey.kid,
        })),
      );
    },

    saveRefreshToken: async (
      record: RefreshRecord,
    ): Promise<void> => {
      await run(
        db,
        sql`INSERT INTO oidc_refresh_tokens (token_hash, family_id, client_id, subject, scopes, rotated_from, status, expires_at) VALUES (${refreshTokenHashString(
          record.tokenHash,
        )}, ${familyIdString(
          record.familyId,
        )}, ${clientIdString(
          record.clientId,
        )}, ${subjectString(
          record.subject,
        )}, ${encodeScopes(
          record.scopes,
        )}, ${refreshFromColumn(
          record,
        )}, ${record.status}, ${record.expiresAt})`,
      );
    },
    findRefreshToken: async (
      hash: RefreshTokenHash,
    ): Promise<Option<RefreshRecord>> =>
      firstOf(
        await rows(
          db,
          sql`SELECT token_hash, family_id, client_id, subject, scopes, rotated_from, status, expires_at FROM oidc_refresh_tokens WHERE token_hash = ${refreshTokenHashString(
            hash,
          )}`,
        ),
        asRefreshRecord,
      ),
    setRefreshStatus: async (
      hash: RefreshTokenHash,
      status: RefreshStatus,
    ): Promise<void> => {
      await run(
        db,
        sql`UPDATE oidc_refresh_tokens SET status = ${status} WHERE token_hash = ${refreshTokenHashString(
          hash,
        )}`,
      );
    },
    revokeRefreshFamily: async (
      familyId: FamilyId,
    ): Promise<void> => {
      await run(
        db,
        sql`UPDATE oidc_refresh_tokens SET status = ${"revoked"} WHERE family_id = ${familyIdString(
          familyId,
        )}`,
      );
    },

    saveSigningKey: async (
      record: SigningKeyRecord,
    ): Promise<void> => {
      await run(
        db,
        sql`INSERT INTO oidc_signing_keys (kid, private_jwk, status, created_at) VALUES (${kidString(
          record.privateKey.kid,
        )}, ${encodePrivateJwk(
          record,
        )}, ${record.status}, ${record.createdAt})`,
      );
    },
    signingKeysByStatus: (
      status: KeyStatus,
    ): Promise<ReadonlyArray<SigningKeyRecord>> =>
      signingKeys(db)(status),
    transitionSigningKey: async (
      kid: Kid,
      status: KeyStatus,
    ): Promise<void> => {
      await run(
        db,
        sql`UPDATE oidc_signing_keys SET status = ${status} WHERE kid = ${kidString(
          kid,
        )}`,
      );
    },
  };
};
