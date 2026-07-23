import { type Option } from "plgg";
import {
  type Context,
} from "plgg-server/Http/model/Context";
import {
  type Middleware,
} from "plgg-server/Http/model/Handler";
import { guardBy } from "plgg-server/Routing/usecase/requireRole";

/**
 * Require the request's principal to carry an allowed OAuth
 * scope set — the token-authenticated counterpart of
 * {@link requireRole}, for ticket 16/27's `/api` and MCP
 * routes. Same shape: `resolve` reads the granted scopes
 * from the request (a bearer token), `allowed` decides
 * whether they suffice; `None` → 401, disallowed → 403. The
 * scopes are stashed under `"principalScopes"`. Auth-agnostic
 * — the resolver is injected, so plgg-server gains no OAuth
 * dependency.
 */
export const requireScope = <S>(
  resolve: (c: Context) => Promise<Option<S>>,
  allowed: (scopes: S) => boolean,
): Middleware =>
  guardBy("principalScopes", resolve, allowed);
