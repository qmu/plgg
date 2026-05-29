import { Dict, SoftStr } from "plgg";

/**
 * A resolved client-side location: the pathname plus the path parameters
 * captured while matching and the parsed query string. Pure, immutable data —
 * the input every route {@link Handler} folds into a `VNode`. This is the
 * client parallel of the request `Context` plgg-server threads through HTTP
 * handlers, narrowed to what a browser URL carries.
 */
export type Location = Readonly<{
  path: SoftStr;
  params: Dict<string, SoftStr>;
  query: Dict<string, SoftStr>;
}>;

/**
 * Seeds a {@link Location}. `params`/`query` default to empty so callers that
 * only know the path (e.g. {@link currentLocation} before a route matches) can
 * omit them; `resolve` folds the matched params in afterwards.
 */
export const makeLocation = (
  path: SoftStr,
  params: Dict<string, SoftStr> = {},
  query: Dict<string, SoftStr> = {},
): Location => ({ path, params, query });
