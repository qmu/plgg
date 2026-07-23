import {
  type SoftStr,
  type Result,
  box,
  ok,
  err,
  isErr,
} from "plgg";
import {
  type CodeVerifier,
  computeS256Challenge,
} from "plgg-auth/Oidc/model/Pkce";
import { type RpConfig } from "plgg-auth/Rp/RpConfig";
import {
  type RpError,
  rpInternal,
} from "plgg-auth/Rp/RpError";

/**
 * The stash a caller keeps between {@link beginLogin} and
 * `completeLogin` (server-side or in a signed cookie): the
 * `authorizeUrl` to redirect the browser to, plus the
 * `verifier`/`state`/`nonce` the callback is checked against.
 */
export type LoginStart = Readonly<{
  authorizeUrl: SoftStr;
  verifier: CodeVerifier;
  state: SoftStr;
  nonce: SoftStr;
}>;

/** CSPRNG hex of `chars` length (even). */
const freshHex = (chars: number): SoftStr =>
  Array.from(
    crypto.getRandomValues(
      new Uint8Array(chars / 2),
    ),
    (b: number) =>
      b.toString(16).padStart(2, "0"),
  ).join("");

/**
 * Begin an authorization-code + PKCE login: mint a
 * `CodeVerifier` and its S256 challenge, a CSPRNG `state`
 * (CSRF) and `nonce` (replay), and assemble the authorize URL
 * with `URLSearchParams` — never string-concatenated
 * unescaped values. Total: an (unexpected) PKCE failure folds
 * to `rpInternal`, never a throw.
 */
export const beginLogin =
  (config: RpConfig) =>
  async (): Promise<
    Result<LoginStart, RpError>
  > => {
    // A fresh 64-char hex verifier is valid by
    // construction (43–128 chars, PKCE charset), so it is
    // built through the raw constructor — no caster branch.
    const verifier: CodeVerifier = box(
      "CodeVerifier",
    )(freshHex(64));
    const challenge =
      await computeS256Challenge(verifier);
    if (isErr(challenge)) {
      return err(
        rpInternal(
          "could not compute PKCE challenge",
        ),
      );
    }
    const state = freshHex(32);
    const nonce = freshHex(32);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId.content,
      redirect_uri: config.redirectUri.content,
      scope: config.scope,
      state,
      nonce,
      code_challenge: challenge.content.content,
      code_challenge_method: "S256",
    });
    return ok({
      authorizeUrl: `${config.issuer.content}${config.authorizePath}?${params.toString()}`,
      verifier,
      state,
      nonce,
    });
  };
