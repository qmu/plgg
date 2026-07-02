import {
  resolve,
  isAbsolute,
} from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { type Server } from "node:http";
import { type Fetch } from "plgg-bundle/Dev/model/Fetch";
import { type ModuleGraph } from "plgg-bundle/Dev/model/ModuleGraph";
import {
  RELOAD_PATH,
  SSE_PRELUDE,
  RELOAD_FRAME,
} from "plgg-bundle/Dev/model/Protocol";
import { isAllowedHost } from "plgg-bundle/Dev/usecase/allowedHost";
import { shouldReload } from "plgg-bundle/Dev/usecase/reloadDecision";
import { decorateDevHtml } from "plgg-bundle/Dev/usecase/decorateDevHtml";
import { type BundleConfig } from "plgg-bundle/domain/model/BundleConfig";
import {
  serveFetch,
  type ServeOptions,
} from "plgg-bundle/Dev/node/httpAdapter";
import { watchRoots } from "plgg-bundle/Dev/node/watch";
import {
  scanGraph,
  type Alias,
} from "plgg-bundle/Dev/node/scanGraph";

// The dev-server orchestrator: the ONE place the pure
// reload logic, the module-runner re-import, the node:http
// serve, the fs watcher, and the SSE registry meet. This
// is the effectful edge (in `Dev/node/`, excluded from the
// coverage threshold) — its behavior is proven end-to-end
// by the fixture PoC spec, which drives a real code edit
// through it and observes the hot-reloaded output.

/**
 * A running dev server's mutable state: the live app
 * {@link Fetch} a reload swaps, the current module
 * version (the `?v=` a re-import busts the cache with),
 * the scanned {@link ModuleGraph}, and the open SSE
 * streams a reload notifies.
 */
type DevState = {
  appFetch: Fetch;
  version: number;
  graph: ModuleGraph;
  readonly clients: Set<
    ReadableStreamDefaultController<Uint8Array>
  >;
};

/** UTF-8 encode at call time (never at module top level). */
const encodeUtf8 = (text: string): Uint8Array =>
  new TextEncoder().encode(text);

/** Whether a value is a non-null object. */
const isRecord = (
  v: unknown,
): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/**
 * The dev-entry factory to invoke: the module's `default`
 * export, or the module itself when it has none. Stays
 * `unknown` — {@link callFactory} does the callable check.
 */
const defaultExport = (mod: unknown): unknown =>
  isRecord(mod) && "default" in mod
    ? mod["default"]
    : mod;

/**
 * Invoke a dev-entry factory and normalise its result to a
 * {@link Fetch}. The imported value is `unknown`, so the
 * boundary is validated at runtime (`typeof`/`instanceof`)
 * and wrapped into a correctly-typed `Fetch` — no `as`, no
 * `any` annotation. Calling a value narrowed only to
 * `Function` yields `any`; feeding it through the
 * `unknown`-typed {@link normalizeFetch} re-establishes
 * the type at the seam.
 */
const callFactory = (
  factory: unknown,
): Promise<Fetch> => {
  if (typeof factory !== "function") {
    throw new Error(
      "dev entry must default-export a () => Fetch factory",
    );
  }
  return Promise.resolve(factory()).then(
    normalizeFetch,
  );
};

/**
 * Validate that a factory's result is a callable and wrap
 * it as a {@link Fetch} that checks each answer is a
 * `Response`.
 */
const normalizeFetch = (
  value: unknown,
): Fetch => {
  if (typeof value !== "function") {
    throw new Error(
      "dev entry factory must return a Fetch (a function)",
    );
  }
  return (request) =>
    Promise.resolve(value(request)).then(
      asResponse,
    );
};

/** Assert a Fetch answer is a Web `Response`. */
const asResponse = (
  value: unknown,
): Response => {
  if (value instanceof Response) {
    return value;
  }
  throw new Error(
    "dev entry Fetch must resolve to a Response",
  );
};

/** An Error's message, or a stringified non-Error. */
const msg = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

/** dev-server console output — a deliberate side effect. */
const log = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

/**
 * Cache-busting re-import of the dev entry at `version`,
 * then run its factory to get a fresh {@link Fetch}. The
 * loader hook propagates `?v=<version>` down the local
 * import graph, so the whole affected subgraph
 * re-evaluates — real code hot-reload.
 */
const load = async (
  entryUrl: string,
  version: number,
): Promise<Fetch> => {
  const mod: unknown = await import(
    `${entryUrl}?v=${version}`
  );
  return callFactory(defaultExport(mod));
};

/** The 403 a disallowed Host gets. */
const forbidden = (): Response =>
  new Response("Forbidden", {
    status: 403,
    headers: {
      "content-type":
        "text/plain; charset=utf-8",
    },
  });

/**
 * The DEV-ONLY SSE endpoint: an open `text/event-stream`
 * whose controller joins the client registry and is
 * removed on disconnect; a reload enqueues a frame onto it.
 */
