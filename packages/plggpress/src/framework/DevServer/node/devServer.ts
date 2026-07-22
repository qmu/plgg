import {
  watch,
  statSync,
  type FSWatcher,
} from "node:fs";
import { type Server } from "node:http";
import { type AddressInfo } from "node:net";
import {
  type SoftStr,
  type Defect,
  type Result,
  type PromisedResult,
  ok,
  proc,
  pipe,
  fromNullable,
  matchOption,
} from "plgg";
import {
  type Fetch,
  type ConfigLoadError,
  toFetch,
  post,
} from "plggpress/framework";
import {
  type SsgError,
  discoverPaths,
} from "plggpress/framework/ssg";
import {
  type ServeOptions,
  serve,
} from "plgg-server/node";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { loadConfig } from "plggpress/Config/usecase/loadConfig";
import {
  type ReloadHub,
  makeReloadHub,
} from "plggpress/framework/DevServer/usecase/reloadHub";
import { devWeb } from "plggpress/framework/DevServer/usecase/devWeb";
import { PATCH_PATH } from "plggpress/framework/DevServer/model/PatchProtocol";
import { patchWeb } from "plggpress/framework/DevServer/node/patchWeb";

// The DEV-ONLY node edge: the persistent, plggpress-owned
// server surface for `plggpress dev`. It is the effectful
// counterpart to the pure `devWeb`/`reloadHub` — it opens a
// socket, watches source paths, and pushes reloads over the
// hub. There is no logic here to unit-test in isolation; the
// surface is proven by the start → connect → edit → reload
// integration spec beside this file. Kept OFF the production
// `build` path entirely, so the reload client never ships.

/** What `plggpress dev`'s persistent surface needs to run. */
export type DevServerOptions = Readonly<{
  /** The content root the router reads pages from. */
  contentDir: SoftStr;
  /** The `site.config` path, loaded once at startup. */
  configPath: SoftStr;
  /** The deploy base the render path is base-aware against. */
  base: SoftStr;
  /** Source paths whose changes push a reload frame. */
  watch: ReadonlyArray<SoftStr>;
  /** The port to bind (`0` for an ephemeral test port). */
  port: number;
}>;

/** A running dev surface: its address, plus deterministic teardown. */
export type DevServerHandle = Readonly<{
  /** The origin the server is listening on. */
  url: SoftStr;
  /** The bound port (resolved even when `0` was requested). */
  port: number;
  /** Push a reload to every connected client (edit bridge seam). */
  reload: () => void;
  /** Close watchers, end every channel, and stop the server. */
  close: () => Promise<void>;
}>;

// The bound TCP port of a listening server. `address()` is a
// union only because a Unix-socket server returns a string;
// an IP-bound dev server always yields the numeric port.
const portOf = (server: Server): number =>
  pipe(
    fromNullable(server.address()),
    matchOption<string | AddressInfo, number>(
      () => 0,
      (addr: string | AddressInfo): number =>
        typeof addr === "object" ? addr.port : 0,
    ),
  );

// Watch one source path, notifying the hub on any change.
// Recursive for a directory (the content tree); a plain watch
// for a file (the config). A path that does not exist is
// simply not watched — never a throw.
const watchPath = (
  path: SoftStr,
  hub: ReloadHub,
): ReadonlyArray<FSWatcher> => {
  try {
    const recursive =
      statSync(path).isDirectory();
    return [
      watch(path, { recursive }, () =>
        hub.notify(),
      ),
    ];
  } catch {
    return [];
  }
};

const startWatchers = (
  paths: ReadonlyArray<SoftStr>,
  hub: ReloadHub,
): ReadonlyArray<FSWatcher> =>
  paths.flatMap(
    (p: SoftStr): ReadonlyArray<FSWatcher> =>
      watchPath(p, hub),
  );

// The dev server disables the request/socket timeouts the
// production adapter enforces: an SSE reload channel is
// intentionally long-lived, so a 30s request cap would drop
// it. Dev-only; the served `build`/`serve` surfaces keep
// their hardening.
const DEV_SERVE_OPTIONS = (
  port: number,
): ServeOptions => ({
  port,
  requestTimeoutMs: 0,
  socketTimeoutMs: 0,
});

// Bind the server, start the watchers, and resolve a handle.
const listen = (
  opts: DevServerOptions,
  handler: Fetch,
  hub: ReloadHub,
): Promise<Result<DevServerHandle, Defect>> =>
  new Promise((resolve) => {
    const server: Server = serve(
      DEV_SERVE_OPTIONS(opts.port),
      () => {
        const watchers = startWatchers(
          opts.watch,
          hub,
        );
        const port = portOf(server);
        resolve(
          ok({
            url: `http://localhost:${port}`,
            port,
            reload: (): void => hub.notify(),
            close: (): Promise<void> =>
              new Promise((done) => {
                for (const w of watchers) {
                  w.close();
                }
                hub.close();
                server.closeAllConnections();
                server.close(() => done());
              }),
          }),
        );
      },
    )(handler);
  });

/**
 * Start `plggpress dev`'s persistent surface: load the config
 * once, discover the routes, and serve the render path
 * wrapped with the plggpress-owned live-reload channel. On
 * success the returned handle carries the bound origin and a
 * `close` that tears everything down deterministically.
 *
 * The channel SURVIVES a rebuild because this process holds
 * the {@link ReloadHub} for its whole lifetime: a content
 * edit fires a watcher, which pushes a reload frame down every
 * open stream without dropping it — the browser re-fetches and
 * the shared render path reads the edited file fresh.
 * Config/discovery failures stay on the typed `Result`
 * channel (never a throw), so a bad config fails startup
 * loudly rather than crashing the socket.
 */
export const startDevServer = (
  opts: DevServerOptions,
): PromisedResult<
  DevServerHandle,
  ConfigLoadError | SsgError | Defect
> =>
  proc(
    loadConfig(opts.configPath),
    (config: SiteConfig) =>
      proc(
        discoverPaths(opts.contentDir),
        (
          paths: ReadonlyArray<SoftStr>,
        ): Promise<
          Result<DevServerHandle, Defect>
        > => {
          const hub = makeReloadHub();
          // The reload surface (devWeb) plus the live-edit
          // bridge: a POST to PATCH_PATH writes the source and
          // pushes a reload down the same hub.
          const handler = toFetch(
            pipe(
              devWeb(
                opts.contentDir,
                config,
                opts.base,
                paths,
                hub,
              ),
              post(
                PATCH_PATH,
                patchWeb(opts.contentDir, hub),
              ),
            ),
          );
          return listen(opts, handler, hub);
        },
      ),
  );
