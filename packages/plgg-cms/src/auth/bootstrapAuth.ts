import {
  type SoftStr,
  type PromisedResult,
  type Defect,
  type InvalidError,
  box,
  proc,
  ok,
  err,
  none,
  defect,
} from "plgg";
import {
  type Web,
} from "plgg-server";
import {
  type Db,
  type SqlError,
  sql,
  exec,
  runScript,
} from "plgg-sql";
import {
  type ProviderConfig,
  type RpConfig,
  type AccountStore,
  type JoseError,
  generateRsaKey,
  sqlStore,
  sqlAccountStore,
  ACCOUNT_SCHEMA,
  applyAuthSchema,
  authenticate,
} from "plgg-auth";
import {
  sqlRpSessionStore,
  initRpSessionSchema,
} from "plgg-cms/auth/rpSessionStore";
import { rpRoleResolver } from "plgg-cms/auth/pressAuth";
import { authWeb } from "plgg-cms/auth/authWeb";

type BootError =
  | SqlError
  | InvalidError
  | Defect
  | JoseError;

/** A bootstrapped auth Web plus the account store to seed users into. */
export type AuthBootstrap = Readonly<{
  web: Web;
  accounts: AccountStore;
}>;

/**
 * Boots the dogfooded OP+RP admin auth over a single `Db`:
 * apply the OP + account + RP-session schemas, mint an active
 * signing key, register the RP client (public / PKCE-only),
 * then assemble the {@link ProviderConfig}/{@link RpConfig}
 * and return the composed {@link authWeb} plus the account
 * store. The RP redirect URI is this instance's own
 * `/auth/callback` (OP and RP are the same origin). Never
 * throws — the whole boot is one `proc` chain.
 */
export const bootstrapAuthWeb =
  (
    db: Db,
    issuer: SoftStr,
    clientId: SoftStr,
    clock: () => number,
    ttlSeconds: number,
    adminApp: Web,
  ): PromisedResult<AuthBootstrap, BootError> => {
    const redirectUri = `${issuer}/auth/callback`;
    const store = sqlStore(db);
    const accounts = sqlAccountStore(db);
    const sessions = sqlRpSessionStore(db);
    return proc(
      applyAuthSchema(db),
      () => runScript(db)(ACCOUNT_SCHEMA),
      () => initRpSessionSchema(db),
      () => generateRsaKey(),
      (key) =>
        store
          .saveSigningKey({
            privateKey: key.privateKey,
            status: "active",
            createdAt: clock(),
          })
          .then(
            () => ok(null),
            (cause: unknown) =>
              err(
                defect(
                  "could not save signing key",
                  cause,
                ),
              ),
          ),
      () =>
        exec(db)(
          sql`INSERT INTO oidc_clients (id, secret_hash) VALUES (${clientId}, ${none()})`,
        ),
      () =>
        exec(db)(
          sql`INSERT INTO oidc_client_redirect_uris (client_id, redirect_uri) VALUES (${clientId}, ${redirectUri})`,
        ),
      () => {
        const config: ProviderConfig = {
          issuer: box("Str")(issuer),
          loginPath: box("Str")("/auth/login"),
          store,
          codeTtlSeconds: 60,
          accessTtlSeconds: 3600,
          idTokenTtlSeconds: 3600,
          sessionTtlSeconds: 86400,
          pendingTtlSeconds: 600,
          refreshTtlSeconds: 1209600,
          clock,
        };
        const rpConfig: RpConfig = {
          clientId: box("ClientId")(clientId),
          redirectUri:
            box("RedirectUri")(redirectUri),
          issuer: box("Str")(issuer),
          authorizePath: "/authorize",
          tokenPath: "/token",
          scope: "openid",
          audience: box("Str")(clientId),
          clock,
          leewaySeconds: 5,
          verificationJwks:
            store.verificationJwks,
        };
        return ok({
          web: authWeb(
            config,
            rpConfig,
            sessions,
            clock,
            ttlSeconds,
            (username, password) =>
              authenticate(accounts)(
                username,
                password,
              ),
            rpRoleResolver(
              sessions,
              accounts,
              clock,
            ),
            adminApp,
          ),
          accounts,
        });
      },
    );
  };
