import {
  Option,
  SoftStr,
  Dict,
  fromNullable,
} from "plgg";
import { Method } from "plgg-web/index";

/**
 * A plgg-native HTTP request. Built from a Web-standard `Request` only at the
 * seam; every field is a plgg type, optionality is via `Option`, and maps are
 * `Dict`s rather than raw records.
 */
export type HttpRequest = Readonly<{
  method: Method;
  path: SoftStr;
  query: Dict<string, SoftStr>;
  headers: Dict<string, SoftStr>;
  params: Dict<string, SoftStr>;
  body: SoftStr;
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
 * Looks up a request header (case-insensitive) as an `Option`.
 */
export const getHeader = (
  request: HttpRequest,
  name: SoftStr,
): Option<SoftStr> =>
  fromNullable(request.headers[name.toLowerCase()]);

/**
 * Looks up a query parameter as an `Option`.
 */
export const getQuery = (
  request: HttpRequest,
  name: SoftStr,
): Option<SoftStr> =>
  fromNullable(request.query[name]);

/**
 * Looks up a path parameter as an `Option`.
 */
export const getParam = (
  request: HttpRequest,
  name: SoftStr,
): Option<SoftStr> =>
  fromNullable(request.params[name]);
