import { SoftStr, Dict } from "plgg";
import { Html } from "plgg-view";
import {
  HttpResponse,
  HttpStatus,
  statusOf,
  htmlResponse,
  textResponse,
  renderToString,
  htmlDocument,
  HtmlDocumentOptions,
} from "plgg-server/index";

/**
 * Renders an {@link Html} tree to HTML and returns it as a `text/html` response
 * — the SSR seam from the view layer to the HTTP layer. For a bare fragment of
 * markup.
 */
export const viewResponse = <Msg>(
  node: Html<Msg>,
  status: HttpStatus = statusOf(200),
  headers: Dict<string, SoftStr> = {},
): HttpResponse =>
  htmlResponse(renderToString(node), status, headers);

/**
 * Renders a full HTML document (see {@link htmlDocument}) and returns it as a
 * `text/html` response — the usual SSR entry for a page.
 */
export const pageResponse = <Msg>(
  opts: HtmlDocumentOptions<Msg>,
  status: HttpStatus = statusOf(200),
  headers: Dict<string, SoftStr> = {},
): HttpResponse =>
  htmlResponse(htmlDocument(opts), status, headers);

/**
 * Serves a JavaScript body (e.g. the client bundle that boots CSR) with a
 * `text/javascript` content-type. plgg-server has no static-file layer, so a route
 * reads the built bundle and hands it here.
 */
export const javascriptResponse = (
  body: SoftStr,
  status: HttpStatus = statusOf(200),
  headers: Dict<string, SoftStr> = {},
): HttpResponse =>
  textResponse(body, status, {
    ...headers,
    "content-type": "text/javascript; charset=utf-8",
  });
