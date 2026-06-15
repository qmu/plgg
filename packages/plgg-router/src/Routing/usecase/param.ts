import {
  Option,
  SoftStr,
  Dict,
  fromNullable,
  none,
} from "plgg";
import { Location } from "plgg-router/Routing/model/Location";

/**
 * Looks up an own key as an `Option`. The `Object.hasOwn` guard keeps the
 * `Option` honest: these maps are built from untrusted, percent-decoded request
 * keys and inherit `Object.prototype`, so a bare `map[name]` for a key the
 * client never sent (`"constructor"`, `"__proto__"`) would return the inherited
 * function — a spurious `Some`. Only own keys count.
 */
const lookup = (
  map: Dict<string, SoftStr>,
  name: SoftStr,
): Option<SoftStr> =>
  Object.hasOwn(map, name)
    ? fromNullable(map[name])
    : none();

/**
 * Looks up a path parameter as an `Option`. Data-last: `pipe(loc, param("id"))`.
 * Vocabulary parity with plgg-server's `Context` `param`.
 */
export const param =
  (name: SoftStr) =>
  (loc: Location): Option<SoftStr> =>
    lookup(loc.params, name);

/**
 * Looks up a query parameter as an `Option`. Data-last: `pipe(loc, query("q"))`.
 * Vocabulary parity with plgg-server's `Context` `query`.
 */
export const query =
  (name: SoftStr) =>
  (loc: Location): Option<SoftStr> =>
    lookup(loc.query, name);
