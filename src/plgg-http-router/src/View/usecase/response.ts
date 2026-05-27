import { SoftStr, Dict } from "plgg";
import { VNode } from "plgg-view";
import {
  HttpResponse,
  htmlResponse,
  textResponse,
  renderToString,
  htmlDocument,
  HtmlDocumentOptions,
} from "plgg-http-router/index";

/**
 * Renders a {@link VNode} to HTML and returns it as a `text/html` response — the
 * SSR seam from the view layer to the HTTP layer. For a bare fragment of markup.
 */
export const viewResponse = (
  node: VNode,
  status: number = 200,
  headers: Dict<string, SoftStr> = {},
): HttpResponse =>
  htmlResponse(renderToString(node), status, headers);

/**
 * Renders a full HTML document (see {@link htmlDocument}) and returns it as a
 * `text/html` response — the usual SSR entry for a page.
 */
export const pageResponse = (
  opts: HtmlDocumentOptions,
  status: number = 200,
  headers: Dict<string, SoftStr> = {},
): HttpResponse =>
  htmlResponse(htmlDocument(opts), status, headers);

/**
 * Serves a JavaScript body (e.g. the client bundle that boots CSR) with a
 * `text/javascript` content-type. plgg-http-router has no static-file layer, so a route
 * reads the built bundle and hands it here.
 */
export const javascriptResponse = (
  body: SoftStr,
  status: number = 200,
  headers: Dict<string, SoftStr> = {},
): HttpResponse =>
  textResponse(body, status, {
    ...headers,
    "content-type": "text/javascript; charset=utf-8",
  });
