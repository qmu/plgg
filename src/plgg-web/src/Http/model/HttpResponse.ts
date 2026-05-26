import { SoftStr, Dict } from "plgg";
import {
  HttpStatus,
  statusOf,
} from "plgg-web/index";

/**
 * A plgg-native HTTP response: a branded status, a header dictionary, and a
 * string body. Conversion to a Web-standard `Response` happens only at the
 * serving seam.
 */
export type HttpResponse = Readonly<{
  status: HttpStatus;
  headers: Dict<string, SoftStr>;
  body: SoftStr;
}>;

/**
 * Adds a default `content-type` unless one is already present.
 */
const withContentType = (
  headers: Dict<string, SoftStr>,
  contentType: SoftStr,
): Dict<string, SoftStr> =>
  "content-type" in headers
    ? headers
    : { ...headers, "content-type": contentType };

/**
 * Builds a `text/plain` response.
 */
export const textResponse = (
  body: SoftStr,
  status: number = 200,
  headers: Dict<string, SoftStr> = {},
): HttpResponse => ({
  status: statusOf(status),
  headers: withContentType(
    headers,
    "text/plain; charset=utf-8",
  ),
  body,
});

/**
 * Builds a `text/html` response.
 */
export const htmlResponse = (
  body: SoftStr,
  status: number = 200,
  headers: Dict<string, SoftStr> = {},
): HttpResponse => ({
  status: statusOf(status),
  headers: withContentType(
    headers,
    "text/html; charset=utf-8",
  ),
  body,
});

/**
 * Builds an `application/json` response by serializing `data`.
 */
export const jsonResponse = (
  data: unknown,
  status: number = 200,
  headers: Dict<string, SoftStr> = {},
): HttpResponse => ({
  status: statusOf(status),
  headers: withContentType(
    headers,
    "application/json; charset=utf-8",
  ),
  body: JSON.stringify(data),
});

/**
 * Builds a redirect response with a `location` header.
 */
export const redirectResponse = (
  location: SoftStr,
  status: number = 302,
  headers: Dict<string, SoftStr> = {},
): HttpResponse => ({
  status: statusOf(status),
  headers: { ...headers, location },
  body: "",
});
