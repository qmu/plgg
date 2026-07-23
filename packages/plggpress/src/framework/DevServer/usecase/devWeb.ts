import {
  type SoftStr,
  type Option,
  type Dict,
  type PromisedResult,
  ok,
  some,
  none,
  fromNullable,
  pipe,
  mapResult,
  matchOption,
} from "plgg";
import {
  type Web,
  type Middleware,
  type Next,
  type Handler,
  type Context,
  type HttpResponse,
  type HttpError,
  get,
  use,
  statusOf,
  streamResponse,
} from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { pressRouter } from "plggpress/router/pressRouter";
import { type ReloadHub } from "plggpress/framework/DevServer/usecase/reloadHub";
import { RELOAD_PATH } from "plggpress/framework/DevServer/model/DevChannel";
import { decorateDevHtml } from "plggpress/framework/DevServer/usecase/decorateDevHtml";

// Own-property header read (the response header dict is a
// plain object, so an inherited `content-type` must not be
// mistaken for a set one).
const headerOf = (
  headers: Dict<string, SoftStr>,
  name: SoftStr,
): Option<SoftStr> =>
  Object.prototype.hasOwnProperty.call(
    headers,
    name,
  )
    ? fromNullable(headers[name])
    : none();

// The rendered HTML text of a response, iff it IS text/html —
// a stream or a non-HTML body is left untouched.
const htmlBody = (
  res: HttpResponse,
): Option<SoftStr> => {
  const body = res.body;
  return typeof body === "string"
    ? matchOption<SoftStr, Option<SoftStr>>(
        () => none(),
        (ct: SoftStr): Option<SoftStr> =>
          ct.includes("text/html")
            ? some(body)
            : none(),
      )(headerOf(res.headers, "content-type"))
    : none();
};

/**
 * The dev-only middleware that appends the live-reload client
 * to every HTML response the render path produces. Runs
 * around the whole app: the SSE stream and any non-HTML body
 * fall through untouched (only a `text/html` string body is
 * decorated), so the reload channel and static assets are
 * never rewritten.
 */
export const injectReloadClient: Middleware = (
  c: Context,
  next: Next,
): PromisedResult<HttpResponse, HttpError> =>
  next(c).then(
    mapResult(
      (res: HttpResponse): HttpResponse =>
        matchOption<SoftStr, HttpResponse>(
          () => res,
          (body: SoftStr): HttpResponse => ({
            ...res,
            body: decorateDevHtml(body),
          }),
        )(htmlBody(res)),
    ),
  );

/**
 * The SSE reload endpoint's handler: answer a long-lived
 * `text/event-stream` whose chunks are the hub's broadcast.
 * The stream stays open across content rebuilds — the hub
 * outlives them — so a connected browser keeps its channel
 * and is only ever told to reload.
 */
export const reloadHandler =
  (hub: ReloadHub): Handler =>
  (
    _c: Context,
  ): PromisedResult<HttpResponse, HttpError> =>
    Promise.resolve(
      ok(
        streamResponse(hub.subscribe(), statusOf(200), {
          "content-type":
            "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          "x-accel-buffering": "no",
        }),
      ),
    );

/**
 * Assemble the dev-server {@link Web}: the SAME content
 * router `build` and `serve` use ({@link pressRouter}, so
 * served HTML is the render path's own output), wrapped in
 * the {@link injectReloadClient} decorator and given the
 * plggpress-owned {@link RELOAD_PATH} SSE route. Pure data —
 * the socket work lives in the node edge.
 */
export const devWeb = (
  contentDir: SoftStr,
  config: SiteConfig,
  base: SoftStr,
  paths: ReadonlyArray<SoftStr>,
  hub: ReloadHub,
): Web =>
  pipe(
    pressRouter(contentDir, config, base, paths),
    use(injectReloadClient),
    get(RELOAD_PATH, reloadHandler(hub)),
  );
