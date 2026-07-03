import {
  Num,
  Option,
  Result,
  ok,
  err,
} from "plgg";
import {
  Kid,
  RsaPrivateJwk,
} from "plgg-auth/Jose/model/Jwk";
import { Jwks } from "plgg-auth/Jose/model/Jwks";
import {
  Client,
  ClientId,
  RedirectUri,
} from "plgg-auth/Oidc/model/Client";
import {
  RefreshRecord,
  RefreshTokenHash,
  RefreshStatus,
  FamilyId,
} from "plgg-auth/Oidc/model/RefreshToken";
import {
  SigningKeyRecord,
  KeyStatus,
} from "plgg-auth/Oidc/model/SigningKey";
import { CodeChallenge } from "plgg-auth/Oidc/model/Pkce";
import {
  Subject,
  AuthCode,
  AccessToken,
  SessionId,
  PendingRequestId,
} from "plgg-auth/Oidc/model/Tokens";
import {
  AuthorizationRequest,
  Scope,
  Nonce,
} from "plgg-auth/Oidc/model/AuthorizationRequest";
import {
  OidcError,
  toStoreFailure,
} from "plgg-auth/Oidc/model/OidcError";

/**
 * An authorization request parked while the
 * end-user authenticates at the app-owned login
 * route. `expiresAt` is epoch seconds.
 */
export type PendingRequest = Readonly<{
  id: PendingRequestId;
  request: AuthorizationRequest;
  expiresAt: Num;
}>;

/** An authenticated end-user session at the OP. */
export type Session = Readonly<{
  id: SessionId;
  subject: Subject;
  expiresAt: Num;
}>;

/**
 * A single-use authorization code and everything
 * the token endpoint must re-check when it is
 * redeemed.
 */
export type IssuedCode = Readonly<{
  code: AuthCode;
  clientId: ClientId;
  redirectUri: RedirectUri;
  subject: Subject;
  scopes: ReadonlyArray<Scope>;
  nonce: Option<Nonce>;
  codeChallenge: CodeChallenge;
  expiresAt: Num;
}>;

/** A live bearer access token for `/userinfo`. */
export type AccessGrant = Readonly<{
  token: AccessToken;
  subject: Subject;
  clientId: ClientId;
  scopes: ReadonlyArray<Scope>;
  expiresAt: Num;
}>;

/**
 * The persistence seam — the capabilities the
 * provider needs from *any* store. The library
 * never implements it; an application supplies a
 * driver (the testkit ships an in-memory one,
 * phase 4 adds plgg-sql). All calls are async
 * promises; usecases fold rejections into
 * `StoreFailure` via {@link liftStore}.
 *
 * `take*` operations are get-AND-delete in one
 * step: single-use semantics (codes, pending
 * requests) live in the store contract, not in
 * handler sequencing.
 */
export type AuthStore = {
  findClient: (
    id: ClientId,
  ) => Promise<Option<Client>>;
  savePendingRequest: (
    pending: PendingRequest,
  ) => Promise<void>;
  takePendingRequest: (
    id: PendingRequestId,
  ) => Promise<Option<PendingRequest>>;
  saveSession: (
    session: Session,
  ) => Promise<void>;
  findSession: (
    id: SessionId,
  ) => Promise<Option<Session>>;
  saveCode: (code: IssuedCode) => Promise<void>;
  takeCode: (
    code: AuthCode,
  ) => Promise<Option<IssuedCode>>;
  saveAccessGrant: (
    grant: AccessGrant,
  ) => Promise<void>;
  findAccessGrant: (
    token: AccessToken,
  ) => Promise<Option<AccessGrant>>;
  /** The private JWK new tokens are signed with. */
  activeSigningKey: () => Promise<
    Option<RsaPrivateJwk>
  >;
  /** The public set served at `/jwks.json`. */
  verificationJwks: () => Promise<Jwks>;

  // --- refresh tokens (phase 4) --------------------
  /** Persists a newly issued refresh token. */
  saveRefreshToken: (
    record: RefreshRecord,
  ) => Promise<void>;
  /**
   * Looks a refresh token up by its hash — a
   * read, NOT a take: rotation reads the record,
   * checks its status, then transitions it, so
   * reuse of an already-rotated token is
   * detectable.
   */
  findRefreshToken: (
    hash: RefreshTokenHash,
  ) => Promise<Option<RefreshRecord>>;
  /** Transitions one refresh token to a new status. */
  setRefreshStatus: (
    hash: RefreshTokenHash,
    status: RefreshStatus,
  ) => Promise<void>;
  /**
   * Revokes every token in a family — the reuse
   * response: presenting a rotated/revoked token
   * kills the whole lineage.
   */
  revokeRefreshFamily: (
    familyId: FamilyId,
  ) => Promise<void>;

  // --- signing-key lifecycle (phase 4) -------------
  /** Persists a signing key in a lifecycle state. */
  saveSigningKey: (
    record: SigningKeyRecord,
  ) => Promise<void>;
  /** All signing keys in one lifecycle state. */
  signingKeysByStatus: (
    status: KeyStatus,
  ) => Promise<ReadonlyArray<SigningKeyRecord>>;
  /** Transitions a signing key (by kid) to a new status. */
  transitionSigningKey: (
    kid: Kid,
    status: KeyStatus,
  ) => Promise<void>;
};

/**
 * Runs one store operation, folding a rejected
 * promise into a value-level `StoreFailure` —
 * the store counterpart of plgg-sql's
 * `query(db)` fold.
 */
export const liftStore = <T>(
  op: () => Promise<T>,
): Promise<Result<T, OidcError>> =>
  op().then(
    (value): Result<T, OidcError> => ok(value),
    (cause: unknown): Result<T, OidcError> =>
      err(toStoreFailure(cause)),
  );
