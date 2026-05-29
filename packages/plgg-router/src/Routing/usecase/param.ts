import { Option, SoftStr, fromNullable } from "plgg";
import { Location } from "plgg-router/Routing/model/Location";

/**
 * Looks up a path parameter as an `Option`. Data-last: `pipe(loc, param("id"))`.
 * Vocabulary parity with plgg-server's `Context` `param`.
 */
export const param =
  (name: SoftStr) =>
  (loc: Location): Option<SoftStr> =>
    fromNullable(loc.params[name]);

/**
 * Looks up a query parameter as an `Option`. Data-last: `pipe(loc, query("q"))`.
 * Vocabulary parity with plgg-server's `Context` `query`.
 */
export const query =
  (name: SoftStr) =>
  (loc: Location): Option<SoftStr> =>
    fromNullable(loc.query[name]);
