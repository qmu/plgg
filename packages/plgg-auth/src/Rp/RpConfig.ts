import {
  type Str,
  type SoftStr,
} from "plgg";
import {
  type ClientId,
  type RedirectUri,
} from "plgg-auth/Oidc/model/Client";
import { type Jwks } from "plgg-auth/Jose/model/Jwks";

/**
 * Everything the relying-party client needs to drive a login
 * against an OP. Endpoint paths are explicit (a discovery
 * step could fill them, but for the dogfooded same-process OP
 * they are known). `verificationJwks` is a seam — the
 * dogfooded RP resolves it from the OP's own store; a
 * networked RP fetches + caches `/jwks.json`. `clock` returns
 * unix seconds (matched to `validateJwt`'s `Time`).
 */
export type RpConfig = Readonly<{
  clientId: ClientId;
  redirectUri: RedirectUri;
  issuer: Str;
  authorizePath: SoftStr;
  tokenPath: SoftStr;
  scope: SoftStr;
  audience: Str;
  clock: () => number;
  leewaySeconds: number;
  verificationJwks: () => Promise<Jwks>;
}>;
