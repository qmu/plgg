import { Result } from "plgg";
import { RsaPrivateJwk } from "plgg-auth/Jose/model/Jwk";
import { CompactJws } from "plgg-auth/Jose/model/CompactJws";
import {
  JwtClaims,
  claimsJson,
} from "plgg-auth/Jose/model/JwtClaims";
import { JoseError } from "plgg-auth/Jose/model/JoseError";
import { signJws } from "plgg-auth/Jose/usecase/signJws";

/**
 * Encodes typed claims as an RS256-signed JWT —
 * `claimsJson` fixes the wire shape (single
 * `aud` as a bare string, `None` fields
 * omitted), `signJws` fixes the envelope.
 */
export const encodeJwt =
  (key: RsaPrivateJwk) =>
  (
    claims: JwtClaims,
  ): Promise<Result<CompactJws, JoseError>> =>
    signJws(key)(claimsJson(claims));
