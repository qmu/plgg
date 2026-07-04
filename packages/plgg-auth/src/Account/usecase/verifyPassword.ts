import {
  SoftStr,
  Bin,
  Bool,
  Result,
  Defect,
  InvalidError,
  ok,
  err,
  proc,
  pipe,
  mapResult,
  chainResult,
  mapErr,
} from "plgg";
import {
  asBase64UrlStr,
  decodeBase64Url,
} from "plgg-auth/Jose/model/Base64Url";
import {
  PasswordHash,
  passwordHashString,
} from "plgg-auth/Account/model/Account";
import {
  AccountError,
  decodeFailure,
} from "plgg-auth/Account/model/AccountError";
import { deriveKey } from "plgg-auth/Account/usecase/hashPassword";

/** The parsed parts of a stored password hash. */
type Parsed = Readonly<{
  iterations: number;
  salt: Bin;
  derived: Bin;
}>;

/**
 * Compare two byte arrays in constant time. This is an irreducible imperative
 * seam: after the length check, XOR every byte into an accumulator with **no
 * early return**, so timing cannot leak how many leading bytes matched (never
 * `===` on the base64 strings).
 */
const constantTimeEqual = (
  a: Bin,
  b: Bin,
): Bool => {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i = i + 1) {
    diff =
      diff | ((a[i] ?? 0) ^ (b[i] ?? 0));
  }
  return diff === 0;
};

/** Decode the salt/derived base64url parts and assemble a {@link Parsed}. */
const decodeParts = (
  iterStr: string,
  saltStr: string,
  derivedStr: string,
): Result<Parsed, AccountError> =>
  pipe(
    asBase64UrlStr(saltStr),
    chainResult(decodeBase64Url),
    chainResult((salt: Bin) =>
      pipe(
        asBase64UrlStr(derivedStr),
        chainResult(decodeBase64Url),
        mapResult(
          (derived: Bin): Parsed => ({
            iterations: Number(iterStr),
            salt,
            derived,
          }),
        ),
      ),
    ),
    mapErr(
      (e: InvalidError): AccountError =>
        decodeFailure(e.content.message),
    ),
  );

/**
 * Parse the `pbkdf2$sha256$<iter>$<salt>$<derived>` string. Splitting (rather
 * than a regex) makes every malformed shape — wrong scheme, wrong digest, too
 * few / too many parts, non-numeric iterations — a distinct, testable failure
 * path rather than a dead guard.
 */
const parseHash = (
  encoded: string,
): Result<Parsed, AccountError> => {
  const [
    scheme,
    algo,
    iterStr,
    saltStr,
    derivedStr,
    extra,
  ] = encoded.split("$");
  return scheme === "pbkdf2" &&
    algo === "sha256" &&
    iterStr !== undefined &&
    saltStr !== undefined &&
    derivedStr !== undefined &&
    extra === undefined &&
    /^\d+$/.test(iterStr)
    ? decodeParts(iterStr, saltStr, derivedStr)
    : err(
        decodeFailure("malformed password hash"),
      );
};

/**
 * Verify `plain` against a stored {@link PasswordHash}: parse the stored
 * parameters, re-derive under the SAME salt and iteration count, and compare the
 * derived bytes in constant time. A tampered/unparseable stored string is a
 * typed `DecodeFailure`, never a throw.
 */
export const verifyPassword = (
  plain: SoftStr,
  hash: PasswordHash,
): Promise<
  Result<Bool, AccountError | Defect>
> =>
  proc(
    parseHash(passwordHashString(hash)),
    (parsed: Parsed) =>
      proc(
        deriveKey(
          plain,
          parsed.salt,
          parsed.iterations,
        ),
        (rederived: Bin) =>
          ok(
            constantTimeEqual(
              rederived,
              parsed.derived,
            ),
          ),
      ),
  );
