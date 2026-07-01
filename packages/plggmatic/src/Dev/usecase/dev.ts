import { watch } from "node:fs";
import {
  type SoftStr,
  type PromisedResult,
  pipe,
  fromNullable,
  matchOption,
  matchResult,
  mapResult,
} from "plgg";
import {
  type Web,
  type Fetch,
  toFetch,
} from "plgg-server";
import {
  type SsgError,
  discoverPaths,
} from "plgg-server/ssg";
import { serve } from "plgg-server/node";
import {
  type AppOptions,
  type DevServer,
} from "plggmatic/App/model/AppOptions";

/**
 * The framework-generic dev server: host the app's router
 * (the SAME factory `build` renders through) over
 * plgg-server's node:http {@link serve} adapter, with an
 * explicit Host allowlist, an fs.watch → debounced rebuild
 * loop, and a DEV-ONLY SSE live-reload channel. The app
 * supplies only the router factory via {@link DevSpec}; the
 * framework owns the dev loop.
 */

/** The app-supplied piece the dev loop needs. */
export type DevSpec = Readonly<{
  router: (
    paths: ReadonlyArray<SoftStr>,
  ) => Web;
}>;

/** The dev-only live-reload SSE route. */
const RELOAD_PATH = "/__plggmatic_reload";

/** node:http default dev port. */
const DEFAULT_PORT = 5181;

/** fs.watch debounce window in ms. */
const DEBOUNCE_MS = 100;

/**
 * Hosts the dev server always accepts on top of the
 * config-supplied {@link AppOptions.allowedHosts}.
 */
const DEFAULT_HOSTS: ReadonlyArray<SoftStr> = [
  "localhost",
  "127.0.0.1",
];

/**
 * The dev-only live-reload client: a constant `<script>`
 * opening an `EventSource` to {@link RELOAD_PATH} that
 * reloads the page on every pushed message. This literal
 * lives here ALONE and is string-appended onto the
 * rendered HTML only inside {@link decorateDevHtml} — it
 * never enters the shared build() render path, so the
 * production emit is structurally script-free. This is
 * live-reload, NOT HMR.
 */
const LIVE_RELOAD_SCRIPT =
  "<script>new EventSource('" +
  RELOAD_PATH +
  "').onmessage = () => " +
  "location.reload();</script>";

/**
 * UTF-8 encode at call time. `TextEncoder` is constructed
 * inside the function (never at module top level) so the
 * bundler's export-surface eval — which has no platform
 * globals — never touches it.
 */
const encodeUtf8 = (text: SoftStr): Uint8Array =>
  new TextEncoder().encode(text);

/** SSE stream opener — keeps the connection from idling. */
const SSE_PRELUDE = ": connected\n\n";

/** A default-event SSE frame the client `onmessage` sees. */
const RELOAD_MESSAGE = "data: reload\n\n";

/**
 * The set of open live-reload streams. Each connected
 * `EventSource` owns one stream controller; a rebuild
 * enqueues a reload frame to every open stream. An
 * imperative subscriber registry is the irreducible seam
 * of a push channel.
 */
export type Clients = Set<
  ReadableStreamDefaultController<Uint8Array>
>;

/**
 * A running dev server's testable core, decoupled from the
 * node:http/fs.watch seam: the live request handler, a
 * `rebuild` thunk the watcher drives, and the open-stream
 * registry the rebuild notifies.
 */
export type DevHandle = Readonly<{
  fetch: Fetch;
  rebuild: () => Promise<void>;
  clients: Clients;
}>;

/**
 * The one mutable cell: the live router Fetch a rebuild
 * swaps in place, plus the stream registry. Held behind
 * {@link DevHandle} so the watch loop can hot-swap routes
 * without rebinding the server.
 */
type DevState = {
  fetch: Fetch;
  readonly clients: Clients;
};

/**
 * The header set for a decorated dev HTML page: drops
 * `content-length` (the appended live-reload script grew
 * the body, so it must re-compute) and forces
 * `cache-control: no-store`. The dev server sits behind a
 * CDN/tunnel; each page inlines the theme CSS, so a cached
 * page would keep serving STALE styles after a theme edit
 * — no-store keeps every edit visible on a plain refresh,
 * no purge needed.
 */
