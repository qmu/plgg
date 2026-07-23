import {
  Num,
  Result,
  ok,
  err,
  isErr,
  matchOption,
} from "plgg";
import {
  IssuedCode,
  PendingRequest,
  Session,
  liftStore,
} from "plgg-auth/Oidc/model/AuthStore";
import {
  Subject,
  AuthCode,
  SessionId,
  PendingRequestId,
  freshAuthCode,
  freshSessionId,
} from "plgg-auth/Oidc/model/Tokens";
import { ProviderConfig } from "plgg-auth/Oidc/model/ProviderConfig";
import {
  OidcError,
  unknownPendingRequest,
} from "plgg-auth/Oidc/model/OidcError";

/** The outcome of completing an authorization. */
export type AuthorizationGranted = Readonly<{
  code: AuthCode;
  session: SessionId;
  pending: PendingRequest;
}>;

const codeFor = (
  pending: PendingRequest,
  subject: Subject,
  code: AuthCode,
  now: Num,
  ttl: Num,
): IssuedCode => ({
  code,
  clientId: pending.request.clientId,
  redirectUri: pending.request.redirectUri,
  subject,
  scopes: pending.request.scopes,
  nonce: pending.request.nonce,
  codeChallenge: pending.request.codeChallenge,
  expiresAt: now + ttl,
});

/**
 * The app-facing login seam. After the
 * application authenticates the end-user however
 * it likes, it calls this with the pending
 * request id and the resulting {@link Subject}.
 * The provider establishes a session, mints and
 * stores a single-use code, and returns both so
 * the app can set the session cookie and
 * redirect back to the RP. The provider never
 * sees a password. Async-shell style.
 */
export const completeAuthorization =
  (config: ProviderConfig) =>
  (
    pendingId: PendingRequestId,
    subject: Subject,
  ) =>
  async (): Promise<
    Result<AuthorizationGranted, OidcError>
  > => {
    const now = config.clock();
    const taken = await liftStore(() =>
      config.store.takePendingRequest(pendingId),
    );
    if (isErr(taken)) {
      return taken;
    }
    return matchOption(
      (): Promise<
        Result<AuthorizationGranted, OidcError>
      > =>
        Promise.resolve(
          err(
            unknownPendingRequest(
              "no pending authorization request for this id (expired or already used)",
            ),
          ),
        ),
      async (pending: PendingRequest) => {
        if (pending.expiresAt <= now) {
          return err(
            unknownPendingRequest(
              "the pending authorization request has expired",
            ),
          );
        }
        const session: Session = {
          id: freshSessionId(),
          subject,
          expiresAt:
            now + config.sessionTtlSeconds,
        };
        const savedSession = await liftStore(() =>
          config.store.saveSession(session),
        );
        if (isErr(savedSession)) {
          return savedSession;
        }
        const code = freshAuthCode();
        const savedCode = await liftStore(() =>
          config.store.saveCode(
            codeFor(
              pending,
              subject,
              code,
              now,
              config.codeTtlSeconds,
            ),
          ),
        );
        if (isErr(savedCode)) {
          return savedCode;
        }
        return ok({
          code,
          session: session.id,
          pending,
        });
      },
    )(taken.content);
  };
