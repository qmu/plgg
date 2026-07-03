import { Option, fromNullable } from "plgg";
import { RsaPrivateJwk } from "plgg-auth/Jose/model/Jwk";
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

/**
 * A test/demo `AuthStore` backed by plain `Map`s.
 * `take*` operations are atomic get-and-delete
 * (single-use). Excluded from coverage like
 * plgg-db-migration's `sqliteDb` testkit; the
 * phase-4 plgg-sql driver replaces it in
 * production.
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
  const publicKeys: ReadonlyArray<RsaPrivateJwk> =
    signingKey.__tag === "Some"
      ? [signingKey.content]
      : [];

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
    > => signingKey,
    verificationJwks: async (): Promise<Jwks> =>
      jwks(
        publicKeys.map((k) => ({
          kty: "RSA",
          n: k.n,
          e: k.e,
          kid: k.kid,
        })),
      ),
  };
};