const devHtmlHeaders = (
  headers: Headers,
): Headers => {
  const next = new Headers(
    [...headers].filter(
      ([key]: [string, string]): boolean => {
        const lower = key.toLowerCase();
        return (
          lower !== "content-length" &&
          lower !== "cache-control"
        );
      },
    ),
  );
  next.set("cache-control", "no-store");
  return next;
};

/**
 * Whether a response carries an HTML body — the only
 * responses the dev decoration touches.
 */
const isHtml = (response: Response): boolean =>
  pipe(
    fromNullable(
      response.headers.get("content-type"),
    ),
    matchOption(
      (): boolean => false,
      (ct: SoftStr): boolean =>
        ct.includes("text/html"),
    ),
  );

/**
 * The DEV-ONLY HTML decoration: string-append the
 * {@link LIVE_RELOAD_SCRIPT} just before `</body>` (or at
 * the end if the document has none). Pure string surgery
 * on the renderToString OUTPUT — never inside the typed
 * `Html` tree (renderToString would escape the script),
 * and never in build()'s render path.
 */
export const decorateDevHtml = (
  html: SoftStr,
): SoftStr =>
  html.includes("</body>")
    ? html.replace(
        "</body>",
        `${LIVE_RELOAD_SCRIPT}</body>`,
      )
    : html + LIVE_RELOAD_SCRIPT;

/**
 * Wraps the router's native `Response`: HTML answers get
 * the live-reload script appended (with `content-length`
 * dropped so it re-computes); everything else passes
 * through untouched.
 */
const decorateHtmlResponse = (
  response: Response,
): Promise<Response> =>
  isHtml(response)
    ? response.text().then(
        (html: SoftStr): Response =>
          new Response(decorateDevHtml(html), {
            status: response.status,
            headers: devHtmlHeaders(
              response.headers,
            ),
          }),
      )
    : Promise.resolve(response);

/**
 * The bare Host name (port stripped) of a `Host`-style
 * value, lifted through `Option` rather than `?? `.
 */
const hostName = (host: SoftStr): SoftStr =>
  pipe(
    fromNullable(host.split(":")[0]),
    matchOption(
      (): SoftStr => host,
      (name: SoftStr): SoftStr => name,
    ),
  );

/**
 * The Host allowlist: localhost/127.0.0.1 plus the
 * config-supplied {@link AppOptions.allowedHosts}.
 * Preserves the tunnel-safety an `allowedHosts` gate gives.
 */
export const isAllowedHost =
  (allowedHosts: ReadonlyArray<SoftStr>) =>
  (host: SoftStr): boolean =>
    [...DEFAULT_HOSTS, ...allowedHosts].includes(
      hostName(host),
    );

/** The 403 a disallowed Host gets. */
const forbiddenResponse = (): Response =>
  new Response("Forbidden", {
    status: 403,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });

/**
 * The DEV-ONLY SSE endpoint: an open `text/event-stream`
 * whose controller joins the {@link Clients} registry and
 * is removed on disconnect. A rebuild enqueues a reload
 * frame onto it.
 */
