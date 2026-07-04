import {
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
import {
  InviteToken,
  InviteHash,
  inviteTokenString,
} from "plgg-auth/Account/model/Invite";
import {
  AccountError,
  liftCrypto,
} from "plgg-auth/Account/model/AccountError";

/**
 * Hash an {@link InviteToken} for storage and lookup: SHA-256, base64url — the
 * one-way mapping the refresh-token hash uses. Only this hash is ever at rest;
 * the plaintext token is shown to the admin once and then discarded.
 */
export const hashInviteToken = (
  token: InviteToken,
): Promise<
  Result<InviteHash, AccountError | Defect>
> =>
  proc(
    liftCrypto<ArrayBuffer>(() =>
      crypto.subtle.digest(
        "SHA-256",
        toBufferSource(
          utf8Bytes(inviteTokenString(token)),
        ),
      ),
    ),
    (digest: ArrayBuffer) =>
      ok(
        box("InviteHash")(
          base64UrlString(
            encodeBase64Url(
              new Uint8Array(digest),
            ),
          ),
        ),
      ),
  );

