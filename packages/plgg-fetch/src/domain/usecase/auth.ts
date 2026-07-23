import { SoftStr, Dict } from "plgg";

/**
 * An `Authorization: Bearer <token>` header dict, to spread into a request's
 * `headers` (`{ ...bearerAuth(token), "content-type": … }`). The simplest auth
 * shape a typed transport needs to sit in front of a bearer-token API without
 * keeping the vendor SDK.
 *
 * The heavier signing families a full ACL wants — AWS SigV4 request signing and
 * GCP service-account OAuth token exchange — are their own (crypto-bearing)
 * helpers, tracked separately; this file is the hand-rollable header shapes.
 */
export const bearerAuth = (
  token: SoftStr,
): Dict<string, SoftStr> => ({
  authorization: `Bearer ${token}`,
});

/**
 * A versioned-header auth dict: an API key under `keyHeader` plus an API
 * version under `versionHeader` — the second-commonest hand-rolled shape (e.g.
 * an `x-api-key` + a dated version header). Every header NAME is caller-supplied
 * so no vendor is privileged (vendor-neutrality).
 */
export const versionedAuth = (
  keyHeader: SoftStr,
  key: SoftStr,
  versionHeader: SoftStr,
  version: SoftStr,
): Dict<string, SoftStr> => ({
  [keyHeader]: key,
  [versionHeader]: version,
});