const sseResponse = (
  clients: Clients,
): Response => {
  // Bridge seam: the controller is delivered to `start`
  // but must be removed on `cancel`, so it is captured
  // here to link the two stream callbacks.
  let registered:
    | ReadableStreamDefaultController<Uint8Array>
    | undefined;
  return new Response(
    new ReadableStream<Uint8Array>({
      start: (
        controller: ReadableStreamDefaultController<Uint8Array>,
      ): void => {
        registered = controller;
        clients.add(controller);
        controller.enqueue(
          encodeUtf8(SSE_PRELUDE),
        );
      },
      cancel: (): void => {
        if (registered !== undefined) {
          clients.delete(registered);
        }
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    },
  );
};

/** Pushes a reload frame to every open live-reload stream. */
const notifyReload = (clients: Clients): void =>
  clients.forEach(
    (
      controller: ReadableStreamDefaultController<Uint8Array>,
    ): void =>
      controller.enqueue(
        encodeUtf8(RELOAD_MESSAGE),
      ),
  );

/**
 * Builds the live router Fetch for a discovered route set
 * — the SAME app `router` factory build() uses.
 */
const buildFetch = (
  spec: DevSpec,
  paths: ReadonlyArray<SoftStr>,
): Fetch => toFetch(spec.router(paths));

/**
 * The wrapping dev handler: 403 a disallowed Host, answer
 * the SSE route, otherwise run the live router and append
 * the live-reload script to its HTML.
 */
const devHandler =
  (
    state: DevState,
    allowedHosts: ReadonlyArray<SoftStr>,
  ): Fetch =>
  (request: Request): Promise<Response> =>
    pipe(new URL(request.url), (url: URL) =>
      !isAllowedHost(allowedHosts)(url.host)
        ? Promise.resolve(forbiddenResponse())
        : url.pathname === RELOAD_PATH
          ? Promise.resolve(
              sseResponse(state.clients),
            )
          : state
              .fetch(request)
              .then(decorateHtmlResponse),
    );

/**
 * Re-discover the route set, swap the live router, and
 * ping every open stream. A transient discovery miss
 * (a save mid-edit) keeps the last good router rather than
 * crashing the dev loop.
 */
const rebuild = (
  opts: AppOptions,
  spec: DevSpec,
  state: DevState,
): Promise<void> =>
  discoverPaths(opts.contentDir).then(
    matchResult(
      (_e: SsgError): void => undefined,
      (paths: ReadonlyArray<SoftStr>): void => {
        // The mutable seam: hot-swap routes, then ping
        // every open EventSource to reload.
        state.fetch = buildFetch(spec, paths);
        notifyReload(state.clients);
      },
    ),
  );

/**
 * Build the dev server's testable core: discover the
 * routes, seed the live state, and return the handler +
 * rebuild thunk + stream registry. No port, no watcher —
 * those are bound by {@link dev}.
 */
export const createDevHandle = (
  opts: AppOptions,
  spec: DevSpec,
): PromisedResult<DevHandle, SsgError> =>
  discoverPaths(opts.contentDir).then(
    mapResult(
      (
        paths: ReadonlyArray<SoftStr>,
      ): DevHandle => {
        const state: DevState = {
          fetch: buildFetch(spec, paths),
          clients: new Set(),
        };
        return {
          fetch: devHandler(
            state,
            opts.allowedHosts,
          ),
          rebuild: (): Promise<void> =>
            rebuild(opts, spec, state),
          clients: state.clients,
        };
      },
    ),
  );

/**
 * The configured dev port: `PORT` env override, else
 * {@link DEFAULT_PORT}. A non-integer/negative `PORT`
 * falls back rather than binding garbage.
 */
export const devPort = (): number =>
  pipe(
    fromNullable(process.env.PORT),
    matchOption(
      (): number => DEFAULT_PORT,
      (raw: SoftStr): number =>
        pipe(Number(raw), (n: number): number =>
          Number.isInteger(n) && n >= 0
            ? n
            : DEFAULT_PORT,
        ),
    ),
  );

/** The URL the dev server is reachable at. */
export const devUrl = (port: number): SoftStr =>
  `http://localhost:${port}/`;

/**
 * Debounced fs.watch over the content tree: one save can
 * emit several events, so an imperative timer coalesces
 * them onto a single rebuild. Returns the watcher so the
 * caller owns its lifecycle.
 */
export const watchContent = (
  contentDir: SoftStr,
  onChange: () => Promise<void>,
): ReturnType<typeof watch> => {
  // fs.watch debounce seam: an imperative timer handle is
  // the irreducible state here.
  let pending:
    | ReturnType<typeof setTimeout>
    | undefined;
  return watch(
    contentDir,
    { recursive: true },
    (): void => {
      clearTimeout(pending);
      pending = setTimeout((): void => {
        void onChange();
      }, DEBOUNCE_MS);
    },
  );
};

/** dev-server console output — a deliberate side effect. */
const log = (message: SoftStr): void => {
  process.stdout.write(`${message}\n`);
};

/**
 * Serve the site in dev mode: host the live app router
 * over node:http {@link serve} (the ONE platform seam),
 * watch the content tree for changes, and push live-reload
 * over SSE on every debounced rebuild. Returns the
 * reachable URL; the underlying server + watcher run for
 * the process lifetime.
 */
export const dev = (
  opts: AppOptions,
  spec: DevSpec,
): PromisedResult<DevServer, SsgError> =>
  createDevHandle(opts, spec).then(
    mapResult(
      (handle: DevHandle): DevServer =>
        pipe(devPort(), (port: number) => {
          serve({ port }, (): void =>
            log(
              `plggmatic dev on ${devUrl(port)}`,
            ),
          )(handle.fetch);
          watchContent(
            opts.contentDir,
            handle.rebuild,
          );
          return { url: devUrl(port) };
        }),
    ),
  );
