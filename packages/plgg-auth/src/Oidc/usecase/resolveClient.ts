import {
  SoftStr,
  Dict,
  Option,
  Result,
  ok,
  err,
  isErr,
  pipe,
  none,
  fromNullable,
  matchOption,
} from "plgg";
import {
  Client,
  ClientId,
  RedirectUri,
  asClientId,
  asRedirectUri,
  hasRedirectUri,
} from "plgg-auth/Oidc/model/Client";
import {
  AuthStore,
  liftStore,
} from "plgg-auth/Oidc/model/AuthStore";
import {
  OidcError,
  invalidRequest,
  invalidClient,
} from "plgg-auth/Oidc/model/OidcError";

/**
 * A client whose `redirect_uri` has been
 * validated against its registration — the
 * precondition for ANY error being redirected
 * back to the RP (RFC 6749 §4.1.2.1: an
 * unregistered redirect uri must never receive a
 * redirect).
 */
export type ResolvedRedirect = Readonly<{
  client: Client;
  redirectUri: RedirectUri;
}>;

const lookupOwn = (
  map: Dict<string, SoftStr>,
  name: SoftStr,
): Option<SoftStr> =>
  Object.prototype.hasOwnProperty.call(map, name)
    ? fromNullable(map[name])
    : none();

/**
 * Resolves and validates the client and
 * `redirect_uri` from the raw `/authorize`
 * query. Every failure here is NON-redirectable
 * (rendered locally); only once this succeeds
 * may a later error be sent back to the RP.
 * Async-shell style: staged `await`s
 * short-circuit on `Err`.
 */
export const resolveRedirect =
  (store: AuthStore) =>
  async (
    query: Dict<string, SoftStr>,
  ): Promise<
    Result<ResolvedRedirect, OidcError>
  > => {
    const clientId = pipe(
      lookupOwn(query, "client_id"),
      matchOption(
        (): Result<ClientId, OidcError> =>
          err(
            invalidRequest('missing "client_id"'),
          ),
        (raw: SoftStr) =>
          pipe(
            asClientId(raw),
            (r): Result<ClientId, OidcError> =>
              isErr(r)
                ? err(
                    invalidRequest(
                      r.content.content.message,
                    ),
                  )
                : ok(r.content),
          ),
      ),
    );
    if (isErr(clientId)) {
      return clientId;
    }
    const redirectUri = pipe(
      lookupOwn(query, "redirect_uri"),
      matchOption(
        (): Result<RedirectUri, OidcError> =>
          err(
            invalidRequest(
              'missing "redirect_uri"',
            ),
          ),
        (raw: SoftStr) =>
          pipe(
            asRedirectUri(raw),
            (
              r,
            ): Result<RedirectUri, OidcError> =>
              isErr(r)
                ? err(
                    invalidRequest(
                      r.content.content.message,
                    ),
                  )
                : ok(r.content),
          ),
      ),
    );
    if (isErr(redirectUri)) {
      return redirectUri;
    }
    const found = await liftStore(() =>
      store.findClient(clientId.content),
    );
    if (isErr(found)) {
      return found;
    }
    return matchOption(
      (): Result<ResolvedRedirect, OidcError> =>
        err(
          invalidClient(
            `unknown client "${clientId.content.content}"`,
          ),
        ),
      (client: Client) =>
        hasRedirectUri(
          client,
          redirectUri.content.content,
        )
          ? ok({
              client,
              redirectUri: redirectUri.content,
            })
          : err(
              invalidRequest(
                "redirect_uri is not registered for this client",
              ),
            ),
    )(found.content);
  };
