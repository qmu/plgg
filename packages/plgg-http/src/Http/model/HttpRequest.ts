import {
  Option,
  SoftStr,
  Dict,
  fromNullable,
  none,
} from "plgg";
import { Method } from "plgg-http/index";

/**
 * A plgg-native HTTP request. Built from a Web-standard `Request` only at the
 * seam; every field is a plgg type, optionality is via `Option`, and maps are
 * `Dict`s rather than raw records.
 *
 * `body` is the decoded text (empty for a binary request); `bytes` carries the
 * raw bytes as `Some` only when the body was ingested as binary (per its
 * content-type), keeping the text path untouched for existing handlers.
 */
export type HttpRequest = Readonly<{
  method: Method;
  path: SoftStr;
  query: Dict<string, SoftStr>;
  headers: Dict<string, SoftStr>;
  params: Dict<string, SoftStr>;
  body: SoftStr;
  bytes: Option<Uint8Array>;
}>;

/**
 * Returns a copy of the request with path parameters attached (set by the
 * router after a successful match).
 */
export const withParams = (
  request: HttpRequest,
  params: Dict<string, SoftStr>,
): HttpRequest => ({ ...request, params });

/**
 * Looks up an own key in a request map as an `Option`. The `Object.hasOwn`
 * guard is what makes the `Option` honest: these maps are built from untrusted
 * request keys and inherit `Object.prototype`, so a bare `map[name]` for a key
 * the client never sent (`"constructor"`, `"toString"`, `"__proto__"`) would
 * return the inherited function — a spurious `Some`. Only own keys count.
 */
const lookup = (
  map: Dict<string, SoftStr>,
  name: SoftStr,
): Option<SoftStr> =>
  Object.hasOwn(map, name)
    ? fromNullable(map[name])
    : none();

/**
 * Looks up a request header (case-insensitive) as an `Option`.
 */
export const getHeader = (
  request: HttpRequest,
  name: SoftStr,
): Option<SoftStr> =>
  lookup(request.headers, name.toLowerCase());

/**
 * Looks up a query parameter as an `Option`.
 */
export const getQuery = (
  request: HttpRequest,
  name: SoftStr,
): Option<SoftStr> => lookup(request.query, name);

/**
 * Looks up a path parameter as an `Option`.
 */
export const getParam = (
  request: HttpRequest,
  name: SoftStr,
): Option<SoftStr> =>
  lookup(request.params, name);

/**
 * The raw request bytes, present only when the body was ingested as binary.
 */
export const getBytes = (
  request: HttpRequest,
): Option<Uint8Array> => request.bytes;
