import {
  type SoftStr,
  type Dict,
  type Result,
  box,
  ok,
  err,
  isErr,
  some,
  none,
  cast,
  asRawObj,
  asSoftStr,
  forProp,
  decodeJson,
} from "plgg";
import {
  type HttpRequest,
  type HttpResponse,
} from "plgg-server";
import { asCompactJws } from "plgg-auth/Jose/model/CompactJws";
import { type JwtClaims } from "plgg-auth/Jose/model/JwtClaims";
import { validateJwt } from "plgg-auth/Jose/usecase/validateJwt";
import {
  type Subject,
  asSubject,
} from "plgg-auth/Oidc/model/Tokens";
import { type RpConfig } from "plgg-auth/Rp/RpConfig";
import { type RpTransport } from "plgg-auth/Rp/RpTransport";
import { type LoginStart } from "plgg-auth/Rp/beginLogin";
import {
  type RpError,
  stateMismatch,
  missingCode,
  tokenExchangeFailed,
  invalidIdToken,
} from "plgg-auth/Rp/RpError";

/** The validated outcome of a login: who, their claims, the raw id_token. */
export type LoginResult = Readonly<{
  subject: Subject;
  claims: JwtClaims;
  idToken: SoftStr;
}>;

const bodyText = (res: HttpResponse): SoftStr =>
  typeof res.body === "string" ? res.body : "";

/**
 * Complete an authorization-code + PKCE login from the OP's
 * callback: check `state` (CSRF), read `code`, exchange it at
 * the token endpoint through the injected {@link RpTransport}
 * with the `code_verifier`, then validate the `id_token`
 * against the OP JWKS (issuer / audience / nonce / leeway).
 * Every step folds through `Result` — **no throw, no
 * `must()`** — and maps to a precise {@link RpError}.
 */
export const completeLogin =
  (config: RpConfig, transport: RpTransport) =>
  async (
    callbackQuery: Dict<string, string>,
    stashed: LoginStart,
  ): Promise<Result<LoginResult, RpError>> => {
    if (callbackQuery["state"] !== stashed.state) {
      return err(
        stateMismatch(
          "callback state does not match the stashed value",
        ),
      );
    }
    const code = callbackQuery["code"];
    if (code === undefined || code === "") {
      return err(
        missingCode(
          "callback carried no authorization code",
        ),
      );
    }
    const tokenReq: HttpRequest = {
      method: "POST",
      path: config.tokenPath,
      query: {},
      headers: {
        "content-type":
          "application/x-www-form-urlencoded",
      },
      params: {},
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri.content,
        client_id: config.clientId.content,
        code_verifier: stashed.verifier.content,
      }).toString(),
      bytes: none(),
    };
    const tokenRes = await transport(tokenReq);
    if (isErr(tokenRes)) {
      return tokenRes;
    }
    if (tokenRes.content.status.content !== 200) {
      return err(
        tokenExchangeFailed(
          `token endpoint returned ${tokenRes.content.status.content}`,
        ),
      );
    }
    const parsed = decodeJson(
      bodyText(tokenRes.content),
    );
    if (isErr(parsed)) {
      return err(
        tokenExchangeFailed(
          "token response was not JSON",
        ),
      );
    }
    const fields = cast(
      parsed.content,
      asRawObj,
      forProp("id_token", asSoftStr),
    );
    if (isErr(fields)) {
      return err(
        invalidIdToken(
          "token response had no id_token",
        ),
      );
    }
    const idToken = fields.content.id_token;
    const compact = asCompactJws(idToken);
    if (isErr(compact)) {
      return err(
        invalidIdToken(
          "id_token is not a compact JWS",
        ),
      );
    }
    const claims = await validateJwt({
      jwks: await config.verificationJwks(),
      issuer: config.issuer,
      audience: config.audience,
      clock: new Date(config.clock() * 1000),
      leewaySeconds: config.leewaySeconds,
      nonce: some(box("Str")(stashed.nonce)),
    })(compact.content);
    if (isErr(claims)) {
      return err(
        invalidIdToken(
          `id_token validation failed: ${claims.content.content.message}`,
        ),
      );
    }
    const subject = asSubject(
      claims.content.sub.content,
    );
    if (isErr(subject)) {
      return err(
        invalidIdToken("subject claim invalid"),
      );
    }
    return ok({
      subject: subject.content,
      claims: claims.content,
      idToken,
    });
  };