const sseResponse = (
  clients: DevState["clients"],
): Response => {
  // Bridge seam: capture the controller so `start` can
  // register it and `cancel` can remove the same one.
  let registered:
    | ReadableStreamDefaultController<Uint8Array>
    | undefined;
  return new Response(
    new ReadableStream<Uint8Array>({
      start: (controller): void => {
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

/** Push a reload frame to every open live-reload stream. */
const notifyReload = (
  clients: DevState["clients"],
): void =>
  clients.forEach((controller) =>
    controller.enqueue(
      encodeUtf8(RELOAD_FRAME),
    ),
  );

/** Whether a response carries an HTML body. */
const isHtml = (response: Response): boolean => {
  const ct = response.headers.get(
    "content-type",
  );
  return ct !== null && ct.includes("text/html");
};

/**
 * Dev HTML headers: drop `content-length` (the appended
 * script grew the body) and force `no-store` so a tunnel/
 * CDN never serves stale inlined styles after an edit.
 */
const devHtmlHeaders = (
  headers: Headers,
): Headers => {
  const next = new Headers(
    [...headers].filter(([key]) => {
      const lower = key.toLowerCase();
      return (
        lower !== "content-length" &&
        lower !== "cache-control"
      );
    }),
  );
  next.set("cache-control", "no-store");
  return next;
};

/** Append the live-reload script to an HTML response. */
const decorateHtmlResponse = (
  response: Response,
): Promise<Response> =>
  isHtml(response)
    ? response
        .text()
        .then(
          (html) =>
            new Response(
              decorateDevHtml(html),
              {
                status: response.status,
                headers: devHtmlHeaders(
                  response.headers,
                ),
              },
            ),
        )
    : Promise.resolve(response);

/**
 * The wrapping dev handler: 403 a disallowed Host, answer
 * the SSE route, otherwise run the live app Fetch and
 * append the live-reload script to its HTML.
 */
const devHandler =
  (
    state: DevState,
    allowedHosts: ReadonlyArray<string>,
  ): Fetch =>
  (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (!isAllowedHost(allowedHosts)(url.host)) {
      return Promise.resolve(forbidden());
    }
    if (url.pathname === RELOAD_PATH) {
      return Promise.resolve(
        sseResponse(state.clients),
      );
    }
    return state
      .appFetch(request)
      .then(decorateHtmlResponse);
  };

/** Resolve a config value that may be absolute or root-relative. */
const under = (
  root: string,
  path: string,
): string =>
  isAbsolute(path)
    ? path
    : resolve(root, path);

/**
 * Map an fs.watch filename (relative to some watched root)
 * to an absolute path by probing each root, or null when
 * it matches none (a deletion) — the reload decision then
 * reloads conservatively.
 */
const toChanged = (
  roots: ReadonlyArray<string>,
  filename: string,
): string | null => {
  for (const root of roots) {
    const abs = resolve(root, filename);
    if (existsSync(abs)) {
      return abs;
    }
  }
  return null;
};

/**
 * A single hot-reload cycle: refresh the graph, decide
 * whether the change is relevant, then bump the version,
 * re-import the entry (re-evaluating the changed
 * subgraph), swap the live Fetch, and notify browsers. A
 * failed re-import keeps the last good Fetch so a
 * mid-edit save never crashes the loop.
 */
const reload = async (
  state: DevState,
  entryUrl: string,
  watchAbs: ReadonlyArray<string>,
  alias: Alias,
  filename: string,
): Promise<void> => {
  state.graph = scanGraph(watchAbs, alias);
  const changed = toChanged(watchAbs, filename);
  if (
    changed !== null &&
    !shouldReload(state.graph, changed)
  ) {
    return;
  }
  state.version += 1;
  try {
    state.appFetch = await load(
      entryUrl,
      state.version,
    );
  } catch (e) {
    log(
      `plgg-bundle dev: reload failed (${msg(e)}) — keeping last good build`,
    );
    return;
  }
  notifyReload(state.clients);
  log(
    `plgg-bundle dev: hot-reloaded (${filename})`,
  );
};

/** The URL the dev server is reachable at. */
const devUrl = (port: number): string =>
  `http://localhost:${port}/`;

/**
 * A running dev server: the URL it is reachable at and a
 * `close` that stops the listener + watchers. The CLI
 * ignores `close` (the server runs for the process
 * lifetime); a test uses it to shut the server down so the
 * process can exit.
 */
export type DevServer = Readonly<{
  url: string;
  close: () => void;
}>;

/** The port a listening server actually bound (honours port 0). */
const boundPort = (
  server: Server,
  fallback: number,
): number => {
  const addr = server.address();
  return typeof addr === "object" &&
    addr !== null &&
    typeof addr.port === "number"
    ? addr.port
    : fallback;
};

/**
 * Start the dev server for a config's `dev` section: load
 * the app Fetch, serve it over node:http, watch the source
 * roots, and hot-reload on every relevant code/content
 * edit. Resolves once the listener is up, with the
 * reachable URL and a `close` handle.
 */
export const runDevServer = async (
  config: BundleConfig,
): Promise<DevServer> => {
  const dev = config.dev;
  if (dev === undefined) {
    throw new Error(
      "plgg-bundle dev: config has no `dev` section",
    );
  }
  const entryUrl = pathToFileURL(
    under(config.root, dev.entry),
  ).href;
  const watchAbs = dev.watch.map((w) =>
    under(config.root, w),
  );
  const alias: Alias = {
    prefix: config.alias.prefix,
    root: config.root,
    srcRoot: config.alias.srcRoot,
  };
  const state: DevState = {
    version: 1,
    appFetch: await load(entryUrl, 1),
    graph: scanGraph(watchAbs, alias),
    clients: new Set(),
  };
  const handler = devHandler(
    state,
    dev.allowedHosts,
  );
  const options: ServeOptions = {
    port: dev.port,
  };
  const server = await new Promise<Server>(
    (ready) => {
      const s = serveFetch(
        options,
        () => handler,
        () => ready(s),
      )();
    },
  );
  const url = devUrl(
    boundPort(server, dev.port),
  );
  log(`plgg-bundle dev on ${url}`);
  const watchers = watchRoots(
    watchAbs,
    (filename) => {
      void reload(
        state,
        entryUrl,
        watchAbs,
        alias,
        filename,
      );
    },
  );
  return {
    url,
    close: () => {
      server.closeAllConnections();
      server.close();
      watchers.forEach((w) => w.close());
    },
  };
};
