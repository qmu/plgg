import { Option, fromNullable, none } from "plgg";
import {
  RsaPrivateJwk,
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
} from "plgg-auth/Oidc/model/Client";
import {
  AuthCode,
  AccessToken,
  SessionId,
  PendingRequestId,
  authCodeString,
  accessTokenString,
  sessionIdString,
  pendingRequestIdString,
} from "plgg-auth/Oidc/model/Tokens";
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

/**
 * A test/demo `AuthStore` backed by plain `Map`s.
 * `take*` operations are atomic get-and-delete
 * (single-use). Signing keys are seeded from the
 * optional `signingKey` as an `active` record;
 * refresh tokens and further keys are added
 * through the phase-4 methods. Excluded from
 * coverage like plgg-db-migration's `sqliteDb`
 * testkit; the phase-4 plgg-sql driver replaces
 * it in production.
 */
export const memoryStore = (
  clients: ReadonlyArray<Client>,
  signingKey: Option<RsaPrivateJwk>,
): AuthStore => {
  const clientMap = new Map<string, Client>(
    clients.map((c) => [clientIdString(c.id), c]),
  );
  const pendings = new Map<
    string,
    PendingRequest
  >();
  const sessions = new Map<string, Session>();
  const codes = new Map<string, IssuedCode>();
  const grants = new Map<string, AccessGrant>();
  const refresh = new Map<
    string,
    RefreshRecord
  >();
  const keys = new Map<string, SigningKeyRecord>(
    signingKey.__tag === "Some"
      ? [
          [
            kidString(signingKey.content.kid),
            {
              privateKey: signingKey.content,
              status: "active",
              createdAt: 0,
            },
          ],
        ]
      : [],
  );

  const keysWithStatus = (
    status: KeyStatus,
  ): ReadonlyArray<SigningKeyRecord> =>
    [...keys.values()].filter(
      (k) => k.status === status,
    );

  return {
    findClient: async (
      id: ClientId,
    ): Promise<Option<Client>> =>
      fromNullable(
        clientMap.get(clientIdString(id)),
      ),
    savePendingRequest: async (
      pending: PendingRequest,
    ): Promise<void> => {
      pendings.set(
        pendingRequestIdString(pending.id),
        pending,
      );
    },
    takePendingRequest: async (
      id: PendingRequestId,
    ): Promise<Option<PendingRequest>> => {
      const key = pendingRequestIdString(id);
      const found = pendings.get(key);
      pendings.delete(key);
      return fromNullable(found);
    },
    saveSession: async (
      session: Session,
    ): Promise<void> => {
      sessions.set(
        sessionIdString(session.id),
        session,
      );
    },
    findSession: async (
      id: SessionId,
    ): Promise<Option<Session>> =>
      fromNullable(
        sessions.get(sessionIdString(id)),
      ),
    saveCode: async (
      code: IssuedCode,
    ): Promise<void> => {
      codes.set(authCodeString(code.code), code);
    },
    takeCode: async (
      code: AuthCode,
    ): Promise<Option<IssuedCode>> => {
      const key = authCodeString(code);
      const found = codes.get(key);
      codes.delete(key);
      return fromNullable(found);
    },
    saveAccessGrant: async (
      grant: AccessGrant,
    ): Promise<void> => {
      grants.set(
        accessTokenString(grant.token),
        grant,
      );
    },
    findAccessGrant: async (
      token: AccessToken,
    ): Promise<Option<AccessGrant>> =>
      fromNullable(
        grants.get(accessTokenString(token)),
      ),
    activeSigningKey: async (): Promise<
      Option<RsaPrivateJwk>
    > => {
      const [active] = keysWithStatus("active");
      return active === undefined
        ? none()
        : fromNullable(active.privateKey);
    },
    verificationJwks: async (): Promise<Jwks> =>
      jwks(
        [
          ...keysWithStatus("active"),
          ...keysWithStatus("retiring"),
        ].map((k) => ({
          kty: "RSA",
          n: k.privateKey.n,
          e: k.privateKey.e,
          kid: k.privateKey.kid,
        })),
      ),

    saveRefreshToken: async (
      record: RefreshRecord,
    ): Promise<void> => {
      refresh.set(
        refreshTokenHashString(record.tokenHash),
        record,
      );
    },
    findRefreshToken: async (
      hash: RefreshTokenHash,
    ): Promise<Option<RefreshRecord>> =>
      fromNullable(
        refresh.get(refreshTokenHashString(hash)),
      ),
    setRefreshStatus: async (
      hash: RefreshTokenHash,
      status: RefreshStatus,
    ): Promise<void> => {
      const key = refreshTokenHashString(hash);
      const found = refresh.get(key);
      if (found !== undefined) {
        refresh.set(key, { ...found, status });
      }
    },
    revokeRefreshFamily: async (
      familyId: FamilyId,
    ): Promise<void> => {
      const target = familyIdString(familyId);
      for (const [key, rec] of refresh) {
        if (
          familyIdString(rec.familyId) === target
        ) {
          refresh.set(key, {
            ...rec,
            status: "revoked",
          });
        }
      }
    },

    saveSigningKey: async (
      record: SigningKeyRecord,
    ): Promise<void> => {
      keys.set(
        kidString(record.privateKey.kid),
        record,
      );
    },
    signingKeysByStatus: async (
      status: KeyStatus,
    ): Promise<ReadonlyArray<SigningKeyRecord>> =>
      keysWithStatus(status),
    transitionSigningKey: async (
      kid,
      status: KeyStatus,
    ): Promise<void> => {
      const key = kidString(kid);
      const found = keys.get(key);
      if (found !== undefined) {
        keys.set(key, { ...found, status });
      }
    },
  };
};
