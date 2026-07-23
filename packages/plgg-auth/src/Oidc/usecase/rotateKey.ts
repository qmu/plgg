import {
  Num,
  Result,
  ok,
  err,
  isErr,
} from "plgg";
import { generateRsaKey } from "plgg-auth/Jose/usecase/generateRsaKey";
import { RsaPublicJwk } from "plgg-auth/Jose/model/Jwk";
import { liftStore } from "plgg-auth/Oidc/model/AuthStore";
import { ProviderConfig } from "plgg-auth/Oidc/model/ProviderConfig";
import {
  OidcError,
  serverError,
} from "plgg-auth/Oidc/model/OidcError";

/**
 * Rotates the signing key: generates a fresh
 * RSA-2048 key as the new `active` signer and
 * demotes every previously-active key to
 * `retiring` (verify-only, still served in the
 * JWKS so outstanding ID tokens keep validating).
 * Signing always uses the single `active` key;
 * `retireKeys` finalizes the retiring ones once
 * their window passes. Async-shell style.
 */
export const rotateSigningKey =
  (config: ProviderConfig) =>
  async (): Promise<
    Result<RsaPublicJwk, OidcError>
  > => {
    const now = config.clock();
    const generated = await generateRsaKey();
    if (isErr(generated)) {
      return err(
        serverError(
          `failed to generate a signing key: ${generated.content.content.message}`,
          generated.content,
        ),
      );
    }
    // Demote the current active key(s) first, so
    // there is never more than one active signer.
    const actives = await liftStore(() =>
      config.store.signingKeysByStatus("active"),
    );
    if (isErr(actives)) {
      return actives;
    }
    for (const rec of actives.content) {
      const demoted = await liftStore(() =>
        config.store.transitionSigningKey(
          rec.privateKey.kid,
          "retiring",
        ),
      );
      if (isErr(demoted)) {
        return demoted;
      }
    }
    const saved = await liftStore(() =>
      config.store.saveSigningKey({
        privateKey: generated.content.privateKey,
        status: "active",
        createdAt: now,
      }),
    );
    return isErr(saved)
      ? saved
      : ok(generated.content.publicKey);
  };

/**
 * Retires every `retiring` key older than
 * `windowSeconds` — they drop out of the JWKS, so
 * tokens they signed can no longer be validated.
 * Run on a schedule by the operator (no timer
 * lives in library code). Async-shell style.
 */
export const retireKeys =
  (config: ProviderConfig) =>
  (windowSeconds: Num) =>
  async (): Promise<Result<Num, OidcError>> => {
    const now = config.clock();
    const retiring = await liftStore(() =>
      config.store.signingKeysByStatus(
        "retiring",
      ),
    );
    if (isErr(retiring)) {
      return retiring;
    }
    const stale = retiring.content.filter(
      (rec) =>
        rec.createdAt + windowSeconds <= now,
    );
    for (const rec of stale) {
      const retired = await liftStore(() =>
        config.store.transitionSigningKey(
          rec.privateKey.kid,
          "retired",
        ),
      );
      if (isErr(retired)) {
        return retired;
      }
    }
    return ok(stale.length);
  };
