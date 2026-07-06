import {
  SoftStr,
  Bin,
  Result,
  Defect,
  ok,
  proc,
  box,
} from "plgg";
import {
  encodeBase64Url,
  base64UrlString,
  utf8Bytes,
  toBufferSource,
} from "plgg-auth/Jose/model/Base64Url";
import { PasswordHash } from "plgg-auth/Account/model/Account";
import {
  AccountError,
  liftCrypto,
} from "plgg-auth/Account/model/AccountError";

/**
 * PBKDF2-HMAC-SHA-256 iteration count. WebCrypto's SubtleCrypto exposes PBKDF2
 * (not scrypt, which is a `node:crypto` binding), so PBKDF2 is the
 * WebCrypto-only, portable choice. 600k is the current OWASP floor for
 * PBKDF2-HMAC-SHA-256; it is encoded into each stored hash so it can be raised
 * later without a migration (a rehash-on-login upgrade path).
 */
export const PBKDF2_ITERATIONS = 600000;

/** Per-account CSPRNG salt length. */
const SALT_BYTES = 16;

/** Derived key length (bits). */
const DERIVED_BITS = 256;

/**
 * Derive the raw PBKDF2 bytes for `plain` under `salt`/`iterations`. Shared by
 * hashing (random salt) and verification (the stored salt), so both paths run
 * the identical KDF. Every `crypto.subtle` call is folded to a `Result` via
 * `liftCrypto` — no bare `await` can throw across the seam.
 */
export const deriveKey = (
  plain: SoftStr,
  salt: Bin,
  iterations: number,
): Promise<
  Result<Bin, AccountError | Defect>
> =>
  proc(
    liftCrypto<CryptoKey>(() =>
      crypto.subtle.importKey(
        "raw",
        toBufferSource(utf8Bytes(plain)),
        { name: "PBKDF2" },
        false,
        ["deriveBits"],
      ),
    ),
    (key: CryptoKey) =>
      liftCrypto<ArrayBuffer>(() =>
        crypto.subtle.deriveBits(
          {
            name: "PBKDF2",
            salt: toBufferSource(salt),
            iterations,
            hash: "SHA-256",
          },
          key,
          DERIVED_BITS,
        ),
      ),
    (bits: ArrayBuffer) =>
      ok(new Uint8Array(bits)),
  );

/**
 * Hash a plaintext password for storage: a fresh 16-byte CSPRNG salt, PBKDF2 at
 * {@link PBKDF2_ITERATIONS}, encoded as the self-describing
 * `pbkdf2$sha256$<iterations>$<salt>$<derived>` string. No plaintext is retained
 * after derivation; the returned value is the only thing persisted.
 */
export const hashPassword = (
  plain: SoftStr,
): Promise<
  Result<PasswordHash, AccountError | Defect>
> => {
  const salt = crypto.getRandomValues(
    new Uint8Array(SALT_BYTES),
  );
  return proc(
    deriveKey(plain, salt, PBKDF2_ITERATIONS),
    (derived: Bin) =>
      ok(
        box("PasswordHash")(
          `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${base64UrlString(
            encodeBase64Url(salt),
          )}$${base64UrlString(
            encodeBase64Url(derived),
          )}`,
        ),
      ),
  );
};
