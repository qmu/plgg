import {
  SoftStr,
  Dict,
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
  tryCatch,
  toOption,
  getOr,
} from "plgg";
import {
  Client,
  ClientId,
  ClientSecretHash,
  asClientId,
  clientIdString,
  clientSecretHashString,
  hashClientSecret,
} from "plgg-auth/Oidc/model/Client";
import {
  AuthStore,
  liftStore,
} from "plgg-auth/Oidc/model/AuthStore";
import {
  OidcError,
  invalidClient,
  serverError,
} from "plgg-auth/Oidc/model/OidcError";

const lookupOwn = (
  map: Dict<string, SoftStr>,
  name: SoftStr,
): Option<SoftStr> =>
  Object.prototype.hasOwnProperty.call(map, name)
    ? fromNullable(map[name])
    : none();

/**
 * A presented client credential parsed from the
 * token request: the `client_id` plus an
 * optional secret (absent for a public client
 * authenticating by PKCE alone).
 */
export type ClientCredential = Readonly<{
  clientId: ClientId;
  secret: Option<SoftStr>;
}>;

const safeAtob = (s: SoftStr): SoftStr =>
  pipe(
    tryCatch((v: SoftStr) => atob(v))(s),
    toOption,
    getOr(""),
  );

const decodeBasic = (
  header: SoftStr,
): Option<readonly [SoftStr, SoftStr]> => {
  if (!header.startsWith("Basic ")) {
    return none();
  }
  const decoded = safeAtob(header.slice(6));
  const colon = decoded.indexOf(":");
  const pair: readonly [SoftStr, SoftStr] = [
    decoded.slice(0, colon),
    decoded.slice(colon + 1),
  ];
  return colon === -1 ? none() : some(pair);
};

/**
 * Extracts the client credential from a token
 * request, supporting `client_secret_basic`
 * (Authorization header) and
 * `client_secret_post` (form body). The
 * `client_id` is mandatory in both.
 */
export const readClientCredential = (
  form: Dict<string, SoftStr>,
  authorizationHeader: Option<SoftStr>,
): Result<ClientCredential, OidcError> =>
  pipe(
    authorizationHeader,
    matchOption(
      (): Result<ClientCredential, OidcError> =>
        pipe(
          lookupOwn(form, "client_id"),
          matchOption(
            (): Result<
              ClientCredential,
              OidcError
            > =>
              err(
                invalidClient(
                  "no client authentication (missing client_id)",
                ),
              ),
            (id: SoftStr) =>
              pipe(
                asClientId(id),
                (
                  r,
                ): Result<
                  ClientCredential,
                  OidcError
                > =>
                  isErr(r)
                    ? err(
                        invalidClient(
                          r.content.content
                            .message,
                        ),
                      )
                    : ok({
                        clientId: r.content,
                        secret: lookupOwn(
                          form,
                          "client_secret",
                        ),
                      }),
              ),
          ),
        ),
      (header: SoftStr) =>
        pipe(
          decodeBasic(header),
          matchOption(
            (): Result<
              ClientCredential,
              OidcError
            > =>
              err(
                invalidClient(
                  "malformed Basic authorization header",
                ),
              ),
            (pair: readonly [SoftStr, SoftStr]) =>
              pipe(
                asClientId(pair[0]),
                (
                  r,
                ): Result<
                  ClientCredential,
                  OidcError
                > =>
                  isErr(r)
                    ? err(
                        invalidClient(
                          r.content.content
                            .message,
                        ),
                      )
                    : ok({
                        clientId: r.content,
                        secret: fromNullable(
                          pair[1],
                        ),
                      }),
              ),
          ),
        ),
    ),
  );

/**
 * Authenticates a client against its
 * registration: a confidential client
 * (registered `secretHash`) must present a
 * secret whose SHA-256 matches; a public client
 * (`None`) must present none and relies on PKCE.
 * The load-and-match is constant in shape
 * regardless of outcome. Async-shell style.
 */
export const authenticateClient =
  (store: AuthStore) =>
  async (
    credential: ClientCredential,
  ): Promise<Result<Client, OidcError>> => {
    const found = await liftStore(() =>
      store.findClient(credential.clientId),
    );
    if (isErr(found)) {
      return found;
    }
    return matchOption(
      (): Promise<Result<Client, OidcError>> =>
        Promise.resolve(
          err(
            invalidClient(
              `unknown client "${clientIdString(credential.clientId)}"`,
            ),
          ),
        ),
      async (client: Client) =>
        matchOption(
          // Public client: must NOT present a secret.
          (): Promise<
            Result<Client, OidcError>
          > =>
            Promise.resolve(
              matchOption(
                (): Result<Client, OidcError> =>
                  ok(client),
                (): Result<Client, OidcError> =>
                  err(
                    invalidClient(
                      "a public client must not present a client secret",
                    ),
                  ),
              )(credential.secret),
            ),
          // Confidential client: secret must match.
          async (hash: ClientSecretHash) =>
            matchOption(
              (): Promise<
                Result<Client, OidcError>
              > =>
                Promise.resolve(
                  err(
                    invalidClient(
                      "this client requires a client secret",
                    ),
                  ),
                ),
              async (secret: SoftStr) => {
                const computed =
                  await hashClientSecret(secret);
                return isErr(computed)
                  ? err(
                      serverError(
                        "failed to hash the presented client secret",
                      ),
                    )
                  : clientSecretHashString(
                        computed.content,
                      ) ===
                      clientSecretHashString(hash)
                    ? ok(client)
                    : err(
                        invalidClient(
                          "client secret does not match",
                        ),
                      );
              },
            )(credential.secret),
        )(client.secretHash),
    )(found.content);
  };
